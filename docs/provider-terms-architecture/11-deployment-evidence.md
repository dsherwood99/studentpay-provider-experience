# 11. Production deployment evidence

## Salesforce

No metadata was deployed. No Apex was changed. No agreement template was inserted. No commercial-terms row was edited. No payer-treatment record was created. PIC-00001 was not patched in this run.

Reason: the safe shared foundation has to be generic, default-off, and enforced by the same runtime that would print it into an agreement. The NZ API and Salesforce source repository is not available here. Creating Production fields through an ad-hoc API call would leave agreement-only configuration, which is explicitly unsafe, and it could collide with the real package.

`SAFE_SHARED_SALESFORCE_DEPLOYMENT = BLOCKED`

Check-only deploy: not run, because there is no Salesforce project in this workspace.

## API

No NZ API deploy. Hosted checkout has no endpoint that administers retry, catch-up, or fees. Inventing one would not make Salesforce enforce the clause.

`SAFE_SHARED_API_DEPLOYMENT = BLOCKED`

## Hosted frontend

PR #28 is updated with the inactive skeleton and documentation. It is not merged. The dedicated Bela Vercel project was not production-deployed by this run. No Bela enrolment, direct debit, billing request, payment attempt, or payment was created.

## Read-back that was already true before this run

These Production values were queried and left unchanged:

- PIC-00001 support phone +64 9 888 6459, support email support@belabeautycollege.com, privacy URL set, success and cancel URLs still the legacy Bela integration URLs, Pay in Full false.
- One Active Bela course and one Active price version. Plan maths hold.
- Bela agreement templates: 0.
- PCT-00001 remains SHADOW with student fee NONE.
