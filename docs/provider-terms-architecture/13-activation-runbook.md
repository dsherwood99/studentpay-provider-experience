# 13. Activation runbook

Do not start this sequence in the current run. The draft agreement is not Active. Payer treatment is not a Salesforce record. Provider charging stays SHADOW.

1. NZ legal review and Bela approval of the final wording, including Part A. Kit is still unresolved and must be decided or explicitly omitted.
2. Publish the final agreement version and seal its HTML hash. Leave it Draft until that approval exists.
3. Approve an effective date. Do not reuse a guessed date.
4. Activate the Bela payer-treatment policy only after the NZ Salesforce jobs read that same record for retry, add-to-end, the $2.50 fee, and the late fee.
5. Approve a separate LIVE transition for the $60 establishment fee and the $5 monthly account fee. Do not combine that with PCT-00001, and do not move PCT-00001 out of SHADOW as part of the same switch.
6. Confirm Vercel Production settings on `studentpay-nz-bela-enrolment`, including a dedicated `NZ_ENROLMENT_SESSION_SECRET`.
7. Merge PR #28 only after an approved Active Provider Student Agreement exists. Without it, Salesforce catalogue authority fail-closes the course route.
8. Production-deploy the dedicated Bela frontend only after that merge is intended.
9. Inspect-only QA of `/enrol/bela-nz/lash-business-bundle`. No student data.
10. After the dedicated hostname is verified, replace PIC success and cancel URLs. Until then they stay `https://api.studentpay.co.nz/enrol/bela-beauty/`.
11. Run one controlled Production certification enrolment.
12. Verify Salesforce, GoCardless, schedules, and the sealed agreement hash.
13. Neutralise the certification records in the established way.
14. Hand the provider the Active version, the effective date, and the support contacts.
