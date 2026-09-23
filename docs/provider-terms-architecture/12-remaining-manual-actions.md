# 12. Remaining manual actions

1. Answer the decision sheet in [08-bela-decision-sheet.md](08-bela-decision-sheet.md). Do not treat the AU draft or the public website as the answers.
2. Have NZ legal and Bela approve Part A and Part B before any template status is set to Active.
3. Deploy `Provider_Payer_Treatment__c` and the establishment-fee fields through the NZ Salesforce package, with defaults off, and wire the jobs before any clause is activated.
4. Leave PCT-00001 in SHADOW. Do not turn calculation mode LIVE in order to “record” the $15 fee.
5. On Vercel project `studentpay-nz-bela-enrolment` Production, confirm these values are set. This agent cannot read the project (team SAML blocks the token):
   - `PROVIDER_API_KEY_BELA_NZ` — already entered by David. Do not rotate it.
   - `NZ_HOSTED_TENANT_SLUG=bela-nz` — already entered by David.
   - `NZ_CATALOGUE_AUTHORITY_BELA_NZ=salesforce` — already entered by David.
   - `NZ_ENROLMENT_SESSION_SECRET` — dedicated Production secret, at least 16 characters, not the OLI secret. Still a manual action if it was not added.
   - `HOSTED_PRODUCT_MODE=nz_enrolment`
   - `STUDENTPAY_ENV=production`
   - `NZ_STUDENTPAY_API_BASE_URL=https://api.studentpay.co.nz`
   - Leave unset: `STUDENTPAY_PROVIDER_CODE`, `PROVIDER_API_KEY_OLI_NZ`, `BELA_API_KEY`, `BELA_BEAUTY_SANDBOX_API_KEY`, and `NZ_ENROLMENT_PUBLIC_BASE_URL` until a Bela hostname is approved.
6. Do not merge PR #28 until the Provider Student Agreement path is an approved Active template. With Salesforce catalogue authority, a missing agreement makes `/enrol/bela-nz/lash-business-bundle` unavailable.
7. Do not merge PR #27.
8. After a dedicated Bela hostname is verified, replace PIC success and cancel URLs with same-checkout return URLs. They are still `https://api.studentpay.co.nz/enrol/bela-beauty/`.
