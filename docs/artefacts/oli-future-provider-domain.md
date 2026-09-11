# Future OLI provider-owned enrolment hostname

Do not execute this plan in the current change. `enrol.studentpay.co.nz` must
keep working.

## Recommended hostname

`enrol.onlinelearninginstitute.co.nz`

Why this name:

- Provider-owned visible domain
- Clear enrolment purpose
- Fits the existing OLI DNS zone
- Does not impersonate the main marketing site
- StudentPay still operates the checkout infrastructure

A path-only vanity such as `onlinelearninginstitute.co.nz/enrol/...` would
require changes on OLI’s own website and is out of scope.

## Target architecture

```
enrol.onlinelearninginstitute.co.nz
        CNAME → dedicated StudentPay OLI Vercel project
        TLS on Vercel
        same HOSTED_PRODUCT_MODE=nz_enrolment
        same NZ /v1 BFF
        same OLI PIC / provider key
        same Salesforce / GoCardless
```

Preferred public paths once the hostname is live:

```
https://enrol.onlinelearninginstitute.co.nz/{courseSlug}
https://enrol.onlinelearninginstitute.co.nz/          → catalogue fallback
```

Keep the current paths working on both hosts:

```
https://enrol.studentpay.co.nz/enrol/oli/{courseSlug}
https://enrol.onlinelearninginstitute.co.nz/enrol/oli/{courseSlug}
```

## Implementation sequence (later)

1. OLI creates a CNAME:
   `enrol.onlinelearninginstitute.co.nz` → the Vercel project CNAME target.
2. StudentPay adds the custom domain on the dedicated OLI Vercel project.
3. Wait for TLS issuance.
4. Review allowed hosts / origins:
   - `sameOriginOrConfigured` already uses the request `Host`
   - Session cookie is host-only, so the new hostname gets its own cookie
   - Set `NZ_ENROLMENT_PUBLIC_BASE_URL` only if GoCardless return URLs must be
     canonicalised to the provider hostname
   - Do not accept return URLs from the browser
5. Add a host-aware rewrite so `/{courseSlug}` maps to
   `/enrol/oli/{courseSlug}` on the provider hostname only. Do not enable this
   rewrite on `enrol.studentpay.co.nz`.
6. Keep `enrol.studentpay.co.nz` as a compatibility host (no redirect at first).
7. After OLI has updated course-page CTAs, optionally redirect
   `enrol.studentpay.co.nz/enrol/oli/{slug}` → the provider hostname.

## Rollback

- Remove the Vercel custom domain
- Leave `enrol.studentpay.co.nz` serving the same app
- PIC, keys, and `/v1` stay unchanged

## Security boundaries that must not change

- HttpOnly `sp_nz_enrolment_session`
- Checkout token never in the URL
- Provider API key server-side only
- CSRF origin check on mutating BFF routes
- Return-to-provider URLs remain allowlisted tenant configuration
