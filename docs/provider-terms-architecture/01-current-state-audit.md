# 1. Current state audit

Org inspected read-only: NZ Production `studentpaynz.my.salesforce.com`. Hosted repository: `studentpay-provider-experience` branch `cursor/bela-nz-production-foundation-8034`. The private `studentpay-nz-api` repository is not available to this agent, so Apex automation was not read. Runtime conclusions below come from object shape, field defaults, and the hosted checkout code.

## Provider Integration Config

`Provider_Integration_Config__c` is presentation and API enablement.

| Field | Type | Purpose | Used by | Authoritative for | Reusable | Gap |
| --- | --- | --- | --- | --- | --- | --- |
| `Provider_Code__c` | string | Provider code | API, hosted tenant | Provider identity | Yes | |
| `Brand_Name__c` | string | Trading / brand name | Checkout presentation | Trading name | Yes. Do not add a second trading-name field | Legal name is absent |
| `Support_Email__c` / `Support_Phone__c` | email / phone | Student support | Hosted provider config | Support contacts | Yes | |
| `Privacy_URL__c` | url | Provider privacy page | Hosted provider config | Privacy link | Yes | Not StudentPay privacy |
| `Provider_Success_URL__c` / `Provider_Cancel_URL__c` | url | Legacy return URLs | Existing Bela integration | Return URLs until a verified Bela hostname exists | Yes | Do not change yet |
| `Pay_In_Full_Enabled__c` | boolean, default false | Provider-level Pay in Full | Catalogue | Provider Pay in Full switch | Yes | Course flag also exists |
| `Environment__c` | Sandbox / Production | PIC environment | API | Environment | Yes | Not a legal jurisdiction |
| `API_Enabled__c` / `Active__c` | boolean, default true | API availability | API | Integration | Yes | |
| Colours, font, logo | string / url | Brand presentation | Hosted UI | Presentation | Yes | |

No PIC field stores retry, catch-up, payer fees, late fees, collections authority, legal name, jurisdiction, or provider terms URL.

### Production rows inspected

| PIC | Code | Brand | Environment | Pay in Full | Support | Privacy |
| --- | --- | --- | --- | --- | --- | --- |
| PIC-00001 | `BELA_NZ` | Bela Beauty College | Production | false | support@belabeautycollege.com / +64 9 888 6459 | https://belabeautycollege.com/policies/privacy-policy |
| PIC-00002 | `OLI_NZ` | Online Learning Institute | Production | true | info@onlinelearninginstitute.co.nz / 0800 454 872 | https://onlinelearninginstitute.co.nz/privacy-policy/ |

Bela success and cancel URLs remain `https://api.studentpay.co.nz/enrol/bela-beauty/`.

Account `001RE00000r7vKwYAI` is named Bela Beauty College. Billing country is empty. No custom Account field stores a legal name, NZBN, or jurisdiction.

## Course and price authority

`Provider_Course__c` and `Provider_Course_Price_Version__c` hold course identity and price. They are the correct home for course fee, upfront, frequency, regular instalment, instalment count, plan mode, and Pay in Full. There is no residual field. A residual is derived when upfront plus instalments do not equal the course fee.

Bela Production course `PC-000066`:

- Code `BELA_LASH_BUSINESS_BUNDLE`, slug `lash-business-bundle`, status Active, environment Production
- Catalogue key `BELA_NZ|BELA_LASH_BUSINESS_BUNDLE|lash-business-bundle|Production`
- Pay in Full false, payment plan true

Price version 1, Active, effective 2026-09-23, key `...|Production|1`:

- Payment-plan course fee $2,800.00
- Upfront $10.00
- Regular instalment $15.00
- Instalments 186
- Frequency Weekly
- Plan mode Derived Regular
- Pay in Full course fee stored as $2,800.00 while Pay in Full is disabled

Invariant: `$10 + (186 × $15) = $2,800`. Financed amount `$2,790` is course fee minus upfront. Residual: none.

## Provider commercial terms

`Provider_Commercial_Terms__c` is the provider settlement schedule. It is not the student payment schedule.

| Field | Default | Meaning |
| --- | --- | --- |
| `Fixed_Fee_Amount__c` | empty | Fixed component of the provider transaction fee |
| `Percent_Fee_Rate__c` | empty | Percent component of the provider transaction fee |
| `Student_Fee_Type__c` | `NONE` | Payer/student fee shape. Values: NONE, FIXED, PERCENTAGE, FIXED_PLUS_PERCENTAGE |
| `Student_Fee_Fixed__c` / `Student_Fee_Percent__c` | empty | Student fee amounts |
| `Student_Fee_Beneficiary__c` | empty | PROVIDER / STUDENTPAY / OFFSET |
| `Calculation_Mode__c` | OFF | OFF / SHADOW / LIVE |
| `Execution_Mode__c` | SHADOW | SHADOW / MANUAL / AUTO |
| `Status__c` | Draft | Draft / Scheduled / In_Force / Retired / Cancelled |
| `Manual_Approval_Required__c` | true | Settlement still needs approval |
| `Model__c` | LEGACY_MONTHLY | LEGACY_MONTHLY / NET_SETTLEMENT_V1 |

There is no establishment-fee field and no “per activated payment plan” basis.

One Production row exists: `PCT-00001`, account Bela Beauty College, not linked to PIC-00001.

- Status In_Force, calculation SHADOW, execution SHADOW, model NET_SETTLEMENT_V1
- Fixed fee $0.40, percent fee 2.9%, GST 15% inclusive on fee
- Student fee type NONE, student fixed $0.00, student percent 0
- Notes: production shadow canary, prospective only, do not go LIVE, do not AUTO, do not backfill, do not pay

That row matches the transaction-fee numbers in the new commercial structure and explicitly forbids charging. It does not authorise the $15 establishment fee. This run did not edit it.

`Provider_Settlement_Line__c` snapshots `Fixed_Fee_Amount__c`, `Percent_Fee_Rate__c`, and `Student_Fee_Amount__c` per line. Line types include PAYMENT and DISHONOUR. `Provider_Distribution__c` rolls up student-fee and provider-fee totals. Calculation defaults remain OFF or SHADOW.

## Agreement template and acceptance

`Provider_Student_Agreement_Template__c` stores static HTML and text. Status Draft / Active / Retired. Type picklist has only `Provider_Student_Agreement`. Fields: title, version, key, content hash, effective from/to, HTML, text. No jurisdiction, no structured payer settings, no placeholder map.

Production templates:

- `OLI_NZ` Active version `2025-12-23`, key `OLI_NZ|Production|Provider_Student_Agreement|2025-12-23`
- `BELA_NZ` count: 0

Accepted content is snapshotted elsewhere, which is the right immutability boundary:

- Opportunity: `Student_Agreement_HTML__c`, `Student_Agreement_Hash__c`, `Student_Agreement_Key__c`, `Student_Agreement_Title__c`, `Student_Agreement_Version__c`, `Student_Agreement_Template__c`, `Student_Agreement_Accepted_At__c`
- `Payment_Plan_Agreement__c`: `Agreement_HTML__c`, `Agreement_Version__c`, `Document_Hash__c`, `Accepted_At__c`, plus plan amount, instalments, frequency, provider code
- `Payment_Plan_Variation__c` also stores agreement HTML, version, and document hash for later variations

Hosted checkout parses the catalogue `provider_student_agreement` and fail-closes a Salesforce-authority course when title, version, key, hash, or usable HTML is missing. Confirmation sends the acceptance flag. The hosted app does not regenerate historical HTML from current PIC values.

## Operational payment objects

These are results and per-schedule flags, not provider policy.

| Object | Relevant fields | What they are |
| --- | --- | --- |
| `Charge_Schedule__c` | `Retry_Eligible__c` default true, `Auto_Collect__c` default true, `Suppress_Late_Fee__c` default false, `Payment_Category__c` default Course Fee | Schedule behaviour. Defaults already exist and were not changed |
| `Payment_Attempt__c` | `Is_Retry__c`, `Retry_Number__c`, `Attempt_Type__c` includes Standard, Retry, Catch-up, One-off Arrears | Attempt classification |
| `Payment_Allocation__c` | `Allocation_Type__c` includes Catch-up and Retry; `Allocation_Category__c` includes Late Fee and Dishonour Fee | Allocation classification |
| Opportunity | `Dishonour_Fees_To_Date__c`, `Late_Fees_To_Date__c`, `Late_Fee_Arrears__c`, `Catch_Up_Payment_Link__c`, `Reason_For_Collections_Management__c` | Balances and collections reason on a plan |
| `Payment_Plan_Variation__c` | `Variation_Type__c` includes `catch_up_arrangement`; `Catch_Up_Mode__c` is free text; `Collections_Treatment__c` None / Managed / Non-Performing | A variation of an existing plan |

No object stores “retry after 4 days”, a provider catch-up choice, a $2.50 failed-payment fee, a late-fee amount, or a late-fee trigger of 60 days. `Student_Fee_*` is a settlement student fee, not an end-of-plan dishonour fee. Do not reuse it for the $2.50 payer fee.

## Pre-existing Bela business records

The Bela account already had records before this architecture run. They were not created or edited here.

| Object | Count on the Bela account | Note |
| --- | --- | --- |
| Opportunity | 1 | Created 2026-08-13, stage Payment Plan Signed, amount $2,800 |
| Direct debit authorisation | 4 | Pre-existing |
| Payment attempt | 1 | Pre-existing |
| Charge schedule | 467 | Pre-existing |
| Payment plan agreement | 2 | Provider code BELA_NZ or Bela account |

## Hosted authority chain

```
NZ_HOSTED_TENANT_SLUG
  -> one tenant, or OLI when unset
NZ_CATALOGUE_AUTHORITY_{PROVIDER_CODE}
  -> legacy local fixture, or Salesforce catalogue
Salesforce course + price version
  -> plan maths
Salesforce provider_student_agreement
  -> required when authority is salesforce, else the route is unavailable
Checkout review
  -> shows the agreement HTML returned by the API
Confirm
  -> acceptance flag plus canonical /v1
Opportunity / Payment Plan Agreement
  -> stored HTML, version, hash
```

Retry, catch-up, failed-payment fee, late fee, collections, and provider commercial fees are not read by hosted checkout. Broken links:

| Choice | Salesforce authority | API contract in this repo | Operational behaviour | Agreement clause | Checkout | Acceptance record |
| --- | --- | --- | --- | --- | --- | --- |
| Course price | Price version | Catalogue payload | Canonical plan maths | Not in a Bela template | Local fixture plus overlay | PPA plan fields |
| Provider support / privacy | PIC | `provider_config` | Presentation only | Not templated | Shown when config parses | Not a fee |
| Provider student agreement | Static template | `provider_student_agreement` | None beyond display | Static HTML | Required for Salesforce-authority routes | Opportunity + template link |
| Transaction fee $0.40 + 2.9% | PCT-00001 shadow only | Not in hosted API | SHADOW, do not pay | Must not be a payer clause | Absent | Settlement snapshot fields exist |
| Establishment fee $15 | Missing | Missing | Not charged | Must not be a payer clause | Absent | Missing |
| Retry after 4 days | Missing provider field. Schedule `Retry_Eligible__c` defaults true | Missing | Unknown without Apex | Unsafe to promise | Absent | Attempt retry fields are results |
| Catch-up vs arrears at end | Mechanism exists. Provider choice does not | Missing | Catch-up attempt type exists. “Add to end” is not a picklist | Unsafe to promise | Absent | Variation records |
| Payer failed-payment fee | Category Dishonour Fee exists. Amount policy does not. Student fee is NONE | Missing | Must stay off | Unsafe to promise | Absent | `Dishonour_Fees_To_Date__c` is a balance |
| Late fee | Suppress flag and balance fields. No amount or 60-day rule | Missing | Must stay off | Unsafe to promise | Absent | `Late_Fees_To_Date__c` is a balance |
| Collections | Opportunity reason and variation treatment | Missing | Case by case | Unsafe to promise | Absent | Per opportunity |
| Jurisdiction | Missing | Missing | | AU draft must not be copied into NZ | | |
