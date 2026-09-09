import type { NzPublicTenant, NzTenant } from "./types.ts";

/**
 * Generic NZ Enrolment Checkout tenants.
 * Provider-specific behaviour belongs here as data, not in checkout UI.
 *
 * API host is resolved from NZ_STUDENTPAY_API_BASE_URL + STUDENTPAY_ENV.
 * Do not hardcode sandbox or production API URLs on the tenant object.
 */
export const NZ_TENANTS: readonly NzTenant[] = [
  {
    slug: "oli",
    providerCode: "OLI_NZ",
    displayName: "Online Learning Institute",
    legalName: "Online Learning Institute",
    supportEmail: "info@onlinelearninginstitute.com.au",
    supportPhone: "+61 3 7056 6605",
    privacyUrl: "https://onlinelearninginstitute.com.au/privacy-policy/",
    termsUrl: "https://onlinelearninginstitute.com.au/terms-conditions/",
    websiteUrl: "https://onlinelearninginstitute.com.au/",
    branding: {
      logoPath: "/nz-enrolment/oli/logo.png",
      primaryColour: "#004a59",
      accentColour: "#007cba",
      backgroundColour: "#ffffff",
      textColour: "#1c1c1c",
      fontFamily: 'Inter, "Segoe UI", sans-serif',
    },
    checkout: {
      paymentOptions: {
        interest_free_payment_plan: { enabled: true },
        pay_in_full: { enabled: false, comingSoon: true },
      },
      availableFrequencies: ["Weekly"],
      defaultFrequency: "Weekly",
      wording: {
        ddaLead:
          "You are setting up a Direct Debit authority with StudentPay NZ so instalments can be collected under your payment plan. This is not a card payment.",
        supportNote:
          "Questions about this enrolment can be sent to Online Learning Institute or StudentPay NZ support.",
      },
    },
    apiKeyEnv: "PROVIDER_API_KEY_OLI_NZ",
    active: true,
  },
  {
    slug: "fixture-institute",
    providerCode: "SANDBOX_DEMO",
    displayName: "Fixture Institute",
    legalName: "Fixture Institute (StudentPay sandbox tenant)",
    supportEmail: "partners@studentpay.co.nz",
    privacyUrl: "https://studentpay.co.nz/privacy",
    termsUrl: "https://studentpay.co.nz/terms",
    branding: {
      logoPath: "",
      primaryColour: "#8b79f1",
      accentColour: "#715fe2",
      backgroundColour: "#ffffff",
      textColour: "#161b1a",
      fontFamily: 'Inter, "Segoe UI", sans-serif',
    },
    checkout: {
      paymentOptions: {
        interest_free_payment_plan: { enabled: true },
        pay_in_full: { enabled: false, comingSoon: true },
      },
      availableFrequencies: ["Weekly", "Monthly"],
      minInstalments: 4,
      maxInstalments: 24,
      defaultFrequency: "Monthly",
    },
    apiKeyEnv: "SANDBOX_DEMO_API_KEY",
    active: true,
    sandboxOnly: true,
  },
];

function tenantVisible(tenant: NzTenant): boolean {
  if (!tenant.active) {
    return false;
  }
  if (tenant.sandboxOnly) {
    return process.env.STUDENTPAY_ENV?.trim().toLowerCase() === "sandbox";
  }
  return true;
}

export function getNzTenantBySlug(slug: string): NzTenant | undefined {
  const normalised = slug.trim().toLowerCase();
  const tenant = NZ_TENANTS.find((item) => item.slug === normalised);
  return tenant && tenantVisible(tenant) ? tenant : undefined;
}

export function getNzTenantByProviderCode(
  providerCode: string,
): NzTenant | undefined {
  const normalised = providerCode.trim().toUpperCase();
  const tenant = NZ_TENANTS.find((item) => item.providerCode === normalised);
  return tenant && tenantVisible(tenant) ? tenant : undefined;
}

export function listActiveNzTenants(): NzTenant[] {
  return NZ_TENANTS.filter(tenantVisible);
}

export function toPublicTenant(tenant: NzTenant): NzPublicTenant {
  return {
    slug: tenant.slug,
    displayName: tenant.displayName,
    legalName: tenant.legalName,
    supportEmail: tenant.supportEmail,
    supportPhone: tenant.supportPhone,
    privacyUrl: tenant.privacyUrl,
    termsUrl: tenant.termsUrl,
    websiteUrl: tenant.websiteUrl,
    branding: tenant.branding,
    checkout: {
      paymentOptions: tenant.checkout.paymentOptions,
      availableFrequencies: tenant.checkout.availableFrequencies,
      minInstalments: tenant.checkout.minInstalments,
      maxInstalments: tenant.checkout.maxInstalments,
      defaultFrequency: tenant.checkout.defaultFrequency,
      wording: tenant.checkout.wording,
    },
  };
}
