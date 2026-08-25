# Academy Australia Provider Experience

Academy Australia course discovery and enrolment experience, built with Next.js
and powered by StudentPay for flexible payment plans.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Criminal Psychology enrolment (OnFit wizard parity)

Primary route:

- [/providers/academy-australia/courses/criminal-psychology/enrol](/providers/academy-australia/courses/criminal-psychology/enrol)

Flow:

1. Course confirmation
2. Screening (citizenship + under-18 guardian)
3. Study Skills Check
4. Student dossier (address, USI, emergency contact, photo ID simulation)
5. Confirm and Pay — plan summary, deposit simulation, DDA (popup + embed fallback), terms modals, confirm enrolment

APIs:

- `POST /api/studentpay/provider-checkouts` — create checkout (mock or sandbox)
- `POST /api/studentpay/provider-checkout-confirm` — confirm enrolment after DDA
- `GET /api/studentpay/provider-checkouts` — configuration probe

Legacy alias route `/enrol/[providerSlug]/[courseSlug]` uses the same wizard.

## StudentPay env

```bash
STUDENTPAY_API_BASE_URL=https://sandbox-api.studentpay.com.au
STUDENTPAY_PROVIDER_API_KEY=         # sandbox API key
STUDENTPAY_PROVIDER_CODE=SANDBOX_DEMO
STUDENTPAY_PROVIDER_ACCOUNT_ID=0018r0000165S4mAAE
# HARNESS_MOCK_MODE=true             # optional local mock; unset/false uses sandbox when credentials are set
```

Never expose `STUDENTPAY_PROVIDER_API_KEY` with a `NEXT_PUBLIC_` prefix.

## Academy Australia production demo

A dedicated Vercel project (not this sandbox harness) binds to AU production:

- API: `https://api.studentpay.com.au`
- Provider code: `ACADEMYAU`
- Account: `001Mp00000tiKOOIA2`
- Key: `ACADEMYAU_API_KEY`

Do not set those production values on `studentpay-provider-experience`.

## Bela Beauty College production

A dedicated Vercel project (not this sandbox harness, and not the Academy
Australia production demo) should bind Bela production server-side:

```bash
STUDENTPAY_API_BASE_URL=https://api.studentpay.com.au
STUDENTPAY_PROVIDER_CODE=BELA
BELA_API_KEY=
STUDENTPAY_PROVIDER_ACCOUNT_ID=001Mp00000WkleDIAR
HARNESS_MOCK_MODE=false
```

- Provider slug: `bela-beauty-college`
- Provider code: `BELA`
- Catalogue source: `GET /v1/providers/BELA/courses` (Salesforce remains the gate)
- Proposed hostname: `https://bela.studentpay.com.au/providers/bela-beauty-college/courses`
- Do not set `BELA_BEAUTY_SANDBOX_API_KEY` on that production project
- Do not prefix `BELA_API_KEY` with `NEXT_PUBLIC_`
- `HARNESS_MOCK_MODE` is unused by the catalogue enrolment path; keep it `false` so the Academy wizard cannot mock-enrol on a Bela host

Salesforce `Hosted_Enrolment_Enabled__c` and `Catalogue_Enabled__c` still control whether courses appear. PE catalogue-capable configuration does not bypass those flags.

```bash
curl http://localhost:3000/api/studentpay/provider-checkouts
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm test
```
