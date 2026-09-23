import oliWebsiteSlugs from "./catalogues/oli-website-slugs.json" with { type: "json" };
import {
  configuredNzHostedTenantSlug,
  isInternalE13CanaryHostedEnabled,
} from "./environment.ts";
import { defaultPresentation } from "./presentation.ts";
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
    supportEmail: "info@onlinelearninginstitute.co.nz",
    supportPhone: "0800 454 872",
    privacyUrl: "https://onlinelearninginstitute.co.nz/privacy-policy/",
    termsUrl: "https://onlinelearninginstitute.co.nz/terms-conditions/",
    websiteUrl: "https://onlinelearninginstitute.co.nz/",
    branding: {
      logoPath: "/nz-enrolment/oli/logo.png",
      footerLogoPath: "/nz-enrolment/oli/footer-logo.png",
      primaryColour: "#3a8f8f",
      secondaryColour: "#65bec2",
      accentColour: "#2c67c9",
      backgroundColour: "#f9f7f3",
      surfaceColour: "#ffffff",
      headingColour: "#1c1c1c",
      mutedTextColour: "#515151",
      textColour: "#1c1c1c",
      fontFamily: 'Inter, "Segoe UI", sans-serif',
      headingFontFamily: 'var(--font-nz-heading), Montserrat, Inter, sans-serif',
      ctaColour: "#2f7474",
      buttonRadius: "medium",
      headerStyle: "provider-native",
      footerStyle: "provider-native",
    },
    presentation: defaultPresentation({
      allowedHosts: [
        "onlinelearninginstitute.co.nz",
        "www.onlinelearninginstitute.co.nz",
      ],
      returnToProviderUrl: "https://onlinelearninginstitute.co.nz/",
      returnToProviderLabel: "Return to Online Learning Institute",
      courseUrlPattern: "https://onlinelearninginstitute.co.nz/course/{courseSlug}/",
      knownCourseWebsiteSlugs: oliWebsiteSlugs as string[],
      headerLayout: "site",
      headerPhone: "+64 9 870 8980",
      headerPhoneTel: "+6498708980",
      headerContextLabel: "Enrolment",
      headerSearchUrl: "https://onlinelearninginstitute.co.nz/",
      headerSearchPlaceholder: "Search …",
      headerPhoneIconSrc: "/nz-enrolment/oli/phone-icon-white.png",
      headerSearchIconSrc: "/nz-enrolment/oli/iconamoon_search.png",
      headerSocialLinks: [
        {
          label: "Facebook",
          href: "https://www.facebook.com/profile.php?id=61587451054794",
          network: "facebook",
          iconSrc: "/nz-enrolment/oli/fb-icon.png",
        },
        {
          label: "Instagram",
          href: "https://www.instagram.com/oli_onlinelearninginstitute/",
          network: "instagram",
          iconSrc: "/nz-enrolment/oli/instagram-icon.png",
        },
        {
          label: "TikTok",
          href: "https://www.tiktok.com/@onlinelearninginstitute",
          network: "tiktok",
          iconSrc: "/nz-enrolment/oli/tiktok-icon.png",
        },
      ],
      headerLinks: [
        { label: "Home", href: "https://onlinelearninginstitute.co.nz/" },
        { label: "About Us", href: "https://onlinelearninginstitute.co.nz/about/" },
        {
          label: "Find My Course",
          href: "https://onlinelearninginstitute.co.nz/find-my-course-quiz/",
        },
        { label: "Courses", href: "https://onlinelearninginstitute.co.nz/courses/" },
        { label: "Contact", href: "https://onlinelearninginstitute.co.nz/contact/" },
        { label: "FAQs", href: "https://onlinelearninginstitute.co.nz/faq/" },
      ],
      footerTagline:
        "With over 10 years experience supporting students across New Zealand",
      footerContactHeading: "Get in Touch",
      footerRegion: "New Zealand",
      footerAddressLines: [
        "Ground Floor",
        "26A Hobson Street",
        "Auckland Central 1010",
      ],
      footerPhones: [
        { display: "+64 9 870 8980", href: "tel:+6498708980" },
        { display: "0800 454 872", href: "tel:+64800454872" },
      ],
      footerQuickLinks: [
        { label: "Home", href: "https://onlinelearninginstitute.co.nz/" },
        { label: "About us", href: "https://onlinelearninginstitute.co.nz/about/" },
        { label: "Courses", href: "https://onlinelearninginstitute.co.nz/courses/" },
        { label: "FAQs", href: "https://onlinelearninginstitute.co.nz/faq/" },
        {
          label: "Privacy Policy",
          href: "https://onlinelearninginstitute.co.nz/privacy-policy/",
        },
        {
          label: "Terms & Conditions",
          href: "https://onlinelearninginstitute.co.nz/terms-conditions/",
        },
      ],
      footerCourseLinks: [
        {
          label: "Administration",
          href: "https://onlinelearninginstitute.co.nz/courses/administration/",
        },
        {
          label: "Animal Care & Wildlife",
          href: "https://onlinelearninginstitute.co.nz/courses/animal-care-wildlife/",
        },
        {
          label: "Business",
          href: "https://onlinelearninginstitute.co.nz/courses/business/",
        },
        {
          label: "Event Planning, Tourism & Hospitality",
          href: "https://onlinelearninginstitute.co.nz/courses/event-planning-tourism-hospitality/",
        },
        {
          label: "Management",
          href: "https://onlinelearninginstitute.co.nz/courses/management/",
        },
      ],
      preferredHostedOrigin: "https://enrol.onlinelearninginstitute.co.nz",
      preferredPathStyle: "provider-root",
    }),
    checkout: {
      paymentOptions: {
        interest_free_payment_plan: { enabled: true },
        pay_in_full: { enabled: true, comingSoon: false },
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
    websiteUrl: "https://studentpay.co.nz",
    branding: {
      logoPath: "",
      primaryColour: "#8b79f1",
      accentColour: "#715fe2",
      backgroundColour: "#ffffff",
      textColour: "#161b1a",
      fontFamily: 'Inter, "Segoe UI", sans-serif',
      buttonRadius: "medium",
      headerStyle: "provider-native",
      footerStyle: "provider-native",
    },
    presentation: defaultPresentation({
      allowedHosts: ["studentpay.co.nz", "www.studentpay.co.nz"],
      returnToProviderUrl: "https://studentpay.co.nz",
      returnToProviderLabel: "Return to Fixture Institute",
      headerLinks: [{ label: "Courses", href: "https://studentpay.co.nz" }],
    }),
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
  {
    slug: "bela-nz",
    providerCode: "BELA_NZ",
    displayName: "Bela Beauty College",
    legalName: "Bela Beauty College",
    supportEmail: "support@belabeautycollege.com",
    privacyUrl: "https://belabeautycollege.com/policies/privacy-policy",
    termsUrl: "https://belabeautycollege.com/policies/terms-of-service",
    websiteUrl: "https://belabeautycollege.com",
    branding: {
      logoPath: "",
      primaryColour: "#5A332B",
      accentColour: "#FBD2D3",
      backgroundColour: "#FAF7F4",
      surfaceColour: "#ffffff",
      headingColour: "#5A332B",
      mutedTextColour: "#7a5a52",
      textColour: "#5A332B",
      fontFamily: "Arial, sans-serif",
      buttonRadius: "medium",
      headerStyle: "provider-native",
      footerStyle: "provider-native",
    },
    presentation: defaultPresentation({
      allowedHosts: ["belabeautycollege.com", "www.belabeautycollege.com"],
      returnToProviderUrl: "https://belabeautycollege.com",
      returnToProviderLabel: "Return to Bela Beauty College",
      courseUrlPattern:
        "https://belabeautycollege.com/products/the-ultimate-lash-business-bundle",
      knownCourseWebsiteSlugs: ["lash-business-bundle"],
      headerLinks: [
        { label: "Courses", href: "https://belabeautycollege.com" },
      ],
    }),
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
          "Questions about this enrolment can be sent to Bela Beauty College or StudentPay NZ support.",
      },
    },
    apiKeyEnv: "PROVIDER_API_KEY_BELA_NZ",
    active: true,
    sandboxOnly: true,
  },
  {
    slug: "studentpay-internal-e13",
    providerCode: "STUDENTPAY_INTERNAL_E13_CANARY",
    displayName: "StudentPay Internal E13 Canary",
    legalName: "StudentPay NZ (internal E13 canary — not a student offering)",
    supportEmail: "partners@studentpay.co.nz",
    privacyUrl: "https://studentpay.co.nz/privacy",
    termsUrl: "https://studentpay.co.nz/terms",
    websiteUrl: "https://studentpay.co.nz",
    branding: {
      logoPath: "",
      primaryColour: "#161b1a",
      accentColour: "#8b79f1",
      backgroundColour: "#ffffff",
      textColour: "#161b1a",
      fontFamily: 'Inter, "Segoe UI", sans-serif',
      buttonRadius: "medium",
      headerStyle: "provider-native",
      footerStyle: "provider-native",
    },
    presentation: defaultPresentation({
      allowedHosts: ["studentpay.co.nz", "www.studentpay.co.nz"],
      returnToProviderUrl: "https://studentpay.co.nz",
      returnToProviderLabel: "Return to StudentPay",
      knownCourseWebsiteSlugs: ["e13-prod-canary-001"],
      headerLinks: [{ label: "StudentPay", href: "https://studentpay.co.nz" }],
      attributionLabel: "Payments powered by StudentPay NZ",
    }),
    checkout: {
      paymentOptions: {
        interest_free_payment_plan: { enabled: false },
        pay_in_full: { enabled: true, comingSoon: false },
      },
      availableFrequencies: ["Weekly"],
      defaultFrequency: "Weekly",
      wording: {
        supportNote:
          "Internal StudentPay E13 Production canary. Not a public enrolment.",
      },
    },
    apiKeyEnv: "PROVIDER_API_KEY_STUDENTPAY_INTERNAL_E13_CANARY",
    active: true,
    internalCanary: true,
  },
];

function tenantVisible(tenant: NzTenant): boolean {
  if (!tenant.active) {
    return false;
  }
  const boundSlug = configuredNzHostedTenantSlug();
  if (boundSlug) {
    if (tenant.slug !== boundSlug) {
      return false;
    }
    if (tenant.internalCanary) {
      return isInternalE13CanaryHostedEnabled();
    }
    return true;
  }
  if (tenant.internalCanary) {
    return isInternalE13CanaryHostedEnabled();
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

export function getDefaultProductionNzTenantSlug(
  tenants: readonly NzTenant[] = listActiveNzTenants(),
): string | undefined {
  const boundSlug = configuredNzHostedTenantSlug();
  if (boundSlug) {
    return tenants.find((tenant) => tenant.slug === boundSlug)?.slug;
  }
  return tenants.find(
    (tenant) => tenant.active && !tenant.sandboxOnly && !tenant.internalCanary,
  )?.slug;
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
    presentation: tenant.presentation,
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
