# 9. Migration and backwards compatibility

## Defaults that preserve today

- No `Provider_Payer_Treatment__c` row is created for any provider.
- Payer failed-payment fee and late fee default off. Amounts stay empty.
- Retry and catch-up provider choices default unset. Existing `Retry_Eligible__c` values are not updated.
- `Student_Fee_Type__c` stays NONE unless a commercial record already says otherwise. The only Production commercial row is already NONE.
- Establishment-fee basis, when the field exists, defaults to None.
- `Calculation_Mode__c` is not moved to LIVE. Bela PCT-00001 stays SHADOW.
- OLI’s Active agreement template, Pay in Full flag, and courses are not edited.
- Bela success and cancel URLs are not edited.
- Hosted checkout still reads Salesforce agreement HTML. It does not compose the skeleton at request time.
- `NZ_HOSTED_TENANT_SLUG` behaviour is unchanged. Unset still resolves to OLI. `bela-nz` still resolves only Bela on that deployment.

## What would be a breaking change, and is not in this change

- Activating a Bela agreement built from website text or the AU draft.
- Enabling a payer fee because a field now exists.
- Treating the shadow $0.40 + 2.9% row as a live charge.
- Rewriting historical Opportunity or Payment Plan Agreement HTML from current settings.
- Merging PR #28, which would ship the hosted app toward Production projects.
- Pointing the Bela host at OLI when the tenant slug is missing. The dedicated-host rejection already prevents that when the slug is set to an unknown value, and a `bela-nz` slug does not fall through.

## Hosted code added

The new module is generic. The Bela fixture is data for the inactive artefact and tests. Confirm and catalogue routes do not import it.
