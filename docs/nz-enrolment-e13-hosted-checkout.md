# NZ Enrolment E13 — Hosted Checkout (Preview / Sandbox)

**Date:** 14 September 2026  
**NZ_ENROLMENT_E13_HOSTED_CHECKOUT = IMPLEMENTED** (Preview only; no Hosted sandbox canary)  
**E13 STATUS = SANDBOX_CERTIFIED_CORE** (not MET)  
**NZ ENROLMENT SCORE = 10 / 13 MET**  
**PRODUCTION_DEPLOYMENT = NONE**

Do not mark E13 MET. Do not Promote Production. Do not assign
`enrol.studentpay.co.nz` to this branch.

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

Built against studentpay-nz-api PR #80 SHA:

`8f8f2f6cb66b80f763c3fb3910e2b4a774305e70`

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

Pay in Full is available only when `STUDENTPAY_ENV=sandbox` and
`NZ_STUDENTPAY_API_BASE_URL` is not `https://api.studentpay.co.nz`.

Preview must use the PR #80 sandbox API (or later sandbox E13) and TEST Stripe
publishable keys (`pk_test_`). Live Stripe keys are rejected.

Do not set `NZ_ENROLMENT_PUBLIC_BASE_URL=https://enrol.studentpay.co.nz` on this
Preview deployment.

---

## Eligibility

Server-side only:

1. Hosted E13 environment kill switch (sandbox, non-production API)
2. Provider tenant `pay_in_full.enabled` (Bela NZ sandbox)
3. Course `enrolmentPaymentOptions` includes `pay_in_full`

OLI Production courses remain payment-plan only. The disabled “coming soon”
radio is unchanged there.

---

## Canary

Do **not** complete a Hosted Stripe TEST card payment until:

`APPROVE_E13_HOSTED_SANDBOX_CANARY`

Do not mutate `CERT-E13-BELA-NZ-20260914-002`.
