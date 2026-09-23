# 3. Data model

Prefer existing fields. New fields below are specified for the Salesforce package. They were not deployed. See [11-deployment-evidence.md](11-deployment-evidence.md).

## Reuse without new fields

| Concept | Authority |
| --- | --- |
| Trading name | `Provider_Integration_Config__c.Brand_Name__c` |
| Support email, phone, privacy URL | PIC fields already populated for Bela |
| Pay in Full provider switch | `Pay_In_Full_Enabled__c`, default false |
| Course fee, upfront, frequency, regular instalment, count, plan mode | `Provider_Course_Price_Version__c` |
| Course Pay in Full | `Provider_Course__c.Pay_In_Full_Enabled__c` |
| Transaction fee fixed + percent | `Provider_Commercial_Terms__c.Fixed_Fee_Amount__c` and `Percent_Fee_Rate__c` |
| Student settlement fee, default none | `Student_Fee_Type__c` = NONE |
| Charge switch | `Calculation_Mode__c` default OFF; Bela row is SHADOW |
| Accepted HTML / hash / version | Opportunity student-agreement fields and `Payment_Plan_Agreement__c` |
| Static template | `Provider_Student_Agreement_Template__c` until a generator exists in the API |

## Do not reuse for a different meaning

| Existing field | Why it is the wrong place |
| --- | --- |
| `Student_Fee_*` | Settlement student fee on a commercial line. Not a $2.50 end-of-plan dishonour fee |
| `Charge_Schedule__c.Retry_Eligible__c` | Per-schedule flag, default true. Not a provider “retry after 4 days” choice |
| `Suppress_Late_Fee__c` | Per-schedule suppression, default false. Not a provider late-fee product |
| Opportunity dishonour and late-fee balances | Results, not configuration |
| `Catch_Up_Mode__c` | Unconstrained text on a variation. Not a provider enum |

## Proposed object: `Provider_Payer_Treatment__c`

Layer B. One versioned row per provider. No row means current behaviour.

| API name | Label | Type | Default | Help |
| --- | --- | --- | --- | --- |
| `Provider_Integration_Config__c` | Provider Integration Config | Lookup | required | Owning provider |
| `Status__c` | Status | Picklist Draft / Active / Retired | Draft | Inactive until explicitly activated |
| `Jurisdiction__c` | Jurisdiction | Picklist AU / NZ | empty | Legal version dimension. Empty does not imply either country |
| `Retry_Enabled__c` | Retry Enabled | Checkbox | false | When false, do not add a new retry policy. Does not flip existing `Retry_Eligible__c` |
| `Retry_Delay_Days__c` | Retry Delay Days | Number | empty | Only read when retry is enabled |
| `Catch_Up_Treatment__c` | Catch-up Treatment | Picklist Unset / Catch-up Collection / Arrears Added To End | Unset | “Arrears Added To End” is new. It is not a current attempt-type |
| `Failed_Payment_Fee_Enabled__c` | Failed Payment Fee Enabled | Checkbox | false | Payer fee. Distinct from provider transaction fees |
| `Failed_Payment_Fee_Amount__c` | Failed Payment Fee Amount | Currency | empty | Required before enablement can activate |
| `Failed_Payment_Fee_Collection__c` | Failed Payment Fee Collection | Picklist Unset / End of Plan | Unset | |
| `Late_Fee_Enabled__c` | Late Fee Enabled | Checkbox | false | |
| `Late_Fee_Amount__c` | Late Fee Amount | Currency | empty | No default amount |
| `Late_Fee_Trigger_Days__c` | Late Fee Trigger Days | Number | empty | No default of 60 until approved |
| `Late_Fee_Assessment__c` | Late Fee Assessment | Picklist Unset / Last Business Day of Month | Unset | |
| `Collections_Authority__c` | Collections Authority | Picklist Unset / Authorised / Not Authorised | Unset | |
| `Effective_From__c` | Effective From | Date | required on activate | |
| `Content_Hash__c` | Content Hash | Text | set when a template version is published | Ties treatment to the agreement version |

Consumers, once the API package exists: agreement generator, retry job, catch-up job, dishonour-fee job, late-fee job. Until those jobs read this object, status stays Draft.

Migration: existing providers get no row. Absence equals retry policy unchanged, payer fees off, catch-up choice unset, collections unset.

## Proposed fields on `Provider_Commercial_Terms__c`

Layer A. Do not copy onto PIC.

| API name | Label | Type | Default | Help |
| --- | --- | --- | --- | --- |
| `Establishment_Fee_Amount__c` | Establishment Fee Amount | Currency | empty | Provider charge per activated payment plan. Not a payer charge. Bela decision: $60.00, not LIVE |
| `Establishment_Fee_Basis__c` | Establishment Fee Basis | Picklist None / Per Activated Payment Plan | None | None charges nothing |
| `Monthly_Account_Fee_Amount__c` | Monthly Account Fee Amount | Currency | empty | Provider charge per activated account per month. Not a payer charge. Bela decision: $5.00, not LIVE |
| `Monthly_Account_Fee_Basis__c` | Monthly Account Fee Basis | Picklist None / Per Activated Account Month | None | None charges nothing |

Existing `Fixed_Fee_Amount__c` and `Percent_Fee_Rate__c` remain on PCT-00001 as a shadow canary ($0.40 + 2.9%). They are not part of the approved $60 + $5 model and were not copied onto it. `Calculation_Mode__c` stays the charging switch. New fee fields default to None or empty, so a schema deploy would charge nothing. These fields are specified here and are not deployed. Bela `PCT-00001` stays SHADOW.

## Proposed fields on the agreement template

| API name | Label | Type | Default | Help |
| --- | --- | --- | --- | --- |
| `Jurisdiction__c` | Jurisdiction | Picklist AU / NZ | empty | Required before a new version can become Active |
| `Source_Kind__c` | Source Kind | Picklist Static HTML / Structured Skeleton | Static HTML | Existing OLI row stays Static HTML |
| `Payer_Treatment__c` | Payer Treatment | Lookup | empty | Treatment version sealed into this agreement version |

Legal name is not invented on PIC. Until a provider supplies it, the skeleton uses an unresolved token. Account.Name for Bela equals the trading name and is not, by itself, evidence of the registered legal name.

Provider enrolment terms (cooling-off, kit, access length) stay outside payment-treatment fields. A URL may later be stored as `Provider_Terms_URL__c` on the template or PIC, default empty, and only as a link to the provider’s own document.

## Backwards compatibility

- No default turns `Student_Fee_Type__c` from NONE to another value.
- No default sets `Calculation_Mode__c` to LIVE.
- No default creates a payer fee for OLI or any other provider.
- `Retry_Eligible__c` on existing charge schedules is left as it is.
- OLI’s Active agreement template is not rewritten.
