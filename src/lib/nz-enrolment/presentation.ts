import type {
  NzCourse,
  NzHeaderSocialNetwork,
  NzPublicCourse,
  NzPublicTenant,
  NzTenantPresentation,
} from "./types.ts";

export const DEFAULT_ATTRIBUTION_LABEL = "Payment plan powered by StudentPay NZ";
export const DEFAULT_STUDENTPAY_URL = "https://studentpay.co.nz";
export const CURRENT_NZ_ENROLMENT_ORIGIN = "https://enrol.studentpay.co.nz";

const STUDENTPAY_HOSTS = ["studentpay.co.nz", "www.studentpay.co.nz"] as const;

export function defaultPresentation(
  partial?: Partial<NzTenantPresentation>,
): NzTenantPresentation {
  return {
    chrome: "provider-native",
    attributionLabel: DEFAULT_ATTRIBUTION_LABEL,
    studentPayUrl: DEFAULT_STUDENTPAY_URL,
    allowedHosts: [],
    currentHostedOrigin: CURRENT_NZ_ENROLMENT_ORIGIN,
    preferredPathStyle: "enrol-slug",
    ...partial,
  };
}

export function isHttpsUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isAllowlistedHttpsUrl(
  value: string,
  allowedHosts: readonly string[],
): boolean {
  const parsed = isHttpsUrl(value);
  if (!parsed) {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  return allowedHosts.some((item) => item.toLowerCase() === host);
}

export function tenantAllowedHosts(
  tenant: Pick<NzPublicTenant, "presentation" | "websiteUrl">,
): string[] {
  const hosts = new Set(
    (tenant.presentation.allowedHosts || []).map((item) => item.toLowerCase()),
  );
  if (tenant.websiteUrl) {
    const parsed = isHttpsUrl(tenant.websiteUrl);
    if (parsed) {
      hosts.add(parsed.hostname.toLowerCase());
    }
  }
  return [...hosts];
}

export function safeProviderUrl(
  value: string | undefined,
  tenant: Pick<NzPublicTenant, "presentation" | "websiteUrl">,
): string | null {
  if (!value) {
    return null;
  }
  return isAllowlistedHttpsUrl(value, tenantAllowedHosts(tenant)) ? value : null;
}

export function safeStudentPayUrl(tenant: NzPublicTenant): string {
  const configured = tenant.presentation.studentPayUrl;
  if (isAllowlistedHttpsUrl(configured, STUDENTPAY_HOSTS)) {
    return configured;
  }
  return DEFAULT_STUDENTPAY_URL;
}

export function safeReturnToProviderUrl(tenant: NzPublicTenant): string | null {
  return (
    safeProviderUrl(tenant.presentation.returnToProviderUrl, tenant) ||
    safeProviderUrl(tenant.websiteUrl, tenant)
  );
}

export function safeHeaderLinks(tenant: NzPublicTenant): NzHeaderNav[] {
  return (tenant.presentation.headerLinks || []).flatMap((item) => {
    const href = safeProviderUrl(item.href, tenant);
    if (!href || !item.label.trim()) {
      return [];
    }
    return [{ label: item.label.trim(), href }];
  });
}

type NzHeaderNav = { label: string; href: string };

const SOCIAL_HOSTS: Record<NzHeaderSocialNetwork, readonly string[]> = {
  facebook: ["facebook.com", "www.facebook.com"],
  instagram: ["instagram.com", "www.instagram.com"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
};

export function safeSocialUrl(
  value: string | undefined,
  network: NzHeaderSocialNetwork,
): string | null {
  if (!value) {
    return null;
  }
  const parsed = isHttpsUrl(value);
  if (!parsed) {
    return null;
  }
  return SOCIAL_HOSTS[network].includes(parsed.hostname.toLowerCase()) ? value : null;
}

export function safeHeaderSocialLinks(
  tenant: NzPublicTenant,
): { label: string; href: string; network: NzHeaderSocialNetwork }[] {
  return (tenant.presentation.headerSocialLinks || []).flatMap((item) => {
    const href = safeSocialUrl(item.href, item.network);
    if (!href || !item.label.trim()) {
      return [];
    }
    return [{ label: item.label.trim(), href, network: item.network }];
  });
}

export function safeHeaderSearchUrl(tenant: NzPublicTenant): string | null {
  return (
    safeProviderUrl(tenant.presentation.headerSearchUrl, tenant) ||
    safeProviderUrl(tenant.websiteUrl, tenant)
  );
}

export function safeHeaderPhone(
  tenant: NzPublicTenant,
): { display: string; href: string } | null {
  const display = tenant.presentation.headerPhone?.trim();
  if (!display) {
    return null;
  }
  const configured = tenant.presentation.headerPhoneTel?.trim();
  const tel =
    configured && /^\+[0-9]{8,15}$/.test(configured)
      ? configured
      : display.replace(/[^\d+]/g, "");
  if (!/^\+[0-9]{8,15}$/.test(tel)) {
    return null;
  }
  return { display, href: `tel:${tel}` };
}

export function usesSiteHeader(tenant: NzPublicTenant): boolean {
  return tenant.presentation.headerLayout === "site";
}

export function providerCourseWebsiteUrl(
  tenant: NzPublicTenant,
  course: Pick<NzPublicCourse, "slug">,
): string | null {
  const pattern = tenant.presentation.courseUrlPattern;
  if (!pattern) {
    return null;
  }
  const known = tenant.presentation.knownCourseWebsiteSlugs;
  if (known && !known.includes(course.slug)) {
    return null;
  }
  const url = pattern.replaceAll("{courseSlug}", course.slug);
  return safeProviderUrl(url, tenant);
}

export function currentCourseDeepLink(
  tenant: Pick<NzPublicTenant, "slug" | "presentation">,
  course: Pick<NzPublicCourse, "slug">,
): string {
  const origin = tenant.presentation.currentHostedOrigin.replace(/\/$/, "");
  return `${origin}/enrol/${tenant.slug}/${course.slug}`;
}

export function futureCourseDeepLink(
  tenant: Pick<NzPublicTenant, "slug" | "presentation">,
  course: Pick<NzPublicCourse, "slug">,
): string {
  const origin = (
    tenant.presentation.preferredHostedOrigin ||
    tenant.presentation.currentHostedOrigin
  ).replace(/\/$/, "");
  if (tenant.presentation.preferredPathStyle === "provider-root") {
    return `${origin}/${course.slug}`;
  }
  return `${origin}/enrol/${tenant.slug}/${course.slug}`;
}

export function cataloguePath(tenant: Pick<NzPublicTenant, "slug">): string {
  return `/enrol/${tenant.slug}`;
}

export function coursePath(
  tenant: Pick<NzPublicTenant, "slug">,
  course: Pick<NzPublicCourse | NzCourse, "slug">,
): string {
  return `/enrol/${tenant.slug}/${course.slug}`;
}

export function tenantCssVars(tenant: NzPublicTenant): Record<string, string> {
  const branding = tenant.branding;
  const radius =
    branding.buttonRadius === "pill"
      ? "999px"
      : branding.buttonRadius === "small"
        ? "8px"
        : "10px";

  return {
    "--nz-primary": branding.primaryColour,
    "--nz-secondary": branding.secondaryColour || branding.accentColour,
    "--nz-primary-deep": branding.accentColour,
    "--nz-text": branding.textColour,
    "--nz-heading": branding.headingColour || branding.textColour,
    "--nz-muted": branding.mutedTextColour || "#515151",
    "--nz-bg": branding.backgroundColour,
    "--nz-surface": branding.surfaceColour || "#ffffff",
    "--nz-button-radius": radius,
    "--nz-font": branding.fontFamily,
    "--nz-heading-font": branding.headingFontFamily || branding.fontFamily,
    "--nz-cta": branding.ctaColour || branding.primaryColour,
  };
}

export function usesProviderNativeChrome(tenant: NzPublicTenant): boolean {
  return tenant.presentation.chrome !== "platform";
}
