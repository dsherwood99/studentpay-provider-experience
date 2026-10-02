# 2. Target provider terms architecture

## Layers

| Layer | Owns | Does not own |
| --- | --- | --- |
| A. Provider commercial terms | What StudentPay charges the provider | Payer instalments or payer fees |
| B. Payer treatment | Retry, catch-up, payer failed-payment fee, late fee, collections authority | Provider settlement fees |
| C. Course price | Fee, upfront, frequency, instalment, count, Pay in Full | PIC branding |
| D. Provider enrolment terms | Cooling-off, cancellation, refund, access, kit, certificates | StudentPay payment mechanics, unless a generic operational switch is explicitly approved |
| E. StudentPay documents | Payment Plan Agreement, Direct Debit Service Agreement, StudentPay privacy | The provider student agreement |

## Clause model taken from the AU draft

Used as structure only. Not approved NZ wording.

1. The student owes the course amount to the provider.
2. A payment schedule is a method of paying that amount.
3. The provider appoints StudentPay to administer and collect on the provider’s behalf.
4. StudentPay does not provide the course, set the course fee, buy the debt, or prepay the provider.
5. StudentPay may administer authorities, retries, catch-ups, arrangements, and collections where the provider has authorised that treatment and the runtime enforces it.
6. The provider controls cancellation, fee reduction, waiver, and refund or credit decisions.
7. StudentPay updates schedules after an authorised provider instruction.
8. StudentPay handles payment-processing and payment-arrangement questions.
9. The provider handles course, enrolment, withdrawal, cancellation, refund, and underlying amount-owing questions.
10. Provider enrolment terms remain authoritative for whether course fees are payable, subject to applicable law.
11. Structured tokens are candidates, not approved sentences: provider legal name, trading name, provider code, effective date, and the payer failed-payment cost clause.

## Agreement generation

Preferred shape: **B moving toward C**.

- Provider choices are structured (layers A–C).
- Legal prose is a versioned template for a jurisdiction, with tokens filled from those structures.
- At the moment of acceptance, the exact HTML, title, version, and hash are sealed on the Opportunity and Payment Plan Agreement.
- Later PIC or treatment edits compose a new version. They do not rewrite a sealed snapshot.
- A treatment clause is activatable only when the same authority drives the operational job. Otherwise the state is `AGREEMENT_ONLY_CONFIGURATION_NOT_SAFE`.

Current Production templates are fully static HTML (model A). That remains valid for OLI. Bela does not gain a static blob of inferred terms.

## Jurisdiction

Generic codes already implied by the product split: `AU` and `NZ`.

NZ agreements do not inherit AU statutory clauses. Jurisdiction is a version dimension on the template, not a sentence copied from the AU draft.

## What this repository implements

`src/lib/nz-enrolment/provider-terms.ts` composes an inactive skeleton from structured input.

- Status is always `DRAFT_NOT_ACTIVE`.
- Student acceptance is always false.
- Salesforce status is `DoNotCreate`.
- Payer fees default off.
- Provider commercial amounts are omitted from the student-facing HTML.
- A sealed snapshot ignores later settings.
- Configured payer fees are labelled `AGREEMENT_ONLY_CONFIGURATION_NOT_SAFE` because this app does not enforce them.

Checkout, confirm, and catalogue overlay do not import this module. OLI’s Active template is untouched.
