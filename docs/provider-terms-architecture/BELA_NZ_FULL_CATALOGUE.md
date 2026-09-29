# BELA_NZ full catalogue

Captured 29 September 2026 from https://belabeautycollege.com/collections/all-courses-bundles.
Provider code BELA_NZ. Production PIC-00001. Account 001RE00000r7vKwYAI.
Catalogue effective date for new price versions: 2026-09-29.
Lash Business Bundle keeps price version 1, effective 2026-09-23.
This date is catalogue authority only. It does not activate the provider agreement or the hosted Production site.

Salesforce is the payment-plan authority for the courses below. The website JSON keeps presentation order, names, and published selling prices. It does not store a second copy of upfront, weekly amount, instalment count, or residual for the Salesforce courses.

## Plan rule

Other courses use integer cents: upfront $10.00, regular weekly $20.00, finance = course fee − $10.00. Full regular count is floor(finance / $20). A non-zero remainder becomes one final instalment smaller than $20. Number of instalments stored in Salesforce is the total, including that final instalment. Plan mode is Derived Regular. Pay in Full is false.

Lash Business Bundle is the existing price version: $2,800, $10 upfront, $15 weekly, 186 instalments, no residual. The website product Lash Bundle + Kits at $2,880 is not a second course and is not the StudentPay fee.

The generic recurring ceiling is 400 instalments. Full Beauty Bundle + Kits at $9,600 needs 480 instalments, so it was not created.

## Authority table

| Order | Course | Slug | Course code | Salesforce course | Price version | Effective | Fee | Upfront | Weekly | Count | Final | Reconciles |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 0 | Nail Technology Course | nail-technology-course | BELA_NAIL_TECHNOLOGY_COURSE | PC-000067 a0TRE00000w06hL2AQ | PCPV-000067 a0SRE00000BcXcn2AF | 2026-09-29 | 1920.00 | 10.00 | 20.00 | 96 | 10.00 | PASS |
| 1 | Lash Business Bundle | lash-business-bundle | BELA_LASH_BUSINESS_BUNDLE | PC-000066 a0TRE00000vVbUK2A0 | PCPV-000066 a0SRE00000BVnj32AD | 2026-09-23 | 2800.00 | 10.00 | 15.00 | 186 | — | PASS |
| 2 | Advanced Nail Bundle + Kits | advanced-nail-bundle | BELA_ADVANCED_NAIL_BUNDLE | PC-000068 a0TRE00000w0Fp82AE | PCPV-000068 a0SRE00000BcUeh2AF | 2026-09-29 | 3920.00 | 10.00 | 20.00 | 196 | 10.00 | PASS |
| 3 | Makeup Artistry Course | makeup-artistry-course | BELA_MAKEUP_ARTISTRY_COURSE | PC-000069 a0TRE00000w0Ke12AE | PCPV-000069 a0SRE00000BcUei2AF | 2026-09-29 | 2400.00 | 10.00 | 20.00 | 120 | 10.00 | PASS |
| 4 | Nail Bundle + Kits | nail-bundle | BELA_NAIL_BUNDLE | PC-000070 a0TRE00000w0HEm2AM | PCPV-000070 a0SRE00000Bcfa52AB | 2026-09-29 | 3080.00 | 10.00 | 20.00 | 154 | 10.00 | PASS |
| 5 | Hair Extension Course | hair-extension-course | BELA_HAIR_EXTENSION_COURSE | PC-000071 a0TRE00000w0Ymj2AE | PCPV-000071 a0SRE00000Bcfbh2AB | 2026-09-29 | 2640.00 | 10.00 | 20.00 | 132 | 10.00 | PASS |
| 6 | Hair Bundle + Kits | the-hair-business-bundle | BELA_THE_HAIR_BUSINESS_BUNDLE | PC-000072 a0TRE00000w0clS2AQ | PCPV-000072 a0SRE00000BcfdJ2AR | 2026-09-29 | 4704.00 | 10.00 | 20.00 | 235 | 14.00 | PASS |
| 7 | Brow Mastery Course | brow-mastery | BELA_BROW_MASTERY | PC-000073 a0TRE00000w0OVo2AM | PCPV-000073 a0SRE00000Bcfev2AB | 2026-09-29 | 2400.00 | 10.00 | 20.00 | 120 | 10.00 | PASS |
| 8 | Classic, Hybrid and Pre-made Volume Lash Course | classic-hybrid-pre-made-volume-lash-course | BELA_CLASSIC_HYBRID_PRE_MADE_VOLUME_LASH_COURSE | PC-000074 a0TRE00000w0eDp2AI | PCPV-000074 a0SRE00000BcfgX2AR | 2026-09-29 | 1440.00 | 10.00 | 20.00 | 72 | 10.00 | PASS |
| 9 | Nail Art Course | nail-art-course | BELA_NAIL_ART_COURSE | PC-000075 a0TRE00000w0MAj2AM | PCPV-000075 a0SRE00000Bcfi92AB | 2026-09-29 | 1440.00 | 10.00 | 20.00 | 72 | 10.00 | PASS |
| 10 | Waxing Mastery Bundle + Kits | waxing-mastery-bundle | BELA_WAXING_MASTERY_BUNDLE | PC-000076 a0TRE00000w0RgU2AU | PCPV-000076 a0SRE00000Bcfjl2AB | 2026-09-29 | 3520.00 | 10.00 | 20.00 | 176 | 10.00 | PASS |
| 11 | Manicure and Pedicure Course | manicure-and-pedicure-course | BELA_MANICURE_AND_PEDICURE_COURSE | PC-000077 a0TRE00000w0Pmk2AE | PCPV-000077 a0SRE00000BcflN2AR | 2026-09-29 | 1440.00 | 10.00 | 20.00 | 72 | 10.00 | PASS |
| 12 | Professional Hair Styling Course | professional-hair-styling-course | BELA_PROFESSIONAL_HAIR_STYLING_COURSE | PC-000078 a0TRE00000w0eww2AA | PCPV-000078 a0SRE00000Bcfmz2AB | 2026-09-29 | 2400.00 | 10.00 | 20.00 | 120 | 10.00 | PASS |
| 13 | Lash Lift and Tint Course | lash-lift-and-tint-course | BELA_LASH_LIFT_AND_TINT_COURSE | PC-000079 a0TRE00000w0Q032AE | PCPV-000079 a0SRE00000Bcfob2AB | 2026-09-29 | 1152.00 | 10.00 | 20.00 | 58 | 2.00 | PASS |
| 14 | Spray Tan Course | spray-tan-course | BELA_SPRAY_TAN_COURSE | PC-000080 a0TRE00000w0d3C2AQ | PCPV-000080 a0SRE00000BcfqD2AR | 2026-09-29 | 1760.00 | 10.00 | 20.00 | 88 | 10.00 | PASS |
| 15 | Mega Volume Lash Extension Course | mega-volume-lash-extension-course | BELA_MEGA_VOLUME_LASH_EXTENSION_COURSE | PC-000081 a0TRE00000w0LHt2AM | PCPV-000081 a0SRE00000Bcfrp2AB | 2026-09-29 | 1200.00 | 10.00 | 20.00 | 60 | 10.00 | PASS |
| 16 | Eyebrow Lamination Course | eyebrow-lamination-course | BELA_EYEBROW_LAMINATION_COURSE | PC-000082 a0TRE00000w0JBB2A2 | PCPV-000082 a0SRE00000BcftR2AR | 2026-09-29 | 1440.00 | 10.00 | 20.00 | 72 | 10.00 | PASS |
| 17 | Beauty Business Mastery: Scale to 10k Months | beauty-business-mastery-bbm | BELA_BEAUTY_BUSINESS_MASTERY_BBM | PC-000083 a0TRE00000w00aS2AQ | PCPV-000083 a0SRE00000Bcfv32AB | 2026-09-29 | 97.00 | 10.00 | 20.00 | 5 | 7.00 | PASS |
| 18 | GET MORE CLIENTS: Social Media Course | social-media-certificate | BELA_SOCIAL_MEDIA_CERTIFICATE | PC-000084 a0TRE00000w0crv2AA | PCPV-000084 a0SRE00000BcWLa2AN | 2026-09-29 | 299.00 | 10.00 | 20.00 | 15 | 9.00 | PASS |
| 19 | Certificate in Body Waxing | certificate-in-body-waxing | BELA_CERTIFICATE_IN_BODY_WAXING | PC-000085 a0TRE00000w0b7t2AA | PCPV-000085 a0SRE00000Bcfwf2AB | 2026-09-29 | 2400.00 | 10.00 | 20.00 | 120 | 10.00 | PASS |
| 20 | Russian Volume Lash Extension Course | russian-volume-lash-extension-course | BELA_RUSSIAN_VOLUME_LASH_EXTENSION_COURSE | PC-000086 a0TRE00000w0XsO2AU | PCPV-000086 a0SRE00000Bce2x2AB | 2026-09-29 | 1440.00 | 10.00 | 20.00 | 72 | 10.00 | PASS |
| 21 | Bridal Freelancer Bundle + Kits | bridal-and-events-freelancer-program | BELA_BRIDAL_AND_EVENTS_FREELANCER_PROGRAM | PC-000087 a0TRE00000w0QCr2AM | PCPV-000087 a0SRE00000BcflO2AR | 2026-09-29 | 2800.00 | 10.00 | 20.00 | 140 | 10.00 | PASS |
| 22 | Full Beauty Bundle + Kits | full-beauty-bundle | BELA_FULL_BEAUTY_BUNDLE | not created | not created | — | 9600.00 | 10.00 | 20.00 | 480 | 10.00 | BLOCKED over 400 |
| 23 | Beauty Therapist Bundle + Kits | certified-beauty-therapist-bundle | BELA_CERTIFIED_BEAUTY_THERAPIST_BUNDLE | PC-000088 a0TRE00000w0eaP2AQ | PCPV-000088 a0SRE00000BcfyH2AR | 2026-09-29 | 6800.00 | 10.00 | 20.00 | 340 | 10.00 | PASS |
| 24 | Lash & Brow Bundle + Kits | the-brow-and-lash-ceo-bundle | BELA_THE_BROW_AND_LASH_CEO_BUNDLE | PC-000089 a0TRE00000vzy772AA | PCPV-000089 a0SRE00000Bcfzt2AB | 2026-09-29 | 4704.00 | 10.00 | 20.00 | 235 | 14.00 | PASS |
| 25 | Nail Bundle | nail-bundle-kits-fblp | BELA_NAIL_BUNDLE_KITS_FBLP | PC-000090 a0TRE00000w0SmM2AU | PCPV-000090 a0SRE00000Bcg1V2AR | 2026-09-29 | 3080.00 | 10.00 | 20.00 | 154 | 10.00 | PASS |

## Slug reconciliation

Hosted slug equals Salesforce slug for every created course. No alternate slug was created from a website URL.

| Hosted slug | Salesforce slug | Notes |
| --- | --- | --- |
| nail-technology-course | nail-technology-course | Match |
| lash-business-bundle | lash-business-bundle | Website handle the-ultimate-lash-business-bundle, title Lash Bundle + Kits, selling price $2,880. StudentPay name and slug kept. |
| advanced-nail-bundle | advanced-nail-bundle | Match |
| makeup-artistry-course | makeup-artistry-course | Match |
| nail-bundle | nail-bundle | Distinct from nail-bundle-kits-fblp. Both sell at $3,080. |
| hair-extension-course | hair-extension-course | Match |
| the-hair-business-bundle | the-hair-business-bundle | Match |
| brow-mastery | brow-mastery | Match |
| classic-hybrid-pre-made-volume-lash-course | classic-hybrid-pre-made-volume-lash-course | Match |
| nail-art-course | nail-art-course | Match |
| waxing-mastery-bundle | waxing-mastery-bundle | Match |
| manicure-and-pedicure-course | manicure-and-pedicure-course | Match |
| professional-hair-styling-course | professional-hair-styling-course | Match |
| lash-lift-and-tint-course | lash-lift-and-tint-course | Match |
| spray-tan-course | spray-tan-course | Match |
| mega-volume-lash-extension-course | mega-volume-lash-extension-course | Match |
| eyebrow-lamination-course | eyebrow-lamination-course | Match |
| beauty-business-mastery-bbm | beauty-business-mastery-bbm | Match |
| social-media-certificate | social-media-certificate | Match |
| certificate-in-body-waxing | certificate-in-body-waxing | Match |
| russian-volume-lash-extension-course | russian-volume-lash-extension-course | Match |
| bridal-and-events-freelancer-program | bridal-and-events-freelancer-program | Match |
| full-beauty-bundle | — | Hosted listing only. Not created in Salesforce. |
| certified-beauty-therapist-bundle | certified-beauty-therapist-bundle | Match |
| the-brow-and-lash-ceo-bundle | the-brow-and-lash-ceo-bundle | Match |
| nail-bundle-kits-fblp | nail-bundle-kits-fblp | Website title Nail Bundle. Distinct from Nail Bundle + Kits. |

## Agreement gate

BELA_NZ Provider Student Agreement templates in Production: 0. Status remains DRAFT / NOT ACTIVE. One provider-level agreement is the intended model. Course name, fee, upfront, financed amount, frequency, regular instalment, count, and final instalment come from the course price version. They are not copied into 26 legal templates.

The current Salesforce template object stores static HTML and has no course-amount placeholders. The inactive hosted skeleton can describe plan fields, and checkout does not compose that skeleton into a live agreement. Until an approved Active agreement exists, the hosted catalogue can show the plan and enrolment confirmation stays fail-closed.

## API verification

GET https://api.studentpay.co.nz/v1/providers/BELA_NZ/courses with the injected BELA_NZ credential returned HTTP 403 Invalid API key. The credential was not printed or rotated. The Production API catalogue was not verified in this run.

## Commercial terms

PCT-00001 remains In_Force, calculation SHADOW, execution SHADOW, student fee NONE, fixed $0.40, percent 2.9%. The $60 establishment fee and $5 monthly account fee were not added to course prices. No opportunity was created on the Bela account on 29 September 2026.
