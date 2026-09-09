import type { NzCourse } from "./types.ts";

/**
 * Lightweight NZ hosted course catalogue.
 * Salesforce NZ has no Course/Product catalogue for OLI, so this config is the
 * hosted source of truth for launch. Canonical /v1 still validates the maths.
 *
 * OLI course amounts are a sandbox certification fixture, not a live price list.
 */
export const NZ_COURSES: readonly NzCourse[] = [
  {
    courseCode: "OLI_SANDBOX_CERT_COURSE",
    slug: "certification-course",
    providerSlug: "oli",
    name: "Sandbox Certification Course",
    description:
      "StudentPay NZ sandbox certification course for Online Learning Institute hosted enrolment. Not a live student offering.",
    priceCents: 120_000,
    status: "active",
    duration: "Self-paced",
    planDefaults: {
      upfrontAmountCents: 0,
      frequency: "Weekly",
      numberOfInstalments: 48,
    },
  },
  {
    courseCode: "FIXTURE_EXAMPLE_CERTIFICATE",
    slug: "example-certificate",
    providerSlug: "fixture-institute",
    name: "Example Certificate",
    description:
      "Generic fixture course used to prove Enrolment Checkout is tenant-configured, not OLI-hardcoded.",
    priceCents: 120_000,
    status: "active",
    planDefaults: {
      upfrontAmountCents: 0,
      frequency: "Monthly",
      numberOfInstalments: 12,
    },
  },
];

export function getNzCoursesForProvider(providerSlug: string): NzCourse[] {
  const slug = providerSlug.trim().toLowerCase();
  return NZ_COURSES.filter(
    (course) => course.providerSlug === slug && course.status === "active",
  );
}

export function getNzCourse(
  providerSlug: string,
  courseSlug: string,
): NzCourse | undefined {
  const provider = providerSlug.trim().toLowerCase();
  const course = courseSlug.trim().toLowerCase();
  return NZ_COURSES.find(
    (item) =>
      item.providerSlug === provider &&
      item.slug === course &&
      item.status === "active",
  );
}

export function toPublicCourse(course: NzCourse) {
  return {
    slug: course.slug,
    courseCode: course.courseCode,
    name: course.name,
    description: course.description,
    priceCents: course.priceCents,
    duration: course.duration,
    planDefaults: course.planDefaults,
  };
}
