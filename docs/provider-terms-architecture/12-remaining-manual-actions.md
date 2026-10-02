# 12. Remaining manual actions

1. Grant this agent, or a later implementation run, read/write access to the private `studentpay-nz-api` repository (the Salesforce package and NZ API). HTTP 404 from the Cursor GitHub credential is the current blocker.
2. In that package, add `Provider_Payer_Treatment__c` and the establishment / monthly account fee fields with defaults that leave every existing provider unchanged. Deploy through that repo’s release process. Keep the Bela row Draft until the jobs read it.
3. Wire retry (+4 days), add-to-end principal preservation, the $2.50 end-of-plan fee, and collections authority to that record. Do not activate a clause the job does not enforce.
4. Do not activate the monthly $15 late fee until last-business-day assessment can see an authoritative NZ holiday calendar. `ProviderNzBusinessDays` skips weekends only, and `Holiday` has no rows.
5. Leave PCT-00001 in SHADOW. Store $60 and $5 on new commercial fields without going LIVE, and without adding $0.40 + 2.9% to that model.
6. Decide the kit, or confirm it stays omitted. Approve an effective date.
7. NZ legal and Bela approval of the final wording before any agreement status becomes Active.
8. On Vercel project `studentpay-nz-bela-enrolment` Production, confirm:
   - `PROVIDER_API_KEY_BELA_NZ` already set by David. Do not rotate it.
   - `NZ_HOSTED_TENANT_SLUG=bela-nz`
   - `NZ_CATALOGUE_AUTHORITY_BELA_NZ=salesforce`
   - `HOSTED_PRODUCT_MODE=nz_enrolment`
   - `STUDENTPAY_ENV=production`
   - `NZ_STUDENTPAY_API_BASE_URL=https://api.studentpay.co.nz`
   - `NZ_ENROLMENT_SESSION_SECRET` dedicated, at least 16 characters, not the OLI secret. This agent cannot read the project (Vercel team SAML). Treat the secret as unconfirmed.
   - Leave unset: `STUDENTPAY_PROVIDER_CODE`, `PROVIDER_API_KEY_OLI_NZ`, `BELA_API_KEY`, `BELA_BEAUTY_SANDBOX_API_KEY`, and `NZ_ENROLMENT_PUBLIC_BASE_URL` until a Bela hostname is approved.
9. Do not merge PR #28 or PR #27.
10. Replace success and cancel URLs only after a verified Bela hostname exists.
