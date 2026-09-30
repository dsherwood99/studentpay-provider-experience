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
| Agreement key | `BELA_NZ\|NZ\|Provider_Student_Agreement\|nz-provider-student-2026-09-30-v1` |
| Version | `nz-provider-student-2026-09-30-v1` |
| Clause template | `nz-provider-student-2026-09-30-v1` |
| Status | Draft |
| Active | No |
| Effective From | `2099-01-01` |
| Jurisdiction | NZ |

`Effective_From__c` is required by the object even for Draft. `2099-01-01` is a schema placeholder, not an approved go-live date. The resolver only treats Status Active as in force, and a future effective date would still fail closed if the row were activated by mistake.

## C. Activation-candidate agreement

The complete provider template is `docs/provider-terms-architecture/artefacts/BELA_NZ_agreement_skeleton.html`.

It is one provider-level document. It does not contain a course fee. The selected course schedule is a separate enrolment snapshot, filled from the Active Salesforce price version at acceptance.

The document states: Draft, not active, NZ legal review required, provider approval required. Australian statutory wording is not included.

## D. Clause template version

`nz-provider-student-2026-09-30-v1`, replacing the unresolved-kit skeleton `nz-skeleton-2026-09-23-v2`.

## E. Hashes

Two layers:

| Layer | What it covers | Hash |
| --- | --- | --- |
| Provider template | Parties, kit policy, cooling-off, access, payer-treatment wording. No course amounts. | `244ea69046f96826220a9a306350ae2b5c3e0db91127d384945ad3841254241b` |
| Salesforce stored content | The same template after the API HTML sanitiser. This is `Content_Hash__c` on PSAT-000002. | `37a6decdf3dcda849fecb90309a9b21ae195dab0447fe3b1e056e522b5be446b` |
| Enrolment snapshot | Template plus the selected course schedule. Not stored in Production. Tested locally. | Changes when the course changes. The provider template hash does not. |

A later edit to retry or fees changes a newly composed draft hash and does not rewrite a sealed snapshot. That is covered by `viewHistoricalAgreement`.

## F. Kit policy

`KIT_NOT_INCLUDED`.

The StudentPay payment plan covers course tuition from the selected price version only. It does not include a physical kit, equipment, materials, or other separately supplied goods. Course names that contain “+ Kits” were not renamed and were not reduced by an invented kit price.

`Kit_Policy__c` is prepared on `Provider_Student_Agreement_Template__c` in the API metadata and is not deployed in Production yet. The Draft row records the policy in the HTML and in `Notes__c`. Blank on existing providers, including OLI, means no kit charge.

`KIT_INCLUDED` and `KIT_UPFRONT_PAYMENT` are reserved enum values. They do not add money.

## G. Course economics

One template. Twenty-six courses. Amounts come from the certified Salesforce price version at snapshot time.

| Preview | Fee | Upfront | Financed | Weekly | Count | Final |
| --- | --- | --- | --- | --- | --- | --- |
| Lash Business Bundle | $2,800 | $10 | $2,790 | $15 | 186 | none |
| Full Beauty Bundle + Kits | $9,600 | $10 | $9,590 | $25 | 384 | $15 |
| Hair Bundle + Kits | $4,704 | $10 | $4,694 | $20 | 235 | $14 |
| Beauty Business Mastery | $97 | $10 | $87 | $20 | 5 | $7 |

Local composer tests: one template hash, four different snapshot hashes, kit not included on each, no $60 or $5 in the student document.

## H. Payer treatment

| Setting | Value |
| --- | --- |
| Retry | Yes, 4 days |
| Catch-up | No automatic catch-up |
| Arrears | Added to the end of the plan |
| Failed-payment fee | $2.50, payer charge, end of plan |
| Late fee | $15 when more than 60 days in arrears |
| Late-fee assessment | Last business day of the month |
| External collections | Authorised to facilitate where provider terms and law permit. The flag does not refer an account by itself |
| Course-access suspension | Provider controlled. StudentPay does not suspend access because a payment fails |

## I. Runtime alignment

| Agreement term | Salesforce authority | Runtime | Activation safe |
| --- | --- | --- | --- |
| Retry after 4 days | Not a payer-treatment record. Text and notes only | No job reads a 4-day provider policy. `Retry_Eligible__c` is per schedule | NO |
| No automatic catch-up | Not a picklist value the jobs read | Catch-up classes exist and are not bound to this agreement | NO |
| Arrears added to the end | Not implemented as an attempt type | Not wired | NO |
| $2.50 failed-payment fee | Not a payer-fee object. Not `Provider_Commercial_Terms__c` | No payer-fee job | NO |
| $15 when more than 60 days | Specification only. Exactly 60 does not qualify in the hosted check | No late-fee job | NO |
| Last business day of the month | `Holiday` has 0 rows | `ProviderNzBusinessDays` skips weekends only. Its comment states New Zealand public holidays are not skipped | NO |
| External collections | Text says the flag does not refer by itself | No automatic referral from this agreement | NO for a promised referral workflow. The “do not refer from the flag alone” sentence matches current behaviour |
| Course-access suspension | Text says the provider decides | No StudentPay job suspends Bela course access from arrears | YES for the negative promise |
| Kit not included | HTML and notes. Picklist field not deployed | No kit amount is added to fees or instalments | YES |

`RUNTIME_ALIGNMENT_READY = PARTIAL`. Do not activate while the fee, retry, catch-up, add-to-end, or business-day promises are not enforced by the jobs.

## J. NZ legal review

`NZ_LEGAL_REVIEW = REQUIRED`.

The clause model is a structured decision record, not approved legal wording. It avoids Australian Consumer Law, Australian Privacy Principles, and ABN-only party wording. It does not declare legal compliance.

Review before activation: cooling-off as 3 calendar days, post-cooling-off fee remaining payable subject to provider terms and law, $2.50 and $15 payer fees, collections facilitation, and the priority clause.

## K. Provider approval

`PROVIDER_APPROVAL = REQUIRED`.

Jessica Buff / Bela Beauty College has not approved this draft for student acceptance. No effective go-live date has been approved.

## L. Technical blockers

1. Payer-treatment runtime is not wired to this agreement.
2. `ProviderNzBusinessDays` does not observe New Zealand public holidays, and `Holiday` has 0 rows. Do not invent the holiday list here.
3. `Kit_Policy__c` is not in the Production org yet.
4. `Effective_From__c` cannot be blank. The stored date is a placeholder.

## M. Late-fee business day

Rechecked in Production on 30 September 2026.

`ProviderNzBusinessDays` is present. It skips Saturday and Sunday. The class comment says New Zealand public holidays are not skipped. `Holiday` count is 0.

The $15 rule must not be activated until a last-business-day assessment can use an authoritative NZ holiday calendar, and until overdue days are strictly greater than 60.

## N. Salesforce record

Created, not updated from an older row.

| Field | Value |
| --- | --- |
| Id | `a0URE00000WY6wb2AD` |
| Name | PSAT-000002 |
| PIC | BELA_NZ Production |
| Status | Draft |
| Active count for BELA_NZ after insert | 0 |
| Kit in HTML | Yes |
| $60 or $5 in HTML | No |
| PCT-00001 | In Force, calculation SHADOW, execution SHADOW. Not modified |

## O. Activation procedure — do not run now

1. Resolve the runtime-alignment blockers, including the NZ business-day calendar.
2. Complete NZ legal review.
3. Complete Bela provider approval.
4. Freeze this version or cut a new version if the wording changes. Do not edit PSAT-000002 after it has been accepted by a student. A wording change is a new version.
5. Replace `2099-01-01` with the approved effective date.
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

API tests: 232 pass, 0 fail, including the 64-course Production OLI catalogue. OLI agreements were not edited. OLI has no kit policy in the hosted tenant list.
