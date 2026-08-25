import type {
  CatalogueCourseView,
  CatalogueFrequency,
  PublicCatalogueCourse,
} from "@/types/catalogue";

const SUPPORTED_FREQUENCIES = new Set<CatalogueFrequency>([
  "weekly",
  "fortnightly",
  "monthly",
]);

export function slugFromCourseCode(courseCode: string): string {
  return String(courseCode || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");
}

export function courseCodeFromSlug(courseSlug: string): string {
  return String(courseSlug || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_");
}

export function dollarsFromCents(cents: number): number {
  return Number(cents || 0) / 100;
}

export function formatAudFromCents(cents: number): string {
  const dollars = dollarsFromCents(cents);
  const negative = dollars < 0;
  const absolute = Math.abs(dollars);
  const integer = Number.isInteger(absolute);
  const [whole, fraction] = integer
    ? [String(Math.trunc(absolute)), null]
    : absolute.toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}${fraction ? `.${fraction}` : ""}`;
}

export function catalogueFrequency(
  value: string | undefined,
): CatalogueFrequency {
  const normalised = String(value || "weekly").toLowerCase();

  if (SUPPORTED_FREQUENCIES.has(normalised as CatalogueFrequency)) {
    return normalised as CatalogueFrequency;
  }

  return "weekly";
}

export function toCatalogueCourseView(
  providerCode: string,
  course: PublicCatalogueCourse,
): CatalogueCourseView {
  return {
    providerCode,
    code: course.course_code,
    slug: slugFromCourseCode(course.course_code),
    title: course.course_name,
    status: String(course.status || "").toLowerCase(),
    currency: course.currency || "AUD",
    kitIncluded: course.kit_included === true,
    kitDisclosure: course.kit_disclosure || "",
    frequency: catalogueFrequency(course.price_version?.frequency),
    coursePriceCents: course.commercial.course_price_cents,
    upfrontCents: course.commercial.operational_upfront_payment_cents,
    recurringCents: course.commercial.standard_recurring_amount_cents,
    recurringCount: course.commercial.recurring_instalment_count,
  };
}

export function formatCataloguePlanCopy(course: {
  upfrontCents: number;
  recurringCents: number;
  recurringCount: number;
  frequency: CatalogueFrequency;
}): string {
  const recurring = `${course.recurringCount} ${course.frequency} payments of ${formatAudFromCents(course.recurringCents)}`;

  if (course.upfrontCents > 0) {
    return `${formatAudFromCents(course.upfrontCents)} upfront then ${recurring}`;
  }

  return recurring;
}

export function uniqueActiveCatalogueCourses(
  courses: CatalogueCourseView[],
): CatalogueCourseView[] {
  const seen = new Set<string>();
  const unique: CatalogueCourseView[] = [];

  for (const course of courses) {
    if (course.status && course.status !== "active") {
      continue;
    }

    if (seen.has(course.code)) {
      continue;
    }

    seen.add(course.code);
    unique.push(course);
  }

  return unique;
}
