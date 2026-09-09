import type { NzPublicTenant, NzTenant } from "./types.ts";

const NZ_SANDBOX_API = "https://sandbox-api.studentpay.co.nz";

/**
 * Generic NZ Enrolment Checkout tenants.
 * Provider-specific behaviour belongs here as data, not in checkout UI.
 *
 * OLI_NZ is a sandbox assignment. Production Salesforce has an Account named
 * Online Learning Institute (001RE00000kov0dYAA) but no PIC and no provider_code.
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
      availableFrequencies: ["Weekly", "Fortnightly", "Monthly"],
      minInstalments: 4,
      maxInstalments: 52,
      defaultFrequency: "Weekly",
      wording: {
        ddaLead:
          "You are setting up a Direct Debit authority with StudentPay NZ so instalments can be collected under your payment plan. This is not a card payment.",
        supportNote:
          "Questions about this enrolment can be sent to Online Learning Institute or StudentPay NZ support.",
      },
    },
    apiKeyEnv: "PROVIDER_API_KEY_OLI_NZ",
    apiBaseUrl: NZ_SANDBOX_API,
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
    apiBaseUrl: NZ_SANDBOX_API,
    active: true,
  },
];

export function getNzTenantBySlug(slug: string): NzTenant | undefined {
  const normalised = slug.trim().toLowerCase();
  return NZ_TENANTS.find((tenant) => tenant.slug === normalised && tenant.active);
}

export function getNzTenantByProviderCode(
  providerCode: string,
): NzTenant | undefined {
  const normalised = providerCode.trim().toUpperCase();
  return NZ_TENANTS.find(
    (tenant) => tenant.providerCode === normalised && tenant.active,
  );
}

export function listActiveNzTenants(): NzTenant[] {
  return NZ_TENANTS.filter((tenant) => tenant.active);
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
