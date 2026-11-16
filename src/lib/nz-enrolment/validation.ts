import type { NzStudentDetails } from "./types.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164 = /^\+[1-9]\d{7,14}$/;
const NZ_MOBILE = /^\+642\d{7,9}$/;
const APPROVED_CHECKOUT_HOSTS = new Set([
  "enrol.studentpay.co.nz",
  "enrol.onlinelearninginstitute.co.nz",
]);

/**
 * New Zealand mobiles (02…) and any other valid E.164 number.
 * A leading 0 is read as a New Zealand number. Numbers outside New Zealand need + and a country code.
 */
export function normaliseServicingMobile(value: string | undefined | null): {
  ok: boolean;
  e164: string;
} {
  const compact = String(value || "")
    .trim()
    .replace(/[\s().-]/g, "");
  if (!compact) return { ok: false, e164: "" };

  let digits = compact;
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `64${digits.slice(1)}`;
  else if (!digits.startsWith("64")) return { ok: false, e164: "" };

  if (!/^\d+$/.test(digits)) return { ok: false, e164: "" };
  const e164 = `+${digits}`;
  if (!E164.test(e164)) return { ok: false, e164: "" };
  if (e164.startsWith("+64") && !NZ_MOBILE.test(e164)) return { ok: false, e164: "" };
  return { ok: true, e164 };
}

export function approvedCheckoutSourceUrl(value: string | undefined | null): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
  const host = parsed.hostname.toLowerCase();
  if (!APPROVED_CHECKOUT_HOSTS.has(host)) return null;
  if (!/^\/enrol\/[a-z0-9-]+\/[a-z0-9-]+\/?$/i.test(parsed.pathname)) return null;
  return `https://${host}${parsed.pathname.replace(/\/$/, "")}`;
}

export function validateStudentDetails(
  student: Partial<NzStudentDetails>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!student.firstName?.trim()) errors.firstName = "Enter your first name.";
  if (!student.lastName?.trim()) errors.lastName = "Enter your last name.";
  if (!student.email?.trim() || !EMAIL_RE.test(student.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!student.mobile?.trim() || !normaliseServicingMobile(student.mobile).ok) {
    errors.mobile =
      "Enter a valid mobile number. Use + and the country code outside New Zealand.";
  }
  if (!student.dateOfBirth?.trim()) {
    errors.dateOfBirth = "Enter your date of birth.";
  }
  if (!student.streetAddress?.trim()) {
    errors.streetAddress = "Enter your street address.";
  }
  if (!student.suburb?.trim()) errors.suburb = "Enter your suburb.";
  if (!student.postcode?.trim()) errors.postcode = "Enter your postcode.";
  if (!student.region?.trim()) errors.region = "Enter your region or city.";
  if (!student.country?.trim()) errors.country = "Enter your country.";

  return errors;
}

export function sanitiseStudent(
  student: Partial<NzStudentDetails>,
): NzStudentDetails {
  return {
    firstName: student.firstName?.trim() || "",
    lastName: student.lastName?.trim() || "",
    email: student.email?.trim() || "",
    mobile: (() => {
      const mobile = normaliseServicingMobile(student.mobile);
      return mobile.ok ? mobile.e164 : student.mobile?.trim() || "";
    })(),
    dateOfBirth: student.dateOfBirth?.trim() || "",
    streetAddress: student.streetAddress?.trim() || "",
    suburb: student.suburb?.trim() || "",
    city: student.city?.trim() || student.suburb?.trim() || "",
    postcode: student.postcode?.trim() || "",
    region: student.region?.trim() || "",
    country: student.country?.trim() || "New Zealand",
  };
}

export function sameOriginOrConfigured(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const expected = `${proto}://${host}`;
  if (origin === expected) {
    return true;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function publicBaseUrl(request: Request): string {
  const configured = process.env.NZ_ENROLMENT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  return `${proto}://${host}`;
}
