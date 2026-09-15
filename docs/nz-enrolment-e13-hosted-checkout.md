# NZ Enrolment E13 — Hosted Checkout (fail-closed Production support)

**Date:** 15 September 2026  
**NZ_ENROLMENT_E13_HOSTED_CHECKOUT = PRODUCTIONISED** (gated; not globally exposed)  
**E13 STATUS = SANDBOX_CERTIFIED_CORE** (not MET)  
**NZ ENROLMENT SCORE = 10 / 13 MET**  
**PRODUCTION_DEPLOYMENT = NONE**  
**READY_FOR_E13_PRODUCTION_CANARY = NO**

Do not mark E13 MET. Do not Promote Production. Do not assign
`enrol.studentpay.co.nz` to this branch. Do not enable Bela Production PIF.

---

## Boundary

Payment plan remains:

Hosted Checkout → payment plan → GoCardless → DDA → PPA → Charge Schedules

Pay in Full becomes:

Hosted Checkout → Pay in Full → StudentPay E13 API → Stripe Elements →
PaymentIntent → webhook → TWO_AT ledger → enrolment Confirmed

The two journeys do not share DDA / mandate / PPA state.

---

## API contract

Built against studentpay-nz-api productionisation SHA:

`78b2e4439b0ad31e5c766793b8bc1f85523293c6`

Successor of sandbox implementation SHA
`8f8f2f6cb66b80f763c3fb3910e2b4a774305e70`. Do not merge API PR #80.

Create:

- `payment_option = pay_in_full`
- provider identity/code, `provider_order_id`, student, `course_code`
- no client-authoritative price, DDA, mandate, instalments, or upfront amount

Confirm:

- provider identity, checkout/opportunity id
- `declarations.information_confirmed` + `privacy_consent_accepted`
- no `dda_id`, no `payment_plan_accepted`

---

## Environment safety

Pay in Full is available when the Hosted product is `nz_enrolment` and the
API base matches `STUDENTPAY_ENV`:

- sandbox + sandbox API + `pk_test_`
- production + `https://api.studentpay.co.nz` + `pk_live_`

Never accept `pk_test_` in production or `pk_live_` in sandbox.

Production still does **not** globally expose Pay in Full. OLI remains
plan-only. Bela remains sandbox-only. The internal `$1` canary tenant is
hidden unless `E13_INTERNAL_CANARY_HOSTED_ENABLED=true` in Production.

Do not assign `enrol.studentpay.co.nz` until Auto-assign Custom Production
Domains is confirmed OFF.

---

## Eligibility

Server-side only:

1. Hosted E13 environment (sandbox or production API match)
2. Provider tenant `pay_in_full.enabled`
3. Course `enrolmentPaymentOptions` includes `pay_in_full`

OLI Production courses remain payment-plan only. Bela Production remains
disabled (`sandboxOnly`). Internal canary requires an explicit Hosted flag.

---

## Canary

Do **not** complete a Hosted Stripe LIVE card payment until:

`APPROVE_E13_PRODUCTION_CANARY`

The internal Production tenant `studentpay-internal-e13` / course
`e13-prod-canary-001` stays hidden unless
`E13_INTERNAL_CANARY_HOSTED_ENABLED=true`. Do not enable Bela Production
PIF in the same step.

Do not mutate `CERT-E13-BELA-NZ-20260914-002`.
