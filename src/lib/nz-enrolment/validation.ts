import type { NzStudentDetails } from "./types.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateStudentDetails(
  student: Partial<NzStudentDetails>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!student.firstName?.trim()) errors.firstName = "Enter your first name.";
  if (!student.lastName?.trim()) errors.lastName = "Enter your last name.";
  if (!student.email?.trim() || !EMAIL_RE.test(student.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!student.mobile?.trim()) errors.mobile = "Enter a mobile number.";
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
    mobile: student.mobile?.trim() || "",
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
