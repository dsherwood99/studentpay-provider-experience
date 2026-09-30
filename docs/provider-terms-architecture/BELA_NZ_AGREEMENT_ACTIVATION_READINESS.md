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

The draft says a failed amount remains owing, states the $2.50 and $15 amounts from these settings, assesses the late fee on the last day of each month, and says external collections authority does not refer an account by itself.

## I. Runtime

`ProviderPayerTreatment` reads the PIC policy. `createPayerFee` still throws and does not insert. `ProviderPayerFeeService` is the only writer. It posts only when the fee is enabled, execution is `LIVE`, and `Payer_Fee_Effective_From__c` is set and on or before the event. Bela is `SHADOW` with a blank effective date, so a production call would insert nothing. The webhook and the daily charge processor do not call the service. That invocation is an activation step, not part of this deploy.

Qualifying payer failure, from the existing GoCardless payment mapping: Outcome `Failed` and Status `Failed`, `charged_back`, or `customer_approval_denied`. The labels `Charged Back` and `Customer Approval Denied` are accepted if stored. Status `Cancelled` is not qualifying, including when Outcome is `Failed`. Internal, integration, webhook, and duplicate technical failures are not those statuses.

Failed-payment fee ledger: one `Charge_Schedule__c` of category `Dishonour Fee`, dated on the last non-cancelled Course Fee date, plus one statement `Account_Transaction__c` of type `Dishonour Fee` dated on the failure. `Auto_Collect__c` and `Retry_Eligible__c` are false, so the existing daily processor does not debit it. The course schedule amount is unchanged. `Opportunity.Amount` and Remaining Balance are unchanged. Not Yet Due includes the fee residual until that end date. Idempotency key: `FAILED_PAYMENT_FEE|{Payment Attempt Id}` on the schedule, and `Payment Attempt|{id}|Dishonour Fee` on the statement line.

Late fee ledger: one `Charge_Schedule__c` and one statement line of type `Late Fee`, dated on the assessment date, same auto-collect stop. Idempotency key: `LATE_FEE|{plan Id}|YYYY-MM`. Day 60 does not qualify. Day 61 does, only on the last calendar day, only when Overdue Balance is greater than zero, and only while the plan is not Complete, Cancelled, or Paid in Full. A replay in the same month returns the existing row.

Reversal cancels the schedule, sets its balance to zero, marks the original statement line `Reversed`, and inserts a statement-visible `Reversal` credit. Rows are not deleted. A second reversal returns the existing credit.

External collections: `External_Collections_Authorised__c` is readable. `automaticExternalReferral` returns false. No collector integration was built.

`Payer_Fee_Effective_From__c` is the payer-fee authority. It is not the agreement Effective From. Blank means not effective, including if execution were set to `LIVE` by mistake. The historical Bela failure on 2026-09-07 is before any future approved date and is not charged.

## Shadow results

Read again on 30 September 2026 after the fee-service deploy. Nothing was inserted.

| Check | Result |
| --- | --- |
| Bela plans | 2. One Payment Plan Signed, one Cancelled |
| Open Bela plans | 1 |
| Qualifying failed attempts | 1. Status Failed, outcome Failed, date 2026-09-07, amount $30 |
| Open plan oldest overdue days | 47. Threshold is greater than 60 |
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
| Fee added to the account and collected at the end of the plan | No separate collection field. The amount is the authority | Statement debit on the failure date. Schedule dated to the last course fee. Auto-collect off | SHADOW | Partial. The debit is not originated. The v2 sentence does not itself say "end of the plan" |
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
3. A chosen launch path: fees live with the agreement, or fees deferred to a later agreement version.
4. After that choice, an approved `Payer_Fee_Effective_From__c`, then a separate change of `Payer_Fee_Execution_Mode__c` from `SHADOW` to `LIVE`.
5. Production invocation is not connected. The webhook does not call `considerFailedPayment`. No scheduled job calls `assessLateFees`.
6. End-of-plan debit origination is not turned on. Fee schedules are `Auto_Collect__c = false`.
7. Hosted PR #28 is not merged. The Bela hosted Production frontend is not deployed.

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

Only for Path A, and only after the agreement that contains the fee clauses is Active.

1. Set `Payer_Fee_Effective_From__c` to the approved fee date. It can match the agreement date. It is a separate field.
2. Confirm the 2026-09-07 failure is before that date.
3. Connect `considerFailedPayment` to the payment-failure path, still behind the LIVE and effective-date guards.
4. Schedule a daily call to `assessLateFees`. It already returns nothing unless today is the last calendar day and a provider is LIVE and effective.
5. Then set `Payer_Fee_Execution_Mode__c` to `LIVE`.
6. Leave fee `Auto_Collect__c` false until a separate decision turns on end-of-plan debit origination.

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

Path A — fees live at launch. The Active agreement contains the $2.50 and $15 clauses. PIC fees stay enabled. `Payer_Fee_Effective_From__c` is the approved date. Execution becomes `LIVE` only after the webhook and month-end call are connected. New qualifying failures on or after that date can create one fee. The historical failure cannot. End-of-plan bank debit stays off until auto-collect is explicitly enabled.

Path B — fees not live at the initial launch. The first Active agreement omits or disables the fee clauses. PIC execution stays `SHADOW` or the fee checkboxes are turned off before activation. Hosted can launch. No payer fee is created. A later agreement version and a later PIC effective date turn fees on. The historical failure remains outside that later date.

## P. Rollback

While the row is Draft, enrolment stays closed. To withdraw the draft, set Status to a non-active state only through the agreement guard. Do not delete the row after any student has a snapshot. If a later version is activated in error, retire it and promote the previous Active version. Do not rewrite Opportunity `Student_Agreement_HTML__c` or `Student_Agreement_Hash__c` on existing acceptances.

## Q. Post-activation certification

After a future activation, repeat the read-only catalogue check (26 Bela courses, Salesforce authority), then one certification enrolment, then confirm the accepted snapshot hash matches the sanitised template plus that course’s price version. Confirm OLI PIC-00002 still has fees disabled and no new Dishonour Fee or Late Fee rows. Confirm PCT-00001 execution is still SHADOW. Production Salesforce currently has 65 Active OLI courses, including `Test101` / Test of Payment Options, created 2026-09-20. The hosted OLI fixture remains 64. This fee deploy did not add that course.

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

Salesforce check-only `0AfRE000001RBOb0AO` and Production deploy `0AfRE000001RBRp0AO` each deployed 4 classes and ran 11 Apex tests with 0 failures: `ProviderPayerTreatment_Test` and `ProviderPayerFeeService_Test`. `Payer_Fee_Effective_From__c` is `00NRE000007rYsL2AU`. Bela’s value is blank.

The tests proved: shadow inserts nothing; a failure before the effective date inserts nothing; a qualifying failure on the effective date inserts one $2.50 Dishonour Fee; replay stays at one; a Cancelled failure inserts nothing; a disabled provider inserts nothing; day 60 inserts nothing; day 61 off month-end inserts nothing; day 61 on month-end inserts one $15 Late Fee; month-end replay stays at one; reversal returns Not Yet Due to the course amount and the statement closing balance to zero; a shadow batch returns no rows.

API unit tests: 239 pass, 0 fail. The API policy module mirrors the rules and does not insert fees. It is not on the catalogue request path. API PR #103 stays unmerged. `api.studentpay.co.nz` does not need a promotion for this launch.

Hosted tests: 271 pass, 0 fail. Typecheck, lint, and the production build succeeded. Hosted PR #28 stays open and unmerged.

OLI PIC-00002 and canary PIC-00003 remain fee-disabled, with no kit policy and no collections authority. No OLI fee schedule or fee statement line was created. The webhook class was not modified.
