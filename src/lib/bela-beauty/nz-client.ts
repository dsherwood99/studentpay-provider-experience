import { BELA_COURSE } from "@/lib/bela-beauty/course";

export type BelaNzConfig = {
  apiBaseUrl: string;
  checkoutUrl: string;
  confirmUrl: string;
  getCheckoutUrl: (checkoutId: string) => string;
  apiKey: string;
  configured: boolean;
  legalBaseUrl: string;
};

/**
 * NZ sandbox endpoints + BELA_NZ provider key.
 * Kept separate from the AU Academy / SANDBOX_DEMO credentials used by the
 * EnrolmentWizard so both regions can coexist on this app.
 */
export function getBelaNzConfig(): BelaNzConfig {
  const apiBaseUrl =
    process.env.STUDENTPAY_NZ_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.BELA_NZ_API_BASE_URL?.replace(/\/$/, "") ||
    "https://sandbox-api.studentpay.co.nz";

  const apiKey =
    process.env.PROVIDER_API_KEY_BELA_NZ ||
    process.env.BELA_NZ_PROVIDER_API_KEY ||
    "";

  return {
    apiBaseUrl,
    checkoutUrl: `${apiBaseUrl}/v1/provider-checkouts`,
    confirmUrl: `${apiBaseUrl}/api/provider-checkout-confirm`,
    getCheckoutUrl: (checkoutId: string) =>
      `${apiBaseUrl}/v1/provider-checkouts/${encodeURIComponent(checkoutId)}`,
    apiKey,
    configured: Boolean(apiKey),
    legalBaseUrl: apiBaseUrl,
  };
}

export function belaNzAuthHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "x-api-key": apiKey,
  };
}

export async function parseUpstreamJson(
  response: Response,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {
      success: false,
      error: text || `Upstream returned HTTP ${response.status}`,
    };
  }
}

export function formatBelaError(
  value: unknown,
  fallback = "An unexpected StudentPay NZ error occurred.",
): string {
  if (!value) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (value instanceof Error) {
    return value.message || fallback;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "title"]) {
      const nested = record[key];
      if (typeof nested === "string" && nested.trim()) {
        return nested.trim();
      }
      if (nested && typeof nested === "object") {
        const nestedMessage = formatBelaError(nested, "");
        if (nestedMessage) return nestedMessage;
      }
    }
  }
  return fallback;
}

export function publicDemoMeta() {
  const config = getBelaNzConfig();
  return {
    provider: BELA_COURSE.provider_name,
    brand_name: BELA_COURSE.brand_name,
    provider_code: BELA_COURSE.provider_code,
    course_name: BELA_COURSE.course_name,
    course_code: BELA_COURSE.course_code,
    currency: BELA_COURSE.currency,
    brand: BELA_COURSE.brand,
    pay_in_full: BELA_COURSE.pay_in_full,
    weekly_plan: BELA_COURSE.weekly_plan,
    sandbox: true,
    api_base: `${config.apiBaseUrl}/v1`,
    legal_base: config.legalBaseUrl,
    product_url: BELA_COURSE.product_url,
    hosted_on: "studentpay-provider-experience",
  };
}
