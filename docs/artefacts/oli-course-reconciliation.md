# OLI course reconciliation

Source: `data/oli/2608-course-list-and-fees.csv`.

Canonical launch `course_price` = Payment Plan Course Fee.
Payment-plan upfront = $0.00. Regular weekly instalment = $25.00.
CSV column **Upfront Payment of Course Fee** is Payment in Full of Course Fees, not a payment-plan deposit.

CSV **Number of Installments** is the count of full $25 instalments (not including a residual row).
Derived **TOTAL_INSTALMENTS** = full $25 rows + 1 residual when remainder > 0.

Duplicate CSV course codes TRA101–TRA104 are preserved as supplied (Personal Training vs Trades).
Hosted slugs are unique course names. Course codes were not invented.

- OLI_COURSE_COUNT = 64
- UNIQUE_COURSE_CODES = 60 (FAIL: TRA101–TRA104 reused)
- CATEGORIES = 10
- MIN_PAYMENT_IN_FULL_PRICE = $1,604.25
- MAX_PAYMENT_IN_FULL_PRICE = $4,134.25
- MIN_PAYMENT_PLAN_PRICE = $1,834.25
- MAX_PAYMENT_PLAN_PRICE = $5,175.00
- MIN_TOTAL_INSTALMENTS = 74
- MAX_TOTAL_INSTALMENTS = 207
- COURSES_WITH_RESIDUAL = 62
- COURSES_EXACTLY_DIVISIBLE_BY_25 = 2
- OLI_ALL_64_COURSES_RECONCILE = PASS

| COURSE_CODE | COURSE | PAYMENT_IN_FULL_PRICE | PAYMENT_PLAN_PRICE | REGULAR_WEEKLY | FULL_REGULAR_INSTALMENTS | FINAL_RESIDUAL | TOTAL_INSTALMENTS | TOTAL_RECONCILED |
|---|---|---:|---:|---:|---:|---:|---:|---|
| PSY101 | Certificate in Psychology & Counselling | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| PSY102 | Certificate in Disability Support | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| PSY103 | Certificate in Development & Behavioural Support | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| PSY104 | Certificate in Aged Care & Counselling | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| PSY105 | Certificate in Health & Wellbeing | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| PSY106 | Certificate in Family Wellbeing | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| PSY107 | Certificate in Mental Health | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| PSY108 | Certificate in Life Coaching | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| PSY109 | Certificate in Child Psychology & Counselling | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| PSY110 | Certificate in Stress Management & Emotional Intelligence | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| PSY111 | Certificate in Offender Rehabilitation | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| PSY112 | Certificate in Criminal Psychology | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| PSY113 | Diploma in Psychology & Counselling | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| PSY114 | Diploma in Aged Care & Disability Support | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| PSY115 | Diploma in Child & Youth Counselling | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| PSY116 | Diploma in Health Care & Wellbeing | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| BEA101 | Manicure & Pedicure, Nail Technology | $3,214.25 | $4,025.00 | $25.00 | 161 | — | 161 | PASS |
| BEA102 | Manicure & Pedicure, Nail Technology, Nail Art & Design | $4,134.25 | $5,175.00 | $25.00 | 207 | — | 207 | PASS |
| BEA103 | Eyelash Business Bundle + Kit | $2,984.25 | $3,726.00 | $25.00 | 149 | $1.00 | 150 | PASS |
| BEA104 | Brow Mastery Course + Deluxe Kit | $2,409.25 | $3,105.00 | $25.00 | 124 | $5.00 | 125 | PASS |
| BEA105 | Makeup Artistry + Standard Kit | $2,409.25 | $3,105.00 | $25.00 | 124 | $5.00 | 125 | PASS |
| ADM101 | Certificate in Business Administration | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| ADM102 | Certificate in Reception & Office Support | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| ADM103 | Certificate in Medical Reception & Office Support | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| ADM104 | Certificate in Legal Reception & Office Support | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| ADM105 | Diploma in Business Administration | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| BUS101 | Certificate in Small Business Management | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| BUS102 | Small Business Startup Program | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| BUS103 | Diploma in Business | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| MAR101 | Certificate in Digital Marketing | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| MAR102 | Certificate in Sales Skills | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| MAR103 | Diploma in Sales & Team Leadership | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| MAR104 | Diploma in Digital Marketing Management | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| MAN101 | Certificate in Management Fundamentals | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| MAN102 | Certificate in Human Resource Management | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| MAN103 | Certificate in Workplace Health & Safety Management | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| MAN104 | Certificate in Business Operations Management | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| MAN105 | Diploma in Business Operations Management | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| MAN106 | Diploma in Human Resource Management & Leadership | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| MAN107 | Diploma in Management & Team Leadership | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| MAN108 | Diploma in Project Management & Team Leadership | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| TRA101 | Certificate in Personal Training | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| TRA102 | Certificate in Health & Wellness Coaching | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| TRA103 | Certificate in Nutrition & Weight Management | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| TRA104 | Diploma in Personal Training & Nutrition Coaching | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| ANI101 | Certificate in Animal Grooming | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| ANI102 | Certificate in Animal Care & Welfare | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| ANI103 | Certificate in Dog Training, Psychology & Behaviour | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| ANI104 | Certificate in Horse Care & Breeding | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| ANI105 | Certificate in Pet Therapy & Companion Animal Care | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| ANI106 | Diploma in Veterinary Assistance & Animal Health | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| ANI107 | Diploma in Wildlife Conservation & Management | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| ANI108 | Diploma in Zoology & Wildlife Management | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| HOS101 | Certificate in Events Management | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| HOS102 | Certificate in Events Management & Wedding Planning | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| HOS103 | Certificate in Hospitality Operations | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| HOS104 | Diploma in Hospitality Management | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| HOS105 | Diploma in Hotel Operations Management | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| HOS106 | Diploma in Travel & Tourism Management | $3,444.25 | $4,249.25 | $25.00 | 169 | $24.25 | 170 | PASS |
| TRA101 | Certificate in Carpentry & Construction Skills | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| TRA102 | Certificate in Mechanics & Machine Systems | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| TRA103 | Certificate in Small Equipment & Appliance Repair | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| TRA104 | Certificate in Electronics & Electrical Fundamentals | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
| TRA105 | Certificate in Computer-Aided Design (CAD) | $1,604.25 | $1,834.25 | $25.00 | 73 | $9.25 | 74 | PASS |
