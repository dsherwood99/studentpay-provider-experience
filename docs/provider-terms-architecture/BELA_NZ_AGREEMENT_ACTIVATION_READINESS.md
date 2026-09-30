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
| `Kit_Policy__c` | `KIT_NOT_INCLUDED` |

Removed from this launch and from the Bela draft: 4-day retry, no automatic catch-up, add arrears to the end of the plan, and an NZ public-holiday calendar. Existing generic retry and catch-up code was left as it was. `ProviderNzBusinessDays` was not changed.

The draft says a failed amount remains owing, states the $2.50 and $15 amounts from these settings, assesses the late fee on the last day of each month, and says external collections authority does not refer an account by itself.

## I. Runtime

`ProviderPayerTreatment` evaluates the PIC policy and refuses to create a payer fee, a late fee, or an external referral. Calling the create method throws. Execution mode `LIVE` is reserved and is also refused. Bela is `SHADOW`.

Failed-payment fee: one amount per qualifying failure id. A duplicate or replayed id does not add a second fee. A technical failure does not qualify. The fee is separate from provider commercial charges.

Late fee: disabled, day 60, a closed plan, a non-month-end date, and a repeat of the same plan plus assessment month do not qualify. Day 61 on the last calendar day of February, a 30-day month, and a 31-day month does qualify in the calculation. No holiday calendar is used. The idempotency key is provider plan plus fee type plus assessment month.

External collections: true means the provider authority is readable. It does not send an account anywhere. No collector integration was built.

Effective-date rule: a failed-payment fee applies only to a qualifying failure on or after an approved policy effective date. A late fee is assessed only while the PIC policy is effective and execution is live. This deployment did not charge historical failures.

## Shadow results

Read on 30 September 2026. Nothing was inserted.

| Check | Result |
| --- | --- |
| Bela plans | 2 |
| Open Bela plans | 1 |
| Qualifying failed attempts | 1 attempt on 1 plan. Status Failed, outcome Failed |
| Hypothetical failed-payment fees | $2.50 |
| Open plans more than 60 days overdue | 0 |
| Hypothetical late fees | $0.00 |
| Plans already in stage External Collections | 0 |
| Fees or referrals created | 0 |

The one failed attempt is historical relative to an unapproved effective date. It is not charged.

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
3. An approved effective date, then a later decision to move `Payer_Fee_Execution_Mode__c` from `SHADOW` to a release that is allowed to create fees.
4. Hosted PR #28 is not merged. The Bela hosted Production frontend is not deployed.

Retry, catch-up, add-to-end, and the NZ holiday calendar are not activation blockers.

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

## O. Activation procedure — do not run now

1. Review the shadow counts above. Do not turn execution to live in this state.
2. Complete NZ legal review.
3. Complete Bela provider approval.
4. Freeze this version or cut a new version if the wording changes. Do not edit PSAT-000002 after it has been accepted by a student. A wording change is a new version.
5. Set Effective From to the approved go-live date. Draft is blank today. Do not use `2099-01-01`.
6. Set Status to Active. Do not do this in the current run.
7. Confirm `GET /v1/providers/BELA_NZ/courses` still returns 26.
8. Confirm enrolment resolution now returns the Active agreement.
9. Confirm Vercel Production configuration for the API and the hosted project.
10. Merge hosted PR #28.
11. Deploy `studentpay-nz-bela-enrolment` Production.
12. Update PIC success and cancel URLs if required.
13. Run one controlled Production certification enrolment.
14. Verify the Opportunity, agreement snapshot and hash, DDA, payment-plan agreement, schedules, and course maths, and that no unintended payment was collected.
15. Neutralise the certification records.
16. Hand over to the provider.

## P. Rollback

While the row is Draft, enrolment stays closed. To withdraw the draft, set Status to a non-active state only through the agreement guard. Do not delete the row after any student has a snapshot. If a later version is activated in error, retire it and promote the previous Active version. Do not rewrite Opportunity `Student_Agreement_HTML__c` or `Student_Agreement_Hash__c` on existing acceptances.

## Q. Post-activation certification

After a future activation, repeat the read-only catalogue check (26 courses, Salesforce authority), then one certification enrolment, then confirm the accepted snapshot hash matches the sanitised template plus that course’s price version. Confirm OLI’s 64-course catalogue and OLI agreement behaviour are unchanged. Confirm PCT-00001 is still SHADOW.

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

## OLI

API tests: 237 pass, 0 fail, including the 64-course Production OLI catalogue and the payer-treatment policy tests. OLI PIC-00002 was not given a fee, a kit policy, or collections authority. OLI agreements were not edited. Hosted tests: 271 pass, 0 fail. Salesforce check-only `0AfRE000001R90D0AS` and deploy `0AfRE000001R96f0AC` each ran 24 Apex tests with 0 failures. The API branch is not merged and `api.studentpay.co.nz` was not promoted.
