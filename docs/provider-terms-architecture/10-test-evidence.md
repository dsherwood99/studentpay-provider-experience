# 10. Test evidence

Hosted checks after the v2 skeleton. Salesforce Apex tests were not run. The package repository is not accessible, and no metadata was deployed.

| Check | Result |
| --- | --- |
| Absent policy: no retry date, no late fee, no payer-fee clauses | Hosted specification test |
| Bela retry date specification: 2026-09-01 plus 4 days = 2026-09-05 | Hosted specification test. Not a Production job |
| Retry disabled or no policy record | No retry date |
| Add-to-end | Does not create an automatic catch-up collection |
| Failed-payment fee | One key per failure id; a replay does not add a second key; a non-qualifying attempt adds none |
| Late fee | 60 days no fee; 61 days eligible; zero balance no fee; already assessed no fee; closed plan no fee; disabled no fee |
| Provider $60 and $5 | Present on the Bela fixture, absent from the student HTML. `chargingAuthorised` is false |
| $0.40 and 2.9% | Absent from the Bela student HTML |
| Agreement content | 3-day cooling-off, 2-year access, 4-day retry, add-to-end, $2.50 end of plan, $15 when more than 60 days, collections not automatic, provider-controlled suspension, kit unresolved |
| Immutability | A later late-fee and retry edit changes a new draft hash and leaves the sealed hash unchanged |
| OLI routes | Confirm and course page do not import the composer |
| `npm test` | 260 pass, 0 fail |
| typecheck, lint, build | pass. `/` remains static |

These specification tests do not submit payments, create Payment Attempts, or change OLI.
