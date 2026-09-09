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

- `/enrol/oli` → redirects to the single active OLI course
- `/enrol/oli/certification-course`
- `/enrol/fixture-institute/example-certificate`

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

Add a provider by:

1. Creating sandbox Account + PIC with a unique `provider_code`
2. Setting `PROVIDER_API_KEY_{CODE}` on **sandbox** NZ API
3. Adding a tenant object to `src/lib/nz-enrolment/tenants.ts`
4. Adding one or more courses in `src/lib/nz-enrolment/courses.ts`
5. Setting the same key on the hosted app (server-only)
6. Pointing success/cancel URLs at `/enrol/{slug}/{course}`

Do not add `if (provider === '…')` in checkout components.

---

## Course configuration

NZ Salesforce currently has no OLI course catalogue object. Launch uses a
lightweight config catalogue:

- stable `course_code`
- provider slug relationship
- public slug, name, description
- price in integer cents
- active/inactive
- default upfront / frequency / instalment count

The hosted UI may preview maths. Canonical `/v1` is authoritative.

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

Edit `src/lib/nz-enrolment/courses.ts` with `providerSlug`, `courseCode`,
`slug`, `priceCents`, `status`, and `planDefaults` that divide evenly in cents.

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

- Production Account already exists: Online Learning Institute `001RE00000kov0dYAA`
- Create Production PIC `OLI_NZ`, Active, API enabled, Environment=Production
- Issue Production `PROVIDER_API_KEY_OLI_NZ` (never copy sandbox)
- Hosted production domain (new NZ Enrolment Checkout Vercel project or alias)
- Real course list and prices from OLI
- PIC branding, support, privacy/terms URLs
- success/cancel URLs on the production host
- Live GoCardless (already on NZ Production API; do not reuse sandbox)
- Salesforce identity already used by NZ Production API
- Deploy hosted app to production only after sandbox certification
- First controlled Production canary, then cancel/neutralise like Bela
- Monitoring on structured `enrolment_checkout` log events
- Rollback: disable PIC `API_Enabled__c` and remove Production key

---

## Operational support

Hosted 4xx messages are mapped. Raw Salesforce ids, stack traces, and API keys
must not appear in the browser. Server logs may include `request_id`,
`checkout_id`, and `provider_order_id`.

Pay in full is modelled (`pay_in_full.comingSoon`) and must not block launch.
