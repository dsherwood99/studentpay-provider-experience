# 14. Runtime blocker

## Repository access

`NZ_API_REPOSITORY_FOUND = NO`

`SALESFORCE_PACKAGE_FOUND = NO`

The hosted docs name the canonical package as a private NZ API repository. This agent's GitHub credential can see three public repositories and cannot open that private package. `GET` for the documented repository name returns HTTP 404. GitHub uses 404 when a private repository is not visible to the token. The public NZ portal has a small Salesforce client only. This hosted repository has no `force-app` and no Apex.

The E13 hosted note already records the NZ API productionisation commit. That commit is not readable from here.

No Salesforce metadata was deployed. `Provider_Payer_Treatment__c` is not in the Production org. Creating it through an ad-hoc Metadata API call would fork the org away from the package that actually deploys Apex. That is not the established release process, and the new fields would not be read by retry, catch-up, fee, or late-fee jobs.

## What Production Apex already contains

Read-only class names, not modified:

- `ScheduledCatchUpPaymentAttemptProcessor`, `CatchUpPaymentAllocationService`, `CatchUpPaymentAttemptKillSwitch`
- `ChargeScheduleProcessor`, `ScheduledChargeScheduleProcessor`, `ChargeScheduleLedgerService`, `DailyChargeScheduleLedgerProcessor`
- `GoCardlessFailedPaymentReconcile`, `GoCardlessFailedPaymentRemediate`
- `ProviderNzBusinessDays`
- `OneOffArrearsPaymentService`

No Apex class name contains `LateFee`, `Retry`, or `PayerFee`. `Charge_Schedule__c.Retry_Eligible__c` remains a per-schedule flag, not the new 4-day provider policy.

## Late-fee calendar gap

`ProviderNzBusinessDays` skips weekends. Its own comment states that New Zealand public holidays are not skipped. `Holiday` exists and contains 0 rows. A last-business-day-of-month assessment therefore cannot yet exclude public holidays. The monthly late-fee job must not be activated until that calendar is authoritative. The specification in this repo treats 60 days as not eligible and 61 days as eligible, and it is not a scheduler.

## Bela policy record

`BELA_PAYER_TREATMENT_RECORD = NOT_CREATED`

There is no object to store a Draft row. The decided values live in the inactive hosted fixture and the draft skeleton only. They are not operational.

## Commercial terms

`PCT-00001` was read back and left unchanged:

- Status In_Force
- Calculation mode SHADOW
- Execution mode SHADOW
- Fixed fee 0.40
- Percent fee 2.9
- Student fee type NONE
- Not linked to PIC-00001

`BELA_TRANSACTION_FEE_040_29_STATUS = CANARY_ONLY`

The row’s notes from the prior audit call it a production shadow canary and forbid LIVE, AUTO, backfill, and pay. David’s approved provider charges are $60 per activated payment plan and $5 per activated account per month. Those fields do not exist. The two models were not combined. Charging was not turned LIVE.

## Mutation audit

Counts on the Bela Production account match the prior audit. This run created none of them.

| Object | Count |
| --- | --- |
| Opportunity | 1 |
| Direct debit authorisation | 4 |
| Payment attempt | 1 |
| Charge schedule | 467 |
| Payment plan agreement | 2 |
| Bela agreement templates | 0 |

Course price version 1 remains Active: $2,800, upfront $10, weekly $15, 186 instalments.
