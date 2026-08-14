# StudentPay Provider Experience

Provider-branded course discovery and enrolment for education providers, built with Next.js.

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

## Bela Beauty College NZ enrolment

Static provider-branded landing (NZ sandbox):

- [/enrol/bela-beauty/](/enrol/bela-beauty/)

Demo proxies under `/api/demos/bela-beauty/*` forward to StudentPay NZ with
`PROVIDER_API_KEY_BELA_NZ`. Direct debit setup and legal pages stay on
`https://sandbox-api.studentpay.co.nz`. See `public/enrol/bela-beauty/README.md`.

## StudentPay env

```bash
STUDENTPAY_API_BASE_URL=https://sandbox-api.studentpay.com.au
STUDENTPAY_PROVIDER_API_KEY=         # sandbox API key
STUDENTPAY_PROVIDER_CODE=SANDBOX_DEMO
STUDENTPAY_PROVIDER_ACCOUNT_ID=0018r0000165S4mAAE
# HARNESS_MOCK_MODE=true             # optional local mock; unset/false uses sandbox when credentials are set

# Bela Beauty NZ (separate from AU wizard credentials)
STUDENTPAY_NZ_API_BASE_URL=https://sandbox-api.studentpay.co.nz
PROVIDER_API_KEY_BELA_NZ=
```

Never expose `STUDENTPAY_PROVIDER_API_KEY` or `PROVIDER_API_KEY_BELA_NZ` with a `NEXT_PUBLIC_` prefix.

```bash
curl http://localhost:3000/api/studentpay/provider-checkouts
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```
