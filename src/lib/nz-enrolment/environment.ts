import { configuredDeploymentProviderCode } from "../provider-experience/provider-bindings.ts";

export const NZ_SANDBOX_API_BASE_URL = "https://sandbox-api.studentpay.co.nz";
export const NZ_PRODUCTION_API_BASE_URL = "https://api.studentpay.co.nz";

/**
 * Matches Salesforce ChargeScheduleOriginationService.MAX_RECURRING_SCHEDULES.
 * This is a generic operational ceiling, not an OLI catalogue length.
 */
export const GENERIC_MAX_RECURRING_INSTALMENTS = 400;

export type StudentpayEnv = "sandbox" | "production";
export type HostedProductMode =
  | "nz_enrolment"
  | "bela"
  | "academy"
  | "generic";

export type NzEnvErrorCode =
  | "NZ_HOSTED_PRODUCT_DISABLED"
  | "STUDENTPAY_ENV_REQUIRED"
  | "NZ_API_BASE_REQUIRED"
  | "NZ_API_PRODUCTION_SANDBOX_MISMATCH"
  | "NZ_API_PRODUCTION_INVALID"
  | "NZ_API_SANDBOX_PRODUCTION_MISMATCH"
  | "SESSION_NOT_CONFIGURED";

export function getStudentpayEnv(): StudentpayEnv | null {
  const value = process.env.STUDENTPAY_ENV?.trim().toLowerCase();
  if (value === "production" || value === "sandbox") {
    return value;
  }
  return null;
}

export function isProductionAppEnv(): boolean {
  return getStudentpayEnv() === "production";
}

export function allowSandboxFixtures(): boolean {
  return getStudentpayEnv() === "sandbox";
}

export function getHostedProductMode(): HostedProductMode {
  const configured = process.env.HOSTED_PRODUCT_MODE?.trim().toLowerCase();
  if (configured === "nz_enrolment") {
    return "nz_enrolment";
  }
  if (configured === "bela") {
    return "bela";
  }
  if (configured === "academy") {
    return "academy";
  }

  const bound = configuredDeploymentProviderCode();
  if (bound === "BELA") {
    return "bela";
  }
  if (bound === "ACADEMYAU") {
    return "academy";
  }
  return "generic";
}

export function isNzEnrolmentProductAvailable(): boolean {
  return getHostedProductMode() === "nz_enrolment";
}

export function resolveNzApiBaseUrl(): {
  url?: string;
  error?: NzEnvErrorCode;
} {
  if (!isNzEnrolmentProductAvailable()) {
    return { error: "NZ_HOSTED_PRODUCT_DISABLED" };
  }

  const env = getStudentpayEnv();
  if (!env) {
    return { error: "STUDENTPAY_ENV_REQUIRED" };
  }

  const configured = process.env.NZ_STUDENTPAY_API_BASE_URL?.trim().replace(
    /\/$/,
    "",
  );
  if (!configured) {
    return { error: "NZ_API_BASE_REQUIRED" };
  }

  if (env === "production") {
    if (configured === NZ_SANDBOX_API_BASE_URL) {
      return { error: "NZ_API_PRODUCTION_SANDBOX_MISMATCH" };
    }
    if (configured !== NZ_PRODUCTION_API_BASE_URL) {
      return { error: "NZ_API_PRODUCTION_INVALID" };
    }
  }

  if (env === "sandbox" && configured === NZ_PRODUCTION_API_BASE_URL) {
    return { error: "NZ_API_SANDBOX_PRODUCTION_MISMATCH" };
  }

  return { url: configured };
}

export function requireNzEnrolmentSessionSecret(): {
  secret?: string;
  error?: NzEnvErrorCode;
} {
  const secret =
    process.env.NZ_ENROLMENT_SESSION_SECRET?.trim() ||
    process.env.ENROLMENT_CHECKOUT_SESSION_SECRET?.trim() ||
    "";

  if (isProductionAppEnv()) {
    if (secret.length < 16) {
      return { error: "SESSION_NOT_CONFIGURED" };
    }
    return { secret };
  }

  if (secret.length >= 16) {
    return { secret };
  }

  if (isNzEnrolmentProductAvailable() && getStudentpayEnv() === "sandbox") {
    if (secret.length < 16) {
      return { error: "SESSION_NOT_CONFIGURED" };
    }
  }

  return { secret: secret || "nz-enrolment-checkout-dev-secret" };
}
