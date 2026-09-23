# Provider terms architecture

Audit date: 23 September 2026.

This pack records the current StudentPay NZ authority chain and the minimum generic model for provider student payment-plan terms. Bela Beauty College (`BELA_NZ`) is the first provider examined. Nothing in this pack activates an agreement, a payer fee, or a provider charge.

The attached Australian draft file `StudentPay_AU_Provider_Student_Payment_Plan_Terms_v1.docx` was not present in this workspace. The architecture uses the clause model supplied with that draft. It does not reproduce Australian statutory wording and it is not approved New Zealand legal text.

| Document | Contents |
| --- | --- |
| [01-current-state-audit.md](01-current-state-audit.md) | Salesforce objects, hosted behaviour, broken links |
| [02-target-architecture.md](02-target-architecture.md) | Minimum generic target |
| [03-data-model.md](03-data-model.md) | Reuse, gaps, proposed fields |
| [04-authority-matrix.md](04-authority-matrix.md) | Which layer owns each choice |
| [05-agreement-versioning.md](05-agreement-versioning.md) | Immutable acceptance snapshots |
| [06-commercial-schedule-mapping.md](06-commercial-schedule-mapping.md) | Schedule to runtime to agreement |
| [07-bela-website-evidence.md](07-bela-website-evidence.md) | Published Bela statements and conflicts |
| [08-bela-decision-sheet.md](08-bela-decision-sheet.md) | Decisions required before an Active agreement |
| [09-migration-backwards-compatibility.md](09-migration-backwards-compatibility.md) | Defaults that preserve current behaviour |
| [10-test-evidence.md](10-test-evidence.md) | What was executed |
| [11-deployment-evidence.md](11-deployment-evidence.md) | Why shared Salesforce and API deploys did not run |
| [12-remaining-manual-actions.md](12-remaining-manual-actions.md) | Actions still required from David |
| [13-activation-runbook.md](13-activation-runbook.md) | Later order of approval, merge, and certification |
| [14-runtime-blocker.md](14-runtime-blocker.md) | Why payer-treatment runtime is not deployed |

Inactive skeleton: [artefacts/BELA_NZ_agreement_skeleton.html](artefacts/BELA_NZ_agreement_skeleton.html). Clause template `nz-skeleton-2026-09-23-v2`. Not Active. Kit and NZ legal wording remain open. David’s decided policy values are filled as structured fields.
