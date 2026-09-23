# 10. Test evidence

Filled after the hosted test run on this branch. Salesforce Apex tests and NZ API tests were not run: those repositories are not in this workspace, and no Salesforce metadata was deployed.

Hosted checks that this change adds:

- Inactive payer treatment produces no payer-fee clauses.
- Bela skeleton is `DRAFT_NOT_ACTIVE`, not acceptable, contains the $2,800 schedule, and does not contain a $2.50 payer fee, a 2.9% provider fee, or Australian statutory labels.
- The committed HTML artefact matches the composer byte for byte.
- Sealing a snapshot and then changing retry and payer fees does not change the stored HTML or hash. A newly composed draft does change, and it stays inactive, marked runtime-not-wired.
- An OLI-like input with establishment and transaction amounts still chargingAuthorised false omits those amounts from the student-facing skeleton and adds no payer-fee clause.
- Confirm and course page do not import the composer.
- Existing hosted suites cover OLI home isolation, Bela host binding, Pay in Full gating, equal-plan and residual behaviour, and Salesforce-authority fail-closed when the provider agreement is absent.

Results on this branch after the skeleton landed:

| Check | Result |
| --- | --- |
| `npm test` | 256 pass, 0 fail (the six new provider-terms tests are included) |
| `npm run typecheck` | pass |
| `npm run lint` | pass, 0 warnings |
| `npm run build` | pass. `/` remains static |

Not run, because the source is not in this workspace and no metadata was deployed: Salesforce Apex tests, NZ API tests.

Explicit regressions covered by the new tests:

- No payer-fee clause for the inactive default.
- Commercial establishment and transaction amounts do not appear as payer charges.
- OLI confirm and course routes do not call the composer.
- A sealed hash does not follow a later settings edit.
