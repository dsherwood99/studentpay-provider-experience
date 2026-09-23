# 8. Bela agreement decision sheet

Bela Beauty College (`BELA_NZ`) has an Active Production course and price for Lash Business Bundle. It does not have an Active Provider Student Agreement. The skeleton in this pack is not for student acceptance.

These questions need an answer before that agreement can be activated. This sheet does not choose them.

StudentPay contact facts already stored, and not in question: support phone +64 9 888 6459, support email support@belabeautycollege.com, privacy URL https://belabeautycollege.com/policies/privacy-policy.

StudentPay price already stored, and not changed by the website: course fee $2,800.00, upfront $10.00, financed $2,790.00, weekly, $15.00, 186 instalments, no residual, Pay in Full off.

## 1. Legal name

**Question.** What is the contracting legal entity name, and is “Bela Beauty College” only the trading name?

**Why.** The agreement has to name the provider the student owes.

**Website.** The public name is Bela Beauty College. No NZBN or registered company name is published on the pages reviewed.

**Conflict.** None found. The Salesforce account name matches the trading name, which is not proof of the legal name.

**StudentPay.** No legal-name field. Trading name is `Brand_Name__c`.

**Field.** Do not add a second trading name. Store legal name only after Bela supplies it.

**Agreement.** Placeholder until answered.

**Operations.** None.

## 2. Which Bela document governs an NZ StudentPay enrolment?

**Question.** For a student who enrols through StudentPay NZ, which document is Part A: the Shopify terms, the refund policy, the LMS terms, or a new NZ document?

**Why.** Part A has to be a single provider document. StudentPay must not pick among them.

**Website.** Those pages repeat one another and also conflict with the FAQ.

**Conflict.** Yes. See the evidence table.

**StudentPay.** Part A stays unresolved.

**Field.** A provider terms URL may be stored later. It is not a payment-policy field.

**Agreement.** Part A stays a placeholder.

**Operations.** None.

## 3. Cooling-off

**Question.** Does a StudentPay NZ enrolment have a 3-day / 72-hour cooling-off right, or is hosted enrolment treated as self-enrolment with no cooling-off?

**Why.** The student needs one rule. It also changes whether fees stay payable.

**Website.** Terms give 3 days from consultant confirmation, end the right if more than half the course is viewed or the student waives it, and say self-enrolments cannot cancel. A separate sentence assumes acceptance after 24 hours unless the student objects.

**Conflict.** Yes, inside the terms page.

**StudentPay.** No cooling-off field. This stays a provider enrolment term.

**Field.** None on the payment-treatment object.

**Agreement.** Cannot be written until Bela chooses.

**Operations.** StudentPay does not currently grant or remove course access.

## 4. Cancellation after cooling-off

**Question.** After any cooling-off period, can the student cancel, or is the course fee still payable in full?

**Why.** This decides whether StudentPay keeps collecting the schedule.

**Website.** Terms say cancellation is not available after cooling-off and the purchase is non-refundable. The FAQ says “cancel anytime, no lock-in contracts.”

**Conflict.** Yes.

**StudentPay.** Provider instructions update schedules. StudentPay does not decide refunds.

**Field.** None until Bela defines an operational instruction, which would still be a provider decision rather than a new fee.

**Agreement.** Cannot say both.

**Operations.** No automatic cancellation policy is attached to Bela.

## 5. Course access length

**Question.** Is access 2 years, lifetime, or something else?

**Why.** It is a provider promise. The pages disagree.

**Website.** Homepage and parts of the lash product say 2 years. FAQ, another part of the same product page, and an older NZ training page say lifetime.

**Conflict.** Yes.

**StudentPay.** Not stored. Not enforced.

**Field.** Do not add a StudentPay access-duration field unless Bela asks StudentPay to enforce it.

**Agreement.** Placeholder.

**Operations.** None in StudentPay.

## 6. Kit

**Question.** For this $2,800 plan, is a kit included, optional, or a separate promotion? What happens to cooling-off and refunds if a kit has been sent?

**Why.** The website describes several kit rules, and the StudentPay price does not mention a kit.

**Website.** Terms include the kit in the course cost and require return of an unused kit. The product page sells a kit as optional and shows different prices. A free-kit promotion depends on four successful payments.

**Conflict.** Yes.

**StudentPay.** The Active price is the course schedule only.

**Field.** Leave kit rules in Part A.

**Agreement.** Placeholder.

**Operations.** Do not add kit-based payment rules in this release.

## 7. Retry

**Question.** If a payment fails, should StudentPay automatically try again after 4 days?

**Why.** The agreement and the collection job have to match.

**Website.** Not stated as a 4-day rule.

**Conflict.** None on this point.

**StudentPay.** Charge schedules already have a per-schedule retry flag that defaults true. There is no provider-level “yes, after 4 days” setting, and this run does not change existing schedules.

**Field.** `Retry_Enabled__c` default false and `Retry_Delay_Days__c` empty on a new payer-treatment record. False means “do not create a new policy”, not “turn off retries that already exist”.

**Agreement.** Leave unresolved. A promise of a 4-day retry would be agreement-only until the job reads that field.

**Operations.** Unchanged.

## 8. Catch-up

**Question.** When a payment is missed, should later payments include a catch-up, or should the missed amount be added to the end of the plan with no catch-up?

**Why.** These produce different schedules.

**Website.** Not stated in those words. Terms allow access suspension and debt collection.

**Conflict.** Not a direct website contradiction. Still unchosen.

**StudentPay.** Catch-up exists as an attempt type and as a plan-variation type. “Add arrears to the end” is not a stored picklist value.

**Field.** `Catch_Up_Treatment__c` default Unset.

**Agreement.** Unresolved until the choice exists in the same job that builds schedules.

**Operations.** Unchanged.

## 9. Failed-payment fee charged to the student

**Question.** Should the student pay $2.50 for each failed payment, collected at the end of the plan?

**Why.** This is a payer charge and has to be disclosed. It is not the provider’s $0.40 + 2.9% transaction fee, and it is not a bank fee.

**Website.** Not stated.

**Conflict.** None. Absence is not a yes.

**StudentPay.** Dishonour balances can be stored. The Bela commercial terms student fee is NONE. No $2.50 configuration exists.

**Field.** `Failed_Payment_Fee_Enabled__c` default false. Amount empty. Collection unset.

**Agreement.** Off. Do not mention $2.50 as if Bela had selected it.

**Operations.** No new payer fee.

## 10. Late fee

**Question.** Should a late fee apply on the last business day of a month when the account is more than 60 days in arrears? If yes, what amount?

**Why.** There is no approved amount in Bela’s configuration.

**Website.** Not stated.

**Conflict.** None. Do not infer a yes from the fact the platform can store late-fee balances.

**StudentPay.** No provider amount, no 60-day rule, no monthly assessment field.

**Field.** `Late_Fee_Enabled__c` default false. Amount and trigger empty.

**Agreement.** Off.

**Operations.** No new payer fee.

## 11. Collections

**Question.** May StudentPay refer or manage external collections, or does Bela keep that decision?

**Why.** The terms say Bela may send an account to debt collection. That sentence does not appoint StudentPay.

**Website.** Bela reserves a right to use debt collection. It does not name StudentPay’s authority.

**Conflict.** Unclear, not a number conflict.

**StudentPay.** Collections reason is stored per opportunity. There is no provider-level authority flag.

**Field.** `Collections_Authority__c` default Unset.

**Agreement.** Unresolved.

**Operations.** Unchanged.

## 12. Course access suspension

**Question.** If payments are behind, who suspends course access: Bela only, or StudentPay as well?

**Why.** The terms reserve that right to Bela. StudentPay does not host the course.

**Website.** Bela may suspend access until the plan is up to date.

**Conflict.** None on authorship. Scope for StudentPay is unstated.

**StudentPay.** No switch was added.

**Field.** None unless Bela later asks for a generic operational signal.

**Agreement.** If mentioned, it belongs in Part A as Bela’s right, after Bela approves the sentence.

**Operations.** StudentPay does not suspend Bela course access today.

## 13. Provider fees charged to Bela, not to the student

**Question.** Please confirm two provider-to-StudentPay charges for a later settlement release: $15 establishment per activated payment plan, and $0.40 + 2.9% of each payment attempt. Confirm they must not be charged to the student, and that the existing shadow commercial record must stay shadow.

**Why.** The transaction-fee numbers already sit on a Bela shadow canary that says not to go live and not to pay. The $15 establishment fee is not on that record.

**Website.** Not these fees.

**Conflict.** None with the website. The shadow record is not approval to charge.

**StudentPay.** Commercial terms can store fixed and percent fees. Establishment fee needs a new field with default None. Calculation mode remains the charging switch.

**Field.** Existing fixed and percent fields. Proposed establishment amount and basis, default None.

**Agreement.** Omitted from the student-facing skeleton.

**Operations.** This run does not charge Bela.

## 14. Website price versus StudentPay price

**Question.** Confirm the hosted StudentPay plan stays at $2,800, $10 upfront, and $15 weekly for 186 weeks, and that the website’s $2,880 / $24.16 weekly / $22 weekly offers are different products.

**Why.** Publishing both without a decision will confuse students.

**Website.** Lash product shows $2,880 upfront and $24.16 per week, plus a $22 per week banner.

**Conflict.** Yes, with the Active StudentPay price version.

**StudentPay.** The Active price version was not changed.

**Field.** Price version, already populated.

**Agreement.** The skeleton shows the StudentPay price as data only.

**Operations.** Unchanged.

## 15. NZ legal approval

**Question.** Who will approve the New Zealand payment-plan wording, and on what effective date?

**Why.** The Australian v1 draft is a clause model for review in Australia. It is not approved NZ text.

**Website.** Not a StudentPay agreement.

**Conflict.** AU currency and Australian Privacy Principles appear on Bela pages that NZ students can open.

**StudentPay.** Jurisdiction is not stored. The skeleton is marked draft and not active.

**Field.** `Jurisdiction__c` = NZ on a future version, only after approval.

**Agreement.** Cannot become Active on the strength of the AU draft.

**Operations.** None.
