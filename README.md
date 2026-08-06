# StudentPay Provider Experience

Provider-branded course discovery and enrolment for education providers, built with Next.js.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Enrolment modes

| Route | Mode | Behaviour |
| --- | --- | --- |
| `/enrol/[providerSlug]/[courseSlug]` | Demo | LocalStorage-only wizard. No StudentPay API calls. |
| `/providers/[providerSlug]/courses/[courseSlug]/enrol` | Sandbox | Reuses the same wizard UI and creates a real StudentPay sandbox checkout. |

Primary sandbox target:

- [/providers/academy-australia/courses/criminal-psychology/enrol](/providers/academy-australia/courses/criminal-psychology/enrol)

On successful sandbox submit the browser is redirected to the returned `direct_debit.setup_url` (StudentPay DD setup).

## StudentPay sandbox env

Configure these server-side only (already set on Vercel):

```bash
STUDENTPAY_API_BASE_URL=https://sandbox-api.studentpay.com.au
STUDENTPAY_PROVIDER_API_KEY=         # sandbox SANDBOX_DEMO_API_KEY
STUDENTPAY_PROVIDER_CODE=SANDBOX_DEMO
STUDENTPAY_PROVIDER_ACCOUNT_ID=0018r0000165S4mAAE
```

Never expose `STUDENTPAY_PROVIDER_API_KEY` with a `NEXT_PUBLIC_` prefix.

Check configuration:

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
