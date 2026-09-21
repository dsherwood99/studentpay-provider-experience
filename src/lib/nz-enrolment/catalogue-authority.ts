import { getStudentpayEnv } from "./environment.ts";
import type { NzCourse, NzTenant } from "./types.ts";

/**
 * Hosted mirror of the NZ API Salesforce canary allowlist.
 *
 * NZ_CATALOGUE_SALESFORCE_CANARY_COURSES=OLI_NZ:OLI_TEST_001,OLI_NZ:PSY101
 * lifts listed courses from local catalogue authority to the NZ API.
 * `none` disables the allowlist.
 *
 * Expanding from 1 course to 64 is an env-list change, not a UI rewrite.
 */
export const SANDBOX_DEFAULT_SALESFORCE_CANARY_COURSES = "OLI_NZ:OLI_TEST_001";
export const SALESFORCE_CANARY_DISABLED = "none";

function normaliseCode(value: string): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");
}

export function parseSalesforceCanaryCourses(raw: string | undefined | null): string[] {
  return String(raw || "")
    .split(",")
    .map((entry) =>
      String(entry || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ""),
    )
    .filter(Boolean);
}

export function resolveSalesforceCanaryCoursesConfig(): string {
  const configured = process.env.NZ_CATALOGUE_SALESFORCE_CANARY_COURSES || "";
  if (configured.trim().toLowerCase() === SALESFORCE_CANARY_DISABLED) {
    return "";
  }
  if (configured.trim()) {
    return configured;
  }
  return getStudentpayEnv() === "sandbox"
    ? SANDBOX_DEFAULT_SALESFORCE_CANARY_COURSES
    : "";
}

export function salesforceAuthorityKey(
  providerCode: string,
  courseCode: string,
): string {
  return `${normaliseCode(providerCode)}:${String(courseCode || "")
    .trim()
    .toUpperCase()}`;
}

function catalogueAuthorityModeFor(providerCode: string): string {
  const code = normaliseCode(providerCode);
  const perProvider = String(
    process.env[`NZ_CATALOGUE_AUTHORITY_${code}`] || "",
  )
    .trim()
    .toLowerCase();
  const global = String(process.env.NZ_CATALOGUE_AUTHORITY || "")
    .trim()
    .toLowerCase();
  return perProvider || global || "legacy";
}

export function isSalesforceAuthorityProvider(
  tenant: Pick<NzTenant, "providerCode">,
): boolean {
  if (!tenant?.providerCode) {
    return false;
  }
  return catalogueAuthorityModeFor(tenant.providerCode) === "salesforce";
}

export function isSalesforceAuthorityCourse(
  tenant: Pick<NzTenant, "providerCode">,
  course: Pick<NzCourse, "courseCode">,
): boolean {
  if (!tenant?.providerCode || !course?.courseCode) {
    return false;
  }
  if (isSalesforceAuthorityProvider(tenant)) {
    return true;
  }
  const key = salesforceAuthorityKey(tenant.providerCode, course.courseCode);
  return parseSalesforceCanaryCourses(
    resolveSalesforceCanaryCoursesConfig(),
  ).includes(key);
}

export function isSandboxOverlayForceUnavailable(): boolean {
  const flag = process.env.NZ_CATALOGUE_OVERLAY_FORCE_UNAVAILABLE?.trim().toLowerCase();
  if (flag !== "true" && flag !== "1" && flag !== "yes" && flag !== "on") {
    return false;
  }
  return getStudentpayEnv() === "sandbox";
}
