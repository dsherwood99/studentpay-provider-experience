import {
  calculateAuWeeklySchedule,
  type AuWeeklySchedule,
} from "./schedule.ts";

export const ACADEMY_AUSTRALIA_PROVIDER_SLUG = "academy-australia";

export const AU_PAYMENT_PLAN_DIRECTORY_PATH =
  "/providers/academy-australia/courses/au-payment-plans";

/** Published exclusion for verified Bela rows that do not list a kit. */
export const KIT_NOT_INCLUDED = "Kit Not Included";

export type AuPaymentPlanCourse = {
  code: string;
  slug: string;
  title: string;
  source: string;
  inclusions: readonly string[];
  exclusions: readonly string[];
  schedule: AuWeeklySchedule;
};

type AuPaymentPlanInput = {
  code: string;
  slug: string;
  title: string;
  source: string;
  coursePriceCents: number;
  weeklyAmountCents: number;
  inclusions?: readonly string[];
  exclusions?: readonly string[];
};

/**
 * Display-only Australian payment plans for the Academy Australia demo.
 *
 * Inputs are the verified catalogue price version 1 row from
 * studentpay-api `lib/enrolment/course.js`. The instalment count and upfront
 * amount come from `calculateAuWeeklySchedule`. This module does not publish
 * inclusions, a qualification, or agreement text that the source does not
 * already state. Checkout is intentionally not wired from here.
 */
const AU_PAYMENT_PLAN_INPUTS: readonly AuPaymentPlanInput[] = [
  {
    code: "BRIDAL_FREELANCER_BUNDLE",
    slug: "bridal-freelancer-bundle",
    title: "Bridal Freelancer Bundle",
    source: "catalogue-price-v1",
    coursePriceCents: 350_000,
    weeklyAmountCents: 2_300,
    inclusions: [],
    exclusions: [KIT_NOT_INCLUDED],
  },
];

function publish(input: AuPaymentPlanInput): AuPaymentPlanCourse {
  const calculated = calculateAuWeeklySchedule({
    coursePriceCents: input.coursePriceCents,
    weeklyAmountCents: input.weeklyAmountCents,
  });

  if (!calculated.ok) {
    throw new Error(
      `${input.code} schedule is invalid: ${calculated.reason}`,
    );
  }

  return {
    code: input.code,
    slug: input.slug,
    title: input.title,
    source: input.source,
    inclusions: input.inclusions ?? [],
    exclusions: input.exclusions ?? [],
    schedule: calculated.schedule,
  };
}

export const auPaymentPlanCourses: readonly AuPaymentPlanCourse[] =
  AU_PAYMENT_PLAN_INPUTS.map(publish);

const slugs = new Set(auPaymentPlanCourses.map((course) => course.slug));
if (slugs.size !== auPaymentPlanCourses.length) {
  throw new Error("Australian payment-plan slugs must be unique.");
}

export function getAuPaymentPlanCourse(
  courseSlug: string,
): AuPaymentPlanCourse | undefined {
  return auPaymentPlanCourses.find((course) => course.slug === courseSlug);
}

export function getAuPaymentPlanCourseForProvider(
  providerSlug: string,
  courseSlug: string,
): AuPaymentPlanCourse | undefined {
  if (providerSlug !== ACADEMY_AUSTRALIA_PROVIDER_SLUG) {
    return undefined;
  }

  return getAuPaymentPlanCourse(courseSlug);
}

export function isAuPaymentPlanCheckoutBlocked(
  providerSlug: string,
  courseSlug: string,
): boolean {
  return getAuPaymentPlanCourseForProvider(providerSlug, courseSlug) !== undefined;
}

export function auPaymentPlanCoursePath(courseSlug: string): string {
  return `/providers/${ACADEMY_AUSTRALIA_PROVIDER_SLUG}/courses/${courseSlug}`;
}

export function auPaymentPlanEnrolPath(courseSlug: string): string {
  return `${auPaymentPlanCoursePath(courseSlug)}/enrol`;
}

export function formatAudCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new Error("AUD amounts must be integer cents.");
  }

  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const dollars = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  const grouped = dollars.toLocaleString("en-AU");

  return `${negative ? "-" : ""}AUD $${grouped}.${String(remainder).padStart(2, "0")}`;
}

export function formatAuInstalmentSummary(course: AuPaymentPlanCourse): string {
  const { schedule } = course;
  const weekly = `${schedule.numberOfInstallments} weekly payments of ${formatAudCents(schedule.weeklyAmountCents)}`;

  if (schedule.upfrontPaymentCents > 0) {
    return `${formatAudCents(schedule.upfrontPaymentCents)} upfront, then ${weekly}`;
  }

  if (schedule.finalPaymentCents > 0) {
    return `${weekly}, then a final payment of ${formatAudCents(schedule.finalPaymentCents)}`;
  }

  return weekly;
}

export function upfrontCollectionNote(
  course: AuPaymentPlanCourse,
): string | null {
  if (course.schedule.upfrontCollection === "within-24-hours-of-signup") {
    return "Debited within 24 hours of signup.";
  }

  if (course.schedule.upfrontPaymentCents === 0) {
    return "No separate upfront debit. The course price divides evenly into weekly instalments.";
  }

  return null;
}
