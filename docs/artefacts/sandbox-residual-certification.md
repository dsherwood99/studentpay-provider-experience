# Sandbox residual certification notes

## Canonical `/v1` residual create — FAIL

Date: 2026-09-09. Sandbox API only. No confirm. No GoCardless completion.

Residual payload (`$1,834.25`, `74` instalments, regular `$25`, final `$9.25`) is rejected:

```
HTTP 400 VALIDATION_ERROR
Invalid provider checkout payload
```

The same client with an equal plan (`$1,200`, `48 × $25`) is accepted.

Conclusion: current certified `/v1` still enforces the equal-instalment invariant
`amount_to_finance = number_of_instalments × instalment_amount`.
`studentpay-nz-api` is not in this workspace and could not be changed here.

Unconfirmed equal probe created while proving the contrast (leave unused; do not confirm):

- checkout_id: `OLI_NZ-1788925648870-OLDJ8ATQ`
- opportunity_id: `006Bn00000PxHo1IAF`
- dda_id: `a0BBn000009OW81MAG`
- agreement: none
- setup_complete: false

Do not treat this as a residual canary. Do not mutate the authoritative hosted
certification canary `OLI_NZ-1788919323967-4ULLM8DN`.

## Salesforce schedule origination — Apex PASS

Sandbox org only. `ChargeScheduleOriginationServiceTest`: 20 tests, 0 failures.

The live origination service already:

- uses Opportunity Amount + `Value_of_Each_Instalment__c`
- treats `Number_of_Installments__c` as advisory
- creates a smaller final recurring instalment for leftovers ≥ $1.00
- folds leftovers below $1.00 into the previous instalment
- caps recurring schedules at 400

No OLI CSV residual is below $1.00. BEA103 residual is exactly $1.00 and is not folded.

`Last_Payment_Amount__c` exists on Opportunity but origination does not read it.

## Existing hosted canary — untouched

- Checkout `OLI_NZ-1788919323967-4ULLM8DN`
- Opportunity `006Bn00000PxAJVIA3` Amount 1200, 48 instalments
