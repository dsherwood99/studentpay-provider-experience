# 5. Agreement generation and versioning

## Current Production behaviour

Model A. `Provider_Student_Agreement_Template__c` stores one HTML body. Hosted checkout displays that body when the catalogue API returns a parseable `provider_student_agreement`. Salesforce-authority courses without one fail closed before checkout. OLI Production has an Active template. Bela Production has none.

On acceptance, the Opportunity stores the HTML, title, version, key, hash, template lookup, and accepted-at timestamp. `Payment_Plan_Agreement__c` stores HTML, version, and document hash. Those copies are the historical record. Changing the template later does not, by this data model, replace them. This run did not create an acceptance, so it did not exercise that write path.

## Target

1. Structured payer treatment and commercial terms stay on their own records.
2. A published agreement version freezes the prose, the jurisdiction, the treatment lookup, and the content hash.
3. Course figures are merged from the price version in force at acceptance, then stored inside the sealed HTML.
4. `viewHistoricalAgreement` returns the sealed HTML. It does not call the composer again.
5. A new provider choice creates a new Draft template version. It does not edit the Active version and it does not edit accepted Opportunities.

## This repository

`composeProviderTermsSkeleton` always returns `DRAFT_NOT_ACTIVE`, `activationPermitted: false`, and `salesforceStatus: DoNotCreate`.

`sealDraftSnapshot` refuses anything that is not an inactive draft.

`viewHistoricalAgreement` returns the sealed object and ignores the current input. The unit test changes retry and payer fees after sealing and checks that the stored hash is unchanged while a newly composed draft hash is different.

The Bela artefact is a skeleton with unresolved tokens. It is not inserted into `Provider_Student_Agreement_Template__c`. Status Active was not set.

## Activation gate

An Active Bela template requires all of the following.

- Provider and NZ legal approval of the prose.
- Resolved Part A conflicts, or an explicit instruction to point at one provider document without StudentPay choosing among conflicts.
- Payer treatments either left unset, or set and enforced by the same Salesforce jobs that the clause describes.
- A sealed hash written at acceptance, not recomputed from live PIC on later views.
