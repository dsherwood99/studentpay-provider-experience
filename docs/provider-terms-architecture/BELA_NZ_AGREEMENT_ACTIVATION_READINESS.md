# BELA_NZ Provider Student Agreement — activation readiness

Status: Draft record created. Not Active. Not approved for student acceptance.

This pack does not activate the agreement, merge hosted PR #28, deploy the Bela hosted Production frontend, or create an enrolment.

## A. Provider identity

Legal name: Jessica Buff.

Trading name: Bela Beauty College.

Render: Jessica Buff trading as Bela Beauty College.

Provider code: BELA_NZ. Production PIC-00001. Account 001RE00000r7vKwYAI.

The Salesforce account name was not renamed. Bela is not described as a company in the agreement.

## B. Agreement version and key

| Item | Value |
| --- | --- |
| Salesforce record | PSAT-000002 / `a0URE00000WY6wb2AD` |
| Agreement key | `BELA_NZ\|NZ\|Provider_Student_Agreement\|nz-provider-student-2026-09-30-v2` |
| Version | `nz-provider-student-2026-09-30-v2` |
| Clause template | `nz-provider-student-2026-09-30-v2` |
| Status | Draft |
| Active | No |
| Effective From | blank |
| Jurisdiction | NZ |
| Prior draft | `nz-provider-student-2026-09-30-v1`, kept at `docs/provider-terms-architecture/artefacts/BELA_NZ_agreement_skeleton-v1.html` |

Draft may leave Effective From blank. Active requires a real date. `2099-01-01` is still rejected if someone tries to activate it. No go-live date has been assigned. The resolver only treats Status Active as in force.

## C. Activation-candidate agreement

The complete provider template is `docs/provider-terms-architecture/artefacts/BELA_NZ_agreement_skeleton.html`.

It is one provider-level document. It does not contain a course fee. The selected course schedule is a separate enrolment snapshot, filled from the Active Salesforce price version at acceptance.

The document states: Draft, not active, NZ legal review required, provider approval required. Australian statutory wording is not included.

## D. Clause template version

`nz-provider-student-2026-09-30-v2`. The prior draft `nz-provider-student-2026-09-30-v1` replaced the unresolved-kit skeleton `nz-skeleton-2026-09-23-v2`. v2 removes the 4-day retry, catch-up, and add-to-end promises and changes late-fee assessment to the last calendar day of the month. No student accepted v1.

## E. Hashes

Two layers:

| Layer | What it covers | Hash |
| --- | --- | --- |
| Provider template v2 | Parties, kit policy, cooling-off, access, PIC payer-treatment wording. No course amounts. Stored as `Content_Hash__c`. | `ddb6aa7a3f9c4a4fe9becb72db9ab688503b8236ebdbd6de189575de50ccef78` |
| Prior provider template v1 | Archived. Not the current Draft. | `244ea69046f96826220a9a306350ae2b5c3e0db91127d384945ad3841254241b` |
| Enrolment snapshot | Template plus the selected course schedule. Not stored in Production. Tested locally. | Changes when the course changes. The provider template hash does not. |

A later edit to retry or fees changes a newly composed draft hash and does not rewrite a sealed snapshot. That is covered by `viewHistoricalAgreement`.

## F. Kit policy

`KIT_NOT_INCLUDED` on PIC-00001 and on PSAT-000002.

The StudentPay payment plan covers course tuition from the selected price version only. It does not include a physical kit, equipment, materials, or other separately supplied goods. Course names that contain “+ Kits” were not renamed and were not reduced by an invented kit price.

`Kit_Policy__c` is deployed on `Provider_Integration_Config__c` and on `Provider_Student_Agreement_Template__c`. Blank on OLI and the internal canary. The kit method returns a zero charge for every value, including the reserved `KIT_INCLUDED` and `KIT_UPFRONT_PAYMENT` values.

## G. Course economics

One template. Twenty-six courses. Amounts come from the certified Salesforce price version at snapshot time.

| Preview | Fee | Upfront | Financed | Weekly | Count | Final |
| --- | --- | --- | --- | --- | --- | --- |
| Lash Business Bundle | $2,800 | $10 | $2,790 | $15 | 186 | none |
| Full Beauty Bundle + Kits | $9,600 | $10 | $9,590 | $25 | 384 | $15 |
| Hair Bundle + Kits | $4,704 | $10 | $4,694 | $20 | 235 | $14 |
| Beauty Business Mastery | $97 | $10 | $87 | $20 | 5 | $7 |

Local composer tests: one template hash, four different snapshot hashes, kit not included on each, no $60 or $5 in the student document.

## H. PIC payer treatment

These settings live on `Provider_Integration_Config__c`. The Enabled checkbox is authoritative. An amount alone does not turn a fee on. New checkboxes default to false. OLI (PIC-00002) and the internal canary (PIC-00003) remain disabled, with no kit policy.

| PIC field | BELA_NZ PIC-00001 |
| --- | --- |
| `Failed_Payment_Fee_Enabled__c` | true |
| `Failed_Payment_Fee_Amount__c` | 2.50 |
| `Late_Fee_Enabled__c` | true |
| `Late_Fee_Amount__c` | 15.00 |
| `Late_Fee_Threshold_Days__c` | 60, strictly greater than 60 |
| `Late_Fee_Assessment__c` | `LAST_DAY_OF_MONTH` |
| `External_Collections_Authorised__c` | true. Existing field. Authority only |
| `Payer_Fee_Execution_Mode__c` | `SHADOW` |
| `Payer_Fee_Effective_From__c` | blank. Blank is not effective |
| `Kit_Policy__c` | `KIT_NOT_INCLUDED` |

Removed from this launch and from the Bela draft: 4-day retry, no automatic catch-up, add arrears to the end of the plan, and an NZ public-holiday calendar. Existing generic retry and catch-up code was left as it was. `ProviderNzBusinessDays` was not changed.

The draft says a failed amount remains owing, states the $2.50 and $15 amounts from these settings, assesses the late fee on the last day of each month, and says external collections authority does not refer an account by itself. The v2 sentence does not itself say “collected at the end of the payment plan”. The runtime now does that. The stored agreement HTML and hash were not changed.

## I. Runtime

`ProviderPayerTreatment` reads the PIC policy. `createPayerFee` still throws and does not insert. `ProviderPayerFeeService` is the only writer. It posts only when the fee is enabled, execution is `LIVE`, and `Payer_Fee_Effective_From__c` is set and on or before the event. The service enforces that guard. Callers do not. Bela is `SHADOW` with a blank effective date, so a production call inserts nothing and does not turn on fee bank collection.

The payment webhook is wired. After `GoCardlessPaymentEventService` has authenticated the event through the NZ API, applied it, and written the Payment Attempt and Charge Schedule, it calls `considerFailedPayment` for `failed`, `charged_back`, `customer_approval_denied`, and `cancelled`. A fee exception rolls back only the fee work and returns retryable. The payment status committed before that savepoint stays. `already_applied` still calls the service. The idempotency key stops a second fee. Salesforce Sites is not a second writer.

Qualifying payer failure: Outcome `Failed` and Status `Failed`, `charged_back`, or `customer_approval_denied`. The labels `Charged Back` and `Customer Approval Denied` are accepted if stored. Status `Cancelled` is not qualifying. A `Failure_Code__c` that starts with `INTERNAL-` is a StudentPay processing failure and creates nothing. The charge queueable stamps `INTERNAL-GC-SUBMISSION-REJECTED`, `INTERNAL-EXCEPTION`, or `INTERNAL-NOT-COLLECTIBLE` and does not call the fee service.

The month-end job is wired. `Recalculate_Opportunity_Summary_Daily` runs at 06:00, after the 03:30 ledger transaction job and the 04:00 weekday bank-collection job. Its `finish()` runs only after that batch has recalculated arrears, then calls `assessLateFees` and then `alignPayerFeeCollection`. A fee that becomes collectible at 06:00 waits for the next weekday 04:00 processor. Assessment is the last calendar day, including 28 February, 29 February in a leap year, 30 April, 30 September, 31 January, 31 October, and 31 December. Day 60 does not qualify. Day 61 can.

End of the plan is the latest `Scheduled_Date__c` on a non-cancelled Course Fee schedule. It is not the agreement date, the Opportunity Close Date, or a fixed number of days after the failure. Alignment moves each payer-fee schedule to that date. If the plan is extended, the fee date moves later and auto-collect is turned back off. Cancelled course schedules are ignored.

Collection is a separate bank payment for each fee schedule. It is not added to the final course instalment. The existing processor already creates one Payment Attempt and one allocation per schedule. Combining the fee into the course amount would mix principal with the fee. `Auto_Collect__c` stays false until the plan end date is due, the provider is `LIVE` and effective, and a mandate exists. Alignment then copies the latest course-fee mandate, authorisation, and contact, and sets auto-collect. The weekday processor sends that schedule as its own payment. Several fees stay several schedules, attempts, and allocations. A failed fee collection returns `fee_collection` and does not create another fee.

Course-fee attempts stay unlabeled. Only Dishonour Fee, Late Fee, and Account Fee categories are copied onto the new attempt. `Paid_To_Date__c` ignores Payment Received rows in those categories, so a fee collection does not reduce the course remaining balance. `Opportunity.Amount` is not changed.

Reversal before collection cancels the fee schedule, zeroes its balance, turns auto-collect off, marks the original debit Reversed, and inserts a statement credit. Reversal after collection leaves the schedule and the bank Payment Received in place, marks the original fee debit Reversed, and inserts a statement credit. Rows are not deleted. There is no automatic GoCardless refund. A second reversal returns the existing credit.

Idempotency keys: `FAILED_PAYMENT_FEE|{Payment Attempt Id}` and `LATE_FEE|{plan Id}|YYYY-MM`. The same month posts one late fee. A later eligible month may post another. The processor skips a schedule that already has an external payment id, a processing lock, or a status other than Scheduled.

Qualifying payer failure, from the existing GoCardless payment mapping: Outcome `Failed` and Status `Failed`, `charged_back`, or `customer_approval_denied`. The labels `Charged Back` and `Customer Approval Denied` are accepted if stored. Status `Cancelled` is not qualifying, including when Outcome is `Failed`. Internal, integration, webhook, and duplicate technical failures are not those statuses.

Failed-payment fee ledger: one `Charge_Schedule__c` of category `Dishonour Fee`, held on the current course-fee end date, plus one statement `Account_Transaction__c` of type `Dishonour Fee` dated on the failure. `Retry_Eligible__c` is false. `Auto_Collect__c` stays false until alignment makes that end date collectible. The course schedule amount is unchanged. `Opportunity.Amount` is unchanged. Not Yet Due includes the fee residual until that end date.

Late fee ledger: one `Charge_Schedule__c` and one statement line of type `Late Fee`. The statement date is the assessment date. Alignment then moves the schedule date to the course-fee end date. Day 60 does not qualify. Day 61 does, only on the last calendar day, only when Overdue Balance is greater than zero, and only while the plan is not Complete, Cancelled, or Paid in Full. A replay in the same month returns the existing row. The next eligible month can post a separate fee.

External collections: `External_Collections_Authorised__c` is readable. `automaticExternalReferral` returns false. No collector integration was built.

`Payer_Fee_Effective_From__c` is the payer-fee authority. It is not the agreement Effective From. Blank means not effective, including if execution were set to `LIVE` by mistake. The historical Bela failure on 2026-09-07 is before any future approved date and is not charged.

## Shadow results

Read again on 1 October 2026 after the webhook, scheduler, and collection deploy. Nothing was inserted.

| Check | Result |
| --- | --- |
| Bela plans | 2. One Payment Plan Signed, one Cancelled |
| Open Bela plans | 1 |
| Qualifying failed attempts | 1. Status Failed, outcome Failed, date 2026-09-07, amount $30 |
| Open plan oldest overdue days | 48. Threshold is greater than 60 |
| Hypothetical failed-payment fees | $2.50 |
| Hypothetical late fees | $0.00 |
| Dishonour Fee or Late Fee schedules on Bela or OLI plans | 0 |
| Dishonour Fee or Late Fee statement lines on those plans | 0 |
| Bela execution mode | SHADOW |
| Bela payer-fee effective date | blank |
| Plans in stage External Collections | 0 |

The 2026-09-07 failure is before any approved `Payer_Fee_Effective_From__c`. A blank date blocks charging even if execution were later set to `LIVE` without a date. Do not charge that $2.50.

## Agreement and runtime matrix

| Agreement term | PIC authority | Runtime | Execution | Aligned |
| --- | --- | --- | --- | --- |
| $2.50 per qualifying failed payment | Enabled, $2.50 | Service posts one Dishonour Fee when LIVE and effective | SHADOW | Yes |
| Qualifying failure only | Same classifier as the payment webhook | Cancelled and non-Failed outcomes post nothing | SHADOW | Yes |
| Historical failure is not charged | Effective date blank | Event date must be on or after the PIC date | SHADOW | Yes |
| Fee added to the account and collected at the end of the plan | No separate collection field. The amount is the authority | Separate fee schedule. Auto-collect turns on at the current course-fee end date when LIVE and effective | SHADOW | Yes. The v2 sentence does not itself say "end of the plan". The runtime does |
| $15 when more than 60 days in arrears | Enabled, $15, threshold 60 | Day 60 posts nothing. Day 61 can post | SHADOW | Yes |
| Assessed on the last calendar day of each month | `LAST_DAY_OF_MONTH` | 28/29 February, day 30, and day 31 | SHADOW | Yes |
| External collections authority, no automatic referral | `External_Collections_Authorised__c` true | Readable. Referral method returns false | SHADOW | Yes |
| Kit not included | `KIT_NOT_INCLUDED` | Kit charge returns 0. No kit payment | n/a | Yes |
| No 4-day retry, catch-up, or add-to-end | Not configured | Not built for this launch | n/a | Yes |
| Draft does not open enrolment | Agreement Status Draft, Effective From blank | Active count 0. API resolver ignores Draft | n/a | Yes |

## J. NZ legal review

`NZ_LEGAL_REVIEW = REQUIRED`.

The clause model is a structured decision record, not approved legal wording. It avoids Australian Consumer Law, Australian Privacy Principles, and ABN-only party wording. It does not declare legal compliance.

Review before activation: cooling-off as 3 calendar days, post-cooling-off fee remaining payable subject to provider terms and law, the $2.50 failed-payment fee, the $15 late fee after more than 60 days on the last calendar day of the month, and collections authority that does not refer by itself.

## K. Provider approval

`PROVIDER_APPROVAL = REQUIRED`.

Jessica Buff / Bela Beauty College has not approved this draft for student acceptance. No effective go-live date has been approved.

## L. Remaining blockers

1. NZ legal review.
2. Provider approval.
3. David’s explicit choice to launch fees with the agreement, or to defer fees to a later agreement version.
4. After that choice, an approved `Payer_Fee_Effective_From__c`, then a separate change of `Payer_Fee_Execution_Mode__c` from `SHADOW` to `LIVE`.
5. Hosted PR #28 is not merged. The Bela hosted Production frontend is not deployed.

The webhook, the month-end assessment, and end-of-plan collection are deployed. They insert nothing while execution is `SHADOW` or the effective date is blank.

Retry, catch-up, add-to-end, the NZ holiday calendar, kit upfront payment, and automatic external referral are not activation blockers.

## M. Late-fee assessment

`LAST_DAY_OF_MONTH` means the last calendar day of the month. 28 or 29 February, day 30, and day 31 are handled by the calendar date. No public-holiday list is required for this launch.

## N. Salesforce record

PSAT-000002 was revised in place from v1 to v2. It stayed Draft. No second agreement was created. Active count for BELA_NZ is 0.

| Field | Value |
| --- | --- |
| Id | `a0URE00000WY6wb2AD` |
| Name | PSAT-000002 |
| PIC | BELA_NZ Production |
| Status | Draft |
| Version | `nz-provider-student-2026-09-30-v2` |
| Effective From | blank |
| Kit policy | `KIT_NOT_INCLUDED` |
| Active count for BELA_NZ | 0 |
| $60 or $5 in HTML | No |
| PCT-00001 | In Force, calculation SHADOW, execution SHADOW. Not modified |

## O. Controlled launch runbook — do not run now

### A. Before legal and provider approval

Leave PSAT-000002 Draft. Leave Effective From blank. Leave `Payer_Fee_Execution_Mode__c` as `SHADOW`. Leave `Payer_Fee_Effective_From__c` blank. Do not merge hosted PR #28. Do not create an enrolment, a fee, a referral, a DDA, or a payment. Re-read the shadow table if PIC or plan data changes.

### B. After legal and provider approval

Choose Path A or Path B below. If the approved wording differs from v2, create a new agreement version. Do not edit PSAT-000002 after a student has accepted it. Do not use `2099-01-01`.

### C. Agreement activation

Set the agreement Effective From to the approved go-live date, then set Status to Active. Confirm Active count for BELA_NZ is 1 and `GET /v1/providers/BELA_NZ/courses` returns 26 with the agreement attached. This date does not by itself turn payer fees on.

### D. PIC execution activation

Only for Path A, and only after the agreement that contains the fee clauses is Active. Do not run this section now.

The three controls are separate:

| Control | What it opens | Current Bela value |
| --- | --- | --- |
| Agreement Effective From, then Status Active | Student acceptance and enrolment | blank, Draft |
| `Payer_Fee_Effective_From__c` | Which events may create a fee | blank |
| `Payer_Fee_Execution_Mode__c` | Whether the fee service may insert | `SHADOW` |

Both the effective date and `LIVE` are required. Either one alone inserts nothing.

Safest order:

1. Set the agreement Effective From, then set Status to Active. Confirm Active count is 1. This does not create a fee.
2. Leave execution `SHADOW`. Set `Payer_Fee_Effective_From__c` to the approved fee date. It may match the agreement date. It must be after 2026-09-07. Confirm a shadow read still shows zero fee rows and that the 7 September failure is before the date.
3. Set `Payer_Fee_Execution_Mode__c` to `LIVE` last. New qualifying course-fee failures on or after that date can create one $2.50 Dishonour Fee. A plan more than 60 days overdue can receive one $15 Late Fee on the next month-end. Alignment will make those schedules collectible on the course-fee end date. Do not backfill the historical $2.50.

The webhook and the 06:00 summary job are already connected. Do not add another scheduler. Do not set fee auto-collect by hand. Alignment does that only for a LIVE, effective provider when the plan end date is due and a mandate exists.

Path B skips this section. Execution stays `SHADOW` and the effective date stays blank.

### E. Hosted deployment

Merge hosted PR #28 only when the agreement decision is made. Set `NZ_HOSTED_TENANT_SLUG=bela-nz` on `studentpay-nz-bela-enrolment`. Deploy that project. Do not point it at OLI. Confirm Pay in Full stays disabled. The API does not need a Production promotion for this fee work.

### F. Controlled Production canary

One certification enrolment on the Bela host. Confirm the course price, the snapshot hash, the DDA, the schedule, and that no payer fee was created unless Path A is live and a new qualifying failure has occurred on or after the effective date. Do not use the historical 2026-09-07 event.

### G. Canary neutralisation

Cancel or otherwise close the certification plan through the existing operational process. Reverse any certification fee with `reverseFee` if one was created. Do not delete ledger rows.

### H. Provider handover

Hand the Active agreement version, the PIC mode, the effective date, and the support contacts to the provider. PCT-00001 stays calculation SHADOW and execution SHADOW. OLI PIC-00002 stays fee-disabled.

## Launch paths

Do not choose here.

Path A — fees live at launch. The Active agreement contains the $2.50 and $15 clauses. PIC fees stay enabled. Set `Payer_Fee_Effective_From__c` while execution is still `SHADOW`, confirm the 7 September failure is excluded, then set execution to `LIVE` last. New qualifying course-fee failures on or after that date can create one fee. The historical failure cannot. Each fee is collected as its own payment at the current end of the course-fee plan.

Path B — fees not live at the initial launch. The first Active agreement omits or disables the fee clauses. PIC execution stays `SHADOW` or the fee checkboxes are turned off before activation. Hosted can launch. No payer fee is created. A later agreement version and a later PIC effective date turn fees on. The historical failure remains outside that later date.

## P. Rollback

While the row is Draft, enrolment stays closed. To withdraw the draft, set Status to a non-active state only through the agreement guard. Do not delete the row after any student has a snapshot. If a later version is activated in error, retire it and promote the previous Active version. Do not rewrite Opportunity `Student_Agreement_HTML__c` or `Student_Agreement_Hash__c` on existing acceptances.

## Q. Post-activation certification

After a future activation, repeat the read-only catalogue check (26 Bela courses, Salesforce authority), then one certification enrolment, then confirm the accepted snapshot hash matches the sanitised template plus that course’s price version. Confirm OLI PIC-00002 still has fees disabled and no new Dishonour Fee or Late Fee rows. Confirm PCT-00001 execution is still SHADOW. Production Salesforce has 65 Active OLI courses. The extra course is `PC-000065` / `a0TRE00000vHuTG2A0`, code `Test101`, name Test of Payment Options, slug `test-of-payment-options`, created 2026-09-20 by StudentPay NZ Support. Price version `PCPV-000065` is Active, version 1, pay in full $5, payment plan $10. Opportunity `006RE00000dKi05YAC` references it and is Payment Plan Signed. The hosted 64-course fixture does not contain it. Salesforce-authority Hosted will show it when the API returns it. Legacy Hosted hides it. It was not changed.

## Future kit upfront — note only

Not implemented.

A later option can sit beside course tuition:

- Course tuition fee, still the Salesforce price version
- Optional kit amount, a separate figure, never inferred from a course name
- Kit payment treatment: `KIT_NOT_INCLUDED`, `KIT_INCLUDED`, or `KIT_UPFRONT_PAYMENT`

An upfront kit payment must not change the tuition fee, the financed amount, the regular instalment, or the residual. It must not force a new provider-agreement version for every course. No kit price is stored today.

## Draft does not open enrolment

After PSAT-000002 was created, `GET https://api.studentpay.co.nz/v1/providers/BELA_NZ/courses` returned HTTP 200, count 26, `authority_mode=salesforce`, and no `provider_student_agreement`. Request id `req_c427aa5a0ce4dc74fb8cb734`.

The API resolver counts only Status Active. Draft is `zero_active_agreement`. Create fails in `applyAuthoritativeCatalogue` before Salesforce writes. Confirm fails in `snapshotProviderStudentAgreementAcceptance`. No Production enrolment was created.

## Evidence

Salesforce check-only `0AfRE000001RN3B0AW` and Production deploy `0AfRE000001RN9d0AG` each ran 148 Apex tests with 0 failures. The earlier fee-service deploy remains `0AfRE000001RBRp0AO`. `Payer_Fee_Effective_From__c` is `00NRE000007rYsL2AU`. Bela’s value is blank. Execution is `SHADOW`.

The tests proved, in test context only: an applied qualifying failure creates one $2.50 Dishonour Fee; a second apply, a charged-back event, and an already-applied replay stay at one; shadow, a blank effective date, and a failure before the effective date insert nothing; Cancelled inserts nothing; a queueable integration failure stamps an `INTERNAL-` code and inserts nothing; `customer_approval_denied` creates one fee; a failed fee collection does not create another fee; fees stay held until the course-fee end date and then become separate auto-collect schedules without creating a payment attempt during alignment; extending the plan turns auto-collect back off; a missing mandate does not collect; shadow alignment updates nothing; a successful fee payment settles the fee allocation and leaves the course schedule and Opportunity amount unchanged; course remaining balance stays unchanged because fee receipts are excluded from Paid To Date; reversal after collection keeps the receipt and adds a credit; the summary finish creates one late fee per eligible month and a shadow finish does not; disabled, shadow, and canary-shaped providers insert nothing.

API PR #103 stays open and unmerged. It is a rule mirror. `api.studentpay.co.nz` does not need a promotion for this wiring.

Hosted tests: 271 pass, 0 fail. Typecheck, lint, and the production build succeeded. Hosted PR #28 stays open and unmerged. No hosted contract change was required.

OLI PIC-00002 and canary PIC-00003 remain fee-disabled, with no kit policy and no collections authority. Production fee payment attempts across all providers: 0. Bela fee schedules, fee statement lines, and fee payment attempts: 0. External Collections plans for Bela: 0.
