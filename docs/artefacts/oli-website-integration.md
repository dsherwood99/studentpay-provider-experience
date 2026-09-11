# OLI website integration contract

StudentPay hosts the payment-plan enrolment checkout. The Online Learning
Institute website remains the course catalogue.

Do not change DNS or the OLI website in this change. This document is the
integration specification for OLI / their web developer.

## Student journey

```
OLI course page
        ↓  Enrol / Start payment plan
StudentPay-hosted OLI-branded checkout
https://enrol.studentpay.co.nz/enrol/oli/{courseSlug}
        ↓  course already selected
Your details → Payment option → Your plan → Review
        → Direct debit → Agreement → Complete
```

The 64-course page at `/enrol/oli` is a fallback for direct entry and internal
use. It is not the primary architecture.

## Preferred CTA

On each OLI course page, add one primary button:

**Start payment plan**

Alternative labels that also work:

- Enrol with a payment plan
- Study from $25/week

The button should open the StudentPay deep link for that course, not the
catalogue.

## Current deep-link pattern

```
https://enrol.studentpay.co.nz/enrol/oli/{studentPaySlug}
```

Example — Certificate in Animal Grooming:

- OLI course page: `https://onlinelearninginstitute.co.nz/course/certificate-in-animal-grooming/`
- Current checkout: `https://enrol.studentpay.co.nz/enrol/oli/certificate-in-animal-grooming`
- Future provider-owned host (not live): `https://enrol.onlinelearninginstitute.co.nz/certificate-in-animal-grooming`

Recommended CTA on the Animal Grooming page:

> Start payment plan

## Implementation notes for OLI

1. Use the mapping in `oli-course-deep-links.json`.
2. Match on OLI course name / StudentPay slug. Do not guess from duplicated CSV course codes (`TRA101`–`TRA104` appear twice).
3. If `websiteUrl` is null, the course was not published on the OLI NZ website at inspection time. The StudentPay deep link still works.
4. Open the checkout in the same tab so the journey feels continuous.
5. Do not pass student data, prices, or return URLs as query parameters. The hosted checkout already knows the course and price.
6. After a successful enrolment, the checkout shows **Return to Online Learning Institute** (`https://onlinelearninginstitute.co.nz/`).

## What StudentPay operates

- Hosted checkout
- Payment-plan setup
- Direct Debit (GoCardless BECS NZ)
- Payment Plan Agreement

OLI remains the education provider. StudentPay is the payment-plan provider.

## Mapping file

`docs/artefacts/oli-course-deep-links.json`

Fields:

- `courseName`
- `courseCode`
- `websiteUrl` (OLI course page when determinable)
- `studentPaySlug`
- `currentDeepLink`
- `futureProviderDomainDeepLink`
