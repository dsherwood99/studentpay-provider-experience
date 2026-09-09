# OLI approved course catalogue

Authoritative source:

`data/oli/2608-course-list-and-fees.csv`

Generated runtime catalogue:

`src/lib/nz-enrolment/catalogues/oli-production.json`

Reconciliation table:

`docs/artefacts/oli-course-reconciliation.md`

## Updating approved courses

1. Replace the CSV with a newly approved export. Do not scrape the public website or copy historical CRM plan prices.
2. Run `python3 scripts/generate-oli-catalogue.py` from this repository.
3. Commit the CSV, generated JSON, and reconciliation artefact together.
4. Keep CSV **Course Code** values as supplied. Do not invent replacements for TRA101–TRA104 collisions.

## Two prices

| CSV column | StudentPay name | Use now |
|---|---|---|
| Upfront Payment of Course Fee | Payment in Full of Course Fees (`paymentInFullCourseFeeCents`) | Preserved only. Pay-in-full processing is out of scope. |
| Payment Plan Course Fee | Payment Plan Course Fee (`paymentPlanCourseFeeCents`) | Canonical `course_price` for Enrolment Checkout. |

Payment-plan upfront / deposit (`upfront_payment`) is **$0.00** for OLI. That field is not the CSV “Upfront Payment of Course Fee”.

## Payment-plan rule

Weekly $25.00. Exact residual final instalment when the Payment Plan Course Fee is not divisible by $25. No extra $0.00 row when it divides evenly.
