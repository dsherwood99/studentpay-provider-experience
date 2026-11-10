# OLI NZ Enrolment Checkout Phase 2 — close-out

**Date:** 10 November 2026  
**Status:** **CLOSED**

C2 is in production on the OLI hosted checkout. Student-facing application
recovery is **Not Planned — Student Recovery Not Required**.

Canonical API record: `studentpay-nz-api`
`docs/oli-phase-2-enrolment-closeout.md`.

| Stage | PR | Result |
|---|---|---|
| C2 preparing copy and ready GoCardless URL | [#35](https://github.com/dsherwood99/studentpay-provider-experience/pull/35) | Merged. Live OLI deployment `AD6PiEiQiGNptEHzNU4HLrfPCctg` at SHA `834232f47c2258dfb7f23b7acd5e47140803f8ef`. |
| Cookie-less checkout resume | [#34](https://github.com/dsherwood99/studentpay-provider-experience/pull/34) | Closed **Not Planned**. Not merged. Not deployed. |

Retained: same-session checkout, GoCardless `?dda=return` / `?dda=cancelled`,
create/confirm idempotency via the NZ API, and `Checkout_ID` on the
Opportunity. Students who abandon checkout start a new application.

Do not add magic links, email recovery, or new recovery endpoints.
