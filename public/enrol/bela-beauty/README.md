# Bela Beauty College — NZ enrolment landing

Provider-branded enrolment for **Lash Business Bundle** (no kit), hosted on
**StudentPay Provider Experience** and wired to the **StudentPay NZ sandbox**
Provider Checkout API v1.

## Live path

`/enrol/bela-beauty/` on the Provider Experience deployment.

Direct debit setup, legal terms, and JWT verification remain on:

`https://sandbox-api.studentpay.co.nz`

## What it does

1. Landing page for Bela Beauty College NZ students
2. Simplified single-page enrolment checkout:
   1. Select payment option
   2. Enter details
   3. Direct debit authority (plan) / pay-in-full note
   4. Review & confirm
3. Browser calls same-origin PE demo proxies (API key stays server-side):
   - `POST /api/demos/bela-beauty/checkout` → NZ `POST /v1/provider-checkouts`
   - `GET  /api/demos/bela-beauty/status` → course metadata or NZ checkout GET
   - `POST /api/demos/bela-beauty/confirm` → NZ `POST /api/provider-checkout-confirm`
4. Weekly plan → GoCardless NZ (`becs_nz`) via `direct_debit.setup_url` (NZ host)
5. Pay in full → creates an `upfront_payment` sandbox checkout (NZ card capture still pending on the API)

## Pricing (sandbox — Lash Business Bundle, no kit)

| Option | Amount |
|---|---|
| Pay in full | NZD $2,800 |
| Course total (plan) | NZD $2,800 |
| Initial account validation | NZD $10 (`pricing.upfront_payment` → `Upfront_Payment__c`) |
| Remaining financed | NZD $2,790 (`pricing.amount_to_finance`) |
| Weekly plan | NZD $15 × **186** weeks = $2,790 |

Contractual total = $10 + (186 × $15) = **$2,800** exactly.

## Requirements on Provider Experience

- `STUDENTPAY_NZ_API_BASE_URL=https://sandbox-api.studentpay.co.nz` (default)
- `PROVIDER_API_KEY_BELA_NZ` — API key for PIC-00002 (`BELA_NZ`)
- Salesforce Provider Integration Config **PIC-00002** active + API enabled
- Salesforce + GoCardless NZ sandbox ready

These are **separate** from the AU `STUDENTPAY_PROVIDER_API_KEY` used by the Academy EnrolmentWizard.

### Provider Integration Config (sandbox)

| Field | Value |
|---|---|
| Name | PIC-00002 |
| Provider code | **`BELA_NZ`** |
| Brand | Bela Beauty College |
| Environment | Sandbox |
| Primary / text | `#5A332B` |
| Accent | `#FBD2D3` |
| Background | `#FAF7F4` |
| Card | `#FFFFFF` |
| Font | `Arial, sans-serif` |

## Local preview

```bash
cp .env.example .env.local   # set PROVIDER_API_KEY_BELA_NZ
npm run dev
open http://localhost:3000/enrol/bela-beauty/
```
