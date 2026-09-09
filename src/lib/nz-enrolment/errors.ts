const SAFE_MESSAGES: Record<string, string> = {
  MISSING_API_KEY: "This enrolment page is not configured yet. Please try again later.",
  INVALID_API_KEY: "This enrolment page is not configured yet. Please try again later.",
  PROVIDER_KEY_MISMATCH: "This enrolment page is not configured yet. Please try again later.",
  PROVIDER_NOT_FOUND: "This education provider is not available for enrolment right now.",
  VALIDATION_ERROR: "Please check the highlighted fields and try again.",
  CHECKOUT_NOT_FOUND: "We could not find this enrolment. Please start again.",
  DIRECT_DEBIT_SETUP_INCOMPLETE:
    "Direct Debit setup is not finished yet. Complete bank setup, then confirm.",
  DECLARATIONS_REQUIRED: "Please accept the required declarations to finish enrolment.",
  INVALID_STUDENT: "Please complete all required student details.",
  METHOD_NOT_ALLOWED: "This enrolment step is not available.",
  NOT_CONFIGURED: "This enrolment page is not configured yet. Please try again later.",
  SESSION_EXPIRED: "Your enrolment session expired. Please start again.",
  TENANT_MISMATCH: "This enrolment belongs to a different provider.",
  PAY_IN_FULL_UNAVAILABLE: "Pay in full is not available yet. Choose a payment plan to continue.",
  NZ_HOSTED_PRODUCT_DISABLED: "This enrolment page is not available on this host.",
  STUDENTPAY_ENV_REQUIRED: "This enrolment page is not configured yet. Please try again later.",
  NZ_API_BASE_REQUIRED: "This enrolment page is not configured yet. Please try again later.",
  NZ_API_PRODUCTION_SANDBOX_MISMATCH:
    "This enrolment page is not configured yet. Please try again later.",
  NZ_API_PRODUCTION_INVALID: "This enrolment page is not configured yet. Please try again later.",
  NZ_API_SANDBOX_PRODUCTION_MISMATCH:
    "This enrolment page is not configured yet. Please try again later.",
  SESSION_NOT_CONFIGURED: "This enrolment page is not configured yet. Please try again later.",
};

export function hostedErrorMessage(
  code: string | undefined,
  fallback: string,
): string {
  if (!code) {
    return fallback;
  }
  return SAFE_MESSAGES[code] || fallback;
}

export function jsonError(
  status: number,
  code: string,
  message?: string,
  extra?: Record<string, unknown>,
) {
  return Response.json(
    {
      success: false,
      error: {
        code,
        message: hostedErrorMessage(code, message || "Unable to continue enrolment."),
        ...extra,
      },
    },
    { status },
  );
}

export function isSafeBrowserBody(value: unknown): boolean {
  const text = JSON.stringify(value || {});
  return !/PROVIDER_API_KEY|spnz_|BEGIN (RSA )?PRIVATE KEY|checkout_token|eyJ[A-Za-z0-9_-]{20,}/.test(
    text,
  );
}
