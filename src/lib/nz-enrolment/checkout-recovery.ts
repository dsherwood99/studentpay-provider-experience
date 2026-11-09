import type { NzStudentDetails } from "./types.ts";

export const OLI_CHECKOUT_RECOVERY_PREFIX = "OLI_NZ";
export const OLI_RECOVERY_TENANT_SLUG = "oli";
export const NZ_ENROLMENT_DRAFT_PREFIX = "nz-enrolment-draft";

export function parseCheckoutIdPrefix(checkoutId: string): string | null {
  const value = String(checkoutId || "").trim();
  const match = value.match(/^([A-Z0-9_]+)-\d+-[A-Z0-9]+$/i);
  return match ? match[1].toUpperCase() : null;
}

export function isOliRecoverableCheckoutId(checkoutId: string): boolean {
  return parseCheckoutIdPrefix(checkoutId) === OLI_CHECKOUT_RECOVERY_PREFIX;
}

export function draftStorageKey(providerSlug: string, courseSlug: string): string {
  return `${NZ_ENROLMENT_DRAFT_PREFIX}:${providerSlug}:${courseSlug}`;
}

export function studentFromRecoveryPayload(raw: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  date_of_birth?: string | null;
  address?: {
    street_address?: string | null;
    suburb?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  } | null;
} | null | undefined): NzStudentDetails {
  const address = raw?.address || {};
  return {
    firstName: String(raw?.first_name || "").trim(),
    lastName: String(raw?.last_name || "").trim(),
    email: String(raw?.email || "").trim(),
    mobile: String(raw?.mobile || "").trim(),
    dateOfBirth: String(raw?.date_of_birth || "").trim().slice(0, 10),
    streetAddress: String(address.street_address || "").trim(),
    suburb: String(address.suburb || "").trim(),
    city: String(address.city || address.suburb || "").trim(),
    postcode: String(address.postcode || "").trim(),
    region: String(address.state || "").trim(),
    country: String(address.country || "New Zealand").trim() || "New Zealand",
  };
}

export function recoveryDeniedMessage(code?: string): string {
  if (code === "RECOVERY_RATE_LIMITED") {
    return "Too many resume attempts. Wait a few minutes and try again.";
  }
  if (code === "RECOVERY_NOT_AVAILABLE") {
    return "This enrolment cannot be resumed from this page.";
  }
  return "We could not resume this enrolment. Check the email and date of birth used when you started.";
}
