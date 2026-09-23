# 6. Commercial schedule, runtime, and agreement

| Commercial or payer choice | Salesforce today | API in this repo | Operational behaviour | Agreement effect now | Safe to activate |
| --- | --- | --- | --- | --- | --- |
| Establishment fee $60 per activated payment plan | Field missing. Not on PCT-00001 | None | Not charged. Not LIVE | Omitted from the student skeleton | No |
| Monthly account fee $5 per activated account | Field missing | None | Not charged. Not LIVE | Omitted from the student skeleton | No |
| Shadow canary $0.40 + 2.9% | PCT-00001, mode SHADOW, student fee NONE | None in hosted checkout | Left SHADOW. Not combined with $60 + $5 | Omitted. Not a payer charge | No |
| Retry after 4 days | No provider field. `Retry_Eligible__c` already defaults true on schedules | None | Not changed. Existing schedules were not retimed | Draft skeleton states 4 days and marks the line agreement-only | No |
| Catch-up collection | Attempt type `Catch-up`; variation type `catch_up_arrangement` | None | Existing catch-up processor was not retargeted | Bela draft says no automatic catch-up | No |
| Add arrears to the end | Not a picklist value | None | Not implemented in Apex from this repo | Draft skeleton states the policy. Principal-preservation job is not deployed | No |
| Payer failed-payment fee $2.50 at end of plan | Dishonour category exists. No $2.50 policy. Student fee on PCT-00001 is NONE | None | Not enabled | Draft skeleton discloses $2.50, end of plan, agreement-only | No |
| Late fee $15, more than 60 days, last business day | Balance fields exist. `ProviderNzBusinessDays` skips weekends only. `Holiday` has 0 rows | None | Not enabled | Draft skeleton discloses the rule. Monthly job is not activated | No |
| External collections | Per-plan reason only | None | Flag does not exist, so nothing new is referred | Draft skeleton authorises facilitation only, not automatic referral | No |
| Course-access suspension | None | None | No StudentPay suspension job | Draft skeleton: provider-controlled | No |
| Course schedule $10 + 186 × $15 = $2,800 | Active price version | Catalogue when the API is called with the provider key | Canonical maths. Hosted fixture matches | Shown as price data, not as an activated clause | Price is already Active. Agreement text is not |
| Pay in Full | Course and PIC false | Hosted option list is payment plan only | Not offered | Stated as disabled price data | Already the live course setting |
| Support phone, email, privacy URL | PIC-00001 | `provider_config` | Presentation | Included as contact facts | Already stored. Not a substitute for the agreement |

`AGREEMENT_ONLY_CONFIGURATION_NOT_SAFE` applies to every payer-treatment line until Apex reads `Provider_Payer_Treatment__c` and the accepted agreement hash is the same version.
