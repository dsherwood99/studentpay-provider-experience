# 6. Commercial schedule, runtime, and agreement

| Commercial or payer choice | Salesforce today | API in this repo | Operational behaviour | Agreement effect now | Safe to activate |
| --- | --- | --- | --- | --- | --- |
| Establishment fee $15 per activated payment plan | Field missing. Not on PCT-00001 | None | Not charged | Omitted from the student skeleton | No |
| Transaction fee $0.40 + 2.9% of each payment attempt | PCT-00001 fixed $0.40 and percent 2.9, mode SHADOW, student fee NONE | None in hosted checkout | Shadow canary notes forbid LIVE, AUTO, backfill, and pay | Omitted. Not a payer charge | No |
| Retry after 4 days | No provider field. `Retry_Eligible__c` already defaults true on schedules | None | Not changed | Placeholder UNSET. A yes/no clause would be agreement-only | No |
| Catch-up collection | Attempt type `Catch-up`; variation type `catch_up_arrangement` | None | Existing plans can already record catch-up attempts. No provider default was changed | Placeholder UNSET | No |
| No catch-ups; add arrears to the end | Not a picklist value | None | Not implemented as a named treatment | Placeholder UNSET | No |
| Payer failed-payment fee $2.50 at end of plan | Dishonour category exists. No $2.50 policy. Student fee on PCT-00001 is NONE | None | Not enabled | OFF in the skeleton | No |
| Late fee, last business day, more than 60 days in arrears | Balance fields exist. No amount, no 60-day rule, no cadence field | None | Not enabled. Amount was not assumed | OFF in the skeleton | No |
| External collections | Per-plan reason only | None | Not a provider switch | UNSET | No |
| Course schedule $10 + 186 × $15 = $2,800 | Active price version | Catalogue when the API is called with the provider key | Canonical maths. Hosted fixture matches | Shown as price data, not as an activated clause | Price is already Active. Agreement text is not |
| Pay in Full | Course and PIC false | Hosted option list is payment plan only | Not offered | Stated as disabled price data | Already the live course setting |
| Support phone, email, privacy URL | PIC-00001 | `provider_config` | Presentation | Included as contact facts | Already stored. Not a substitute for the agreement |

`AGREEMENT_ONLY_CONFIGURATION_NOT_SAFE` applies to every payer-treatment line until Apex reads `Provider_Payer_Treatment__c` and the accepted agreement hash is the same version.
