# 4. Authority matrix

| Choice | Layer | Object today | Object target | Checkout may show it | Runtime may enforce it |
| --- | --- | --- | --- | --- | --- |
| Establishment fee | A | Missing | Commercial terms, basis default None | No | Only when calculation mode is LIVE and basis is Per Activated Payment Plan |
| Transaction fee $0.40 + 2.9% | A | Commercial terms fixed + percent | Same fields | No | Only when calculation mode is LIVE. Bela is SHADOW |
| Retry enabled and delay | B | Missing. Schedule retry flag is not this choice | Payer treatment, default off | Only after runtime reads the same row | Not today |
| Catch-up collection | B | Attempt type Catch-up; variation `catch_up_arrangement` | Payer treatment value Catch-up Collection | Only when that value is Active and wired | Partial mechanism, no provider switch |
| Arrears added to end of plan | B | Not a picklist | New payer-treatment value | No until built | Not built |
| Payer failed-payment fee | B | Dishonour category and balance only | Payer treatment, default off | Only when enabled, amount set, and wired | Not as a provider policy |
| Late fee | B | Balance and suppress flag | Payer treatment, default off, no amount | Only when enabled, amount set, and wired | Not as a provider policy |
| Collections authority | B | Per-opportunity reason; variation treatment | Payer treatment, default Unset | Only when Authorised and wired | Not from a provider policy |
| Course access suspension | D, unless Bela makes it a StudentPay action | None | Leave in provider terms. Do not add a StudentPay field yet | No | Bela’s own access system, not this checkout |
| Course fee and schedule | C | Price version | Same | Yes, as price data | Canonical plan maths |
| Pay in Full | C | Course and PIC flags, both false for Bela | Same | Disabled | Not offered |
| Trading name, support, privacy | Presentation | PIC | Same | Yes | No |
| Legal name | Identity | Missing | Unresolved until the provider supplies it | Placeholder only | No |
| Provider enrolment terms | D | Provider’s own site. Not in Salesforce | Provider-owned document. Not copied into payment fields | Part A placeholder | Provider |
| Payment Plan Agreement and DDSA | E | Separate StudentPay documents and PPA snapshot | Unchanged | Existing legal endpoints | Existing acceptance snapshot |
| Jurisdiction | Version dimension | Missing | Template and payer treatment | Selects which prose version may be used | Does not change fees |
