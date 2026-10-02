# 11. Production deployment evidence

Date: 23 September 2026. Org read: `studentpaynz.my.salesforce.com`. No writes.

## Salesforce

`SAFE_SHARED_SALESFORCE_DEPLOYMENT = BLOCKED`

Check-only deploy was not run. There is no Salesforce project in this workspace, and `studentpay-nz-api` is not visible to this GitHub credential (HTTP 404). See [14-runtime-blocker.md](14-runtime-blocker.md).

`Provider_Payer_Treatment__c` is absent. PCT-00001 remains SHADOW. No Bela agreement template was inserted. PIC-00001 success and cancel URLs were not changed. The account name was not changed to the legal name.

## API

`SAFE_SHARED_API_DEPLOYMENT = BLOCKED`

The NZ API source is the same inaccessible repository. This hosted app does not own retry, catch-up, ledger fees, or late-fee assessment.

## Hosted

PR #28 carries the updated inactive skeleton. It is not merged. `studentpay-nz-bela-enrolment` was not production-deployed. No enrolment, direct debit, billing request, mandate, payment attempt, or payment was created.

## Read-back

PIC-00001: BELA_NZ, brand Bela Beauty College, phone +64 9 888 6459, email support@belabeautycollege.com, Pay in Full false, success and cancel still `https://api.studentpay.co.nz/enrol/bela-beauty/`.

Price version 1 Active. Maths unchanged.

Bela Provider Student Agreement templates: 0.

Pre-existing Bela opportunity, direct debit, payment attempt, charge schedule, and payment-plan agreement counts are unchanged from the prior audit.
