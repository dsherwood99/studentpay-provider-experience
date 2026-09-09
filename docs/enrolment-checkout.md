# Enrolment Checkout (NZ)

StudentPay-hosted enrolment UX over the same canonical NZ `/v1` provider-checkout
core used by Enrolment Integration (Bela).

OLI is the first configured tenant. OLI is not the product.

This document covers the product boundary, architecture, tenant/course
configuration, security, sandbox certification, and production enablement.
It does not authorise Production activation.

---

## Product boundary

```
SHARED NZ ENROLMENT CORE
canonical POST/GET /v1/provider-checkouts (+ /confirm)
        |
 -----------------------------
 |                           |
Enrolment Integration       Enrolment Checkout
provider-owned UX           StudentPay-hosted UX
Bela certified              OLI first tenant
```

StudentPay owns hosted UX: course selection, student details, plan
presentation, declarations, GoCardless handoff, return/success.

Canonical `/v1` remains responsible for authentication, PIC resolution,
validation, plan maths, Salesforce Opportunity/Contact/DDA, hosted BECS NZ
setup, status, PPA, confirm, idempotency, and Charge Schedules.

Do not call `/api/demos/bela-beauty/*` from Enrolment Checkout. That path is
the Bela sandbox demonstration UI only.

---

## Authoritative repos and baseline

- Canonical NZ API: private `studentpay-nz-api`, certified Enrolment Integration on sandbox and production API hosts.
- Hosted Enrolment Checkout: this Provider Experience app, generic `/enrol/{providerSlug}` engine.
- NZ API sandbox host: `sandbox-api.studentpay.co.nz`
- NZ API production host: `api.studentpay.co.nz` (do not modify in this phase)
- Existing Bela hosted prototype: `/enrol/bela-beauty/` on the NZ API host. Provider-specific demo, not the generic product.

AU `studentpay-api` is not the NZ enrolment API.

---

## Hosted URL model

```
/enrol/{providerSlug}
/enrol/{providerSlug}/{courseSlug}
```

Examples:

- `/enrol/oli` → course picker for the environment-visible OLI catalogue
- `/enrol/oli/certificate-in-psychology-counselling`
- `/enrol/oli/certification-course` (sandbox fixture only)
- `/enrol/fixture-institute/example-certificate` (sandbox only)

Do not add `/enrol/oli-hardcoded-page`.

Return from GoCardless:

- `?dda=return`
- `?dda=cancelled`

Checkout JWTs are not placed in these URLs.

---

## Tenant configuration

Source of truth:

| Data | Source |
|---|---|
| Commercial provider identity, PIC, API enabled, branding colours | Salesforce `Provider_Integration_Config__c` (canonical `/v1`) |
| Hosted slug, copy, course list, default plan, feature flags | App config in `src/lib/nz-enrolment/` |
| Provider API secret | Server env `PROVIDER_API_KEY_{PROVIDER_CODE}` (or tenant `apiKeyEnv`) |
| NZ API host | Server env `NZ_STUDENTPAY_API_BASE_URL` (never tenant-hardcoded) |
| Application environment | Server env `STUDENTPAY_ENV=sandbox` or `STUDENTPAY_ENV=production` |
| Hosted product | Server env `HOSTED_PRODUCT_MODE=nz_enrolment` |

Add a provider by:

1. Creating sandbox Account + PIC with a unique `provider_code`
2. Setting `PROVIDER_API_KEY_{CODE}` on **sandbox** NZ API
3. Adding a tenant object to `src/lib/nz-enrolment/tenants.ts` (no `apiBaseUrl`)
4. Adding courses in the generic catalogue (`courses.ts` / `catalogues/`)
5. Setting the same key on the dedicated NZ hosted app (server-only)
6. Pointing success/cancel URLs at `/enrol/{slug}/{course}`

Do not add `if (provider === '…')` in checkout components.
Do not select API environment by provider.
Do not infer sandbox vs production solely from `NODE_ENV` or Vercel Preview.

---

## Course configuration

Approved OLI Production courses come from `data/oli/2608-course-list-and-fees.csv`.
See `data/oli/README.md` and `docs/artefacts/oli-course-reconciliation.md`.

Each course stores two commercial prices:

- **Payment Plan Course Fee** — canonical `course_price` / amount financed for this launch
- **Payment in Full of Course Fees** — CSV “Upfront Payment of Course Fee”. This is **not** a payment-plan deposit. Pay-in-full processing is out of scope.

OLI payment-plan rule (generic derived-regular policy, not an OLI branch):

- frequency: Weekly
- regular instalment: $25.00
- payment-plan upfront: $0.00
- final instalment: exact residual below $25 when the financed amount is not divisible by $25
- no extra $0.00 row when it divides evenly

The hosted UI may preview maths. Canonical `/v1` remains arithmetic authority. Salesforce `ChargeScheduleOriginationService` already originates amount-conserving residual finals from Opportunity Amount + `Value_of_Each_Instalment__c`.

Sandbox fixtures (`OLI_SANDBOX_CERT_COURSE`, `fixture-institute`) remain available only when `STUDENTPAY_ENV=sandbox`.

---

## Security model

```
Browser
  → StudentPay hosted BFF  (/api/enrolment-checkout*)
  → canonical /v1
  → Salesforce / GoCardless
```

- Browser never receives `PROVIDER_API_KEY_*`
- Provider code is resolved from the URL slug on the server
- A posted slug cannot switch another tenant’s session
- Checkout token lives in an HttpOnly signed cookie (`sp_nz_enrolment_session`)
- CSRF: same-origin `Origin`/`Host` check on mutating BFF routes
- Idempotency-Key = hosted `provider_order_id`

---

## Checkout session / resume

1. Server generates `provider_order_id` and stores the session cookie.
2. Canonical create is idempotent on that order id.
3. User is redirected to `direct_debit.setup_url` (StudentPay `/api/dd-setup`).
4. Return hits `/enrol/{slug}/{course}?dda=return`.
5. BFF GET polls `/v1/provider-checkouts/{id}` until `direct_debit.setup_complete`.
6. Confirm uses the cookie token; replay is safe (`already_confirmed`).

If the cookie is lost after GoCardless, the user cannot confirm (token is not
in the URL). They can restart; create replay remains unique per new order id.

---

## Canonical `/v1` usage

Create:

```
POST /v1/provider-checkouts
Authorization: Bearer <server key>
Idempotency-Key: <provider_order_id>
```

Confirm:

```
POST /v1/provider-checkouts/{id}/confirm
```

Declarations: `payment_plan_accepted`, `information_confirmed`,
`privacy_consent_accepted`. `payment.deposit_confirmed=true` is required and
does not charge a deposit.

---

## OLI first tenant (sandbox)

| Field | Value |
|---|---|
| Slug | `oli` |
| Assigned provider code | `OLI_NZ` (new sandbox assignment; Production has no PIC/code) |
| Production Account (read-only) | Online Learning Institute `001RE00000kov0dYAA` |
| Sandbox Account / PIC | Created only in Salesforce sandbox if missing |
| Course | `OLI_SANDBOX_CERT_COURSE` / `certification-course` |
| Price fixture | NZD 1200 · 48 × $25 weekly · $0 upfront |
| Branding | Public OLI logo + teal palette fallback; no Salesforce logo URL |

Production-looking catalogue prices were not present in Salesforce. The sandbox
course is a certification fixture, not a live offering.

---

## Adding a course

For OLI Production courses, update the approved CSV and regenerate:

```
python3 scripts/generate-oli-catalogue.py
```

For a future provider, add a tenant in `tenants.ts` and courses in the generic catalogue using the same two-price + `planPolicy` schema.

Sandbox-only certification fixtures stay in `courses.ts` with `sandboxOnly: true`.

---

## Environment, host, and secrets

Dedicated NZ Enrolment Checkout (intended Production host `enrol.studentpay.co.nz`) must set:

| Env | Purpose | Fail-closed |
|---|---|---|
| `HOSTED_PRODUCT_MODE=nz_enrolment` | Enables `/enrol/*` NZ routes | Missing → NZ routes 404 on Bela/Academy/generic hosts |
| `STUDENTPAY_ENV=sandbox\|production` | Fixture vs approved catalogue | Missing on NZ host → 503 |
| `NZ_STUDENTPAY_API_BASE_URL` | Sandbox: `https://sandbox-api.studentpay.co.nz`. Production: `https://api.studentpay.co.nz` | Production + sandbox URL or missing → 503 |
| `NZ_ENROLMENT_SESSION_SECRET` | HttpOnly session HMAC | Production missing/short → 503; no dev fallback |
| `PROVIDER_API_KEY_OLI_NZ` | Server-side provider key | Create/confirm 503 |

Bela Production (`STUDENTPAY_PROVIDER_CODE=BELA`) and Academy (`ACADEMYAU`) are not NZ hosted product deployments. NZ routes must not render there.

Cookie: HttpOnly, host-only (`path=/`), SameSite=Lax, Secure when `STUDENTPAY_ENV=production` or `NODE_ENV=production`.

Instalment ceiling: generic 400 recurring schedules, matching Salesforce `ChargeScheduleOriginationService.MAX_RECURRING_SCHEDULES`. Not a 4–52 demo cap and not hardcoded to OLI’s current 207.

---

## OLI first tenant

| Field | Value |
|---|---|
| Slug | `oli` |
| Provider code | `OLI_NZ` |
| Production Account (read-only) | Online Learning Institute `001RE00000kov0dYAA` |
| Production PIC | None yet. Do not create in this phase. |
| Production catalogue | 64 CSV courses |
| Sandbox fixture | `OLI_SANDBOX_CERT_COURSE` $1,200 / 48 × $25 / $0 upfront |

CSV course codes TRA101–TRA104 are duplicated across Personal Training and Trades. Hosted slugs are unique course names. Codes were not invented.

---

## Sandbox certification

1. Open `/enrol/oli`
2. Use fictional student details
3. Choose the payment plan (preview maths)
4. Create canonical checkout (replay once)
5. Complete GoCardless sandbox BECS NZ setup
6. GET until `setup_complete`
7. Confirm, then confirm replay
8. Audit one PPA and expected Charge Schedules
9. No Production mutation

Suggested unique order id: `OLI-HOSTED-CERT-20260909-001` (confirm unused first).

---

## Production enablement checklist

Do not execute in this phase.

Remaining Production-only writes:

- Dedicated Vercel project linked to this repo (do not reuse Bela or Academy)
- Assign `enrol.studentpay.co.nz`
- `HOSTED_PRODUCT_MODE=nz_enrolment`
- `STUDENTPAY_ENV=production`
- `NZ_STUDENTPAY_API_BASE_URL=https://api.studentpay.co.nz`
- Production PIC `OLI_NZ` on Account `001RE00000kov0dYAA`
- Production `PROVIDER_API_KEY_OLI_NZ` (never copy sandbox)
- Production `NZ_ENROLMENT_SESSION_SECRET`
- PIC success/cancel URLs on the dedicated host
- Controlled Production canary, then cancel/neutralise like Bela

Rollback: disable PIC `API_Enabled__c` and remove the Production key.

---

## Operational support

Hosted 4xx messages are mapped. Raw Salesforce ids, stack traces, and API keys
must not appear in the browser. Server logs may include `request_id`,
`checkout_id`, and `provider_order_id`.

Pay in full is modelled as **Payment in Full of Course Fees** (`comingSoon`) and
must not block launch. It is not a payment-plan upfront payment. No Stripe or
other pay-in-full processor is included.

