import type { NzCourse, NzTenant } from "./types.ts";
import { configuredNzHostedTenantSlug } from "./environment.ts";
import { isNzHostedReviewMode } from "./review-mode.ts";

/**
 * Read-only Black Friday figures for the Bela preview when the deployment
 * has no provider API key. These match the published plan. They are not a
 * Salesforce write, and review mode still refuses create, Direct Debit,
 * agreements, and payments. Production never enters review mode.
 */
const BELA_REVIEW_BLACK_FRIDAY: readonly {
  courseCode: string;
  slug: string;
  name: string;
  paymentPlanCourseFeeCents: number;
}[] = [
  {
    courseCode: "BELA_LASH_BUNDLE_BLACK_FRIDAY",
    slug: "lash-bundle-black-friday",
    name: "Lash Bundle — Black Friday",
    paymentPlanCourseFeeCents: 280_000,
  },
  {
    courseCode: "BELA_NAIL_BUNDLE_BLACK_FRIDAY",
    slug: "nail-bundle-black-friday",
    name: "Nail Bundle — Black Friday",
    paymentPlanCourseFeeCents: 385_000,
  },
];

export function belaReviewBlackFridayCourses(
  tenant: Pick<NzTenant, "slug" | "providerCode">,
): NzCourse[] | null {
  if (!isNzHostedReviewMode()) {
    return null;
  }
  if (tenant.slug !== "bela-nz" || tenant.providerCode !== "BELA_NZ") {
    return null;
  }
  if (configuredNzHostedTenantSlug() !== "bela-nz") {
    return null;
  }
  return BELA_REVIEW_BLACK_FRIDAY.map((offer) => ({
    courseCode: offer.courseCode,
    slug: offer.slug,
    providerSlug: "bela-nz",
    name: offer.name,
    description:
      "Kit not included. Course access is 2 years and is separate from the repayment term.",
    paymentPlanCourseFeeCents: offer.paymentPlanCourseFeeCents,
    paymentInFullCourseFeeCents: offer.paymentPlanCourseFeeCents,
    enrolmentPaymentOptions: ["payment_plan"],
    status: "active",
    legalGateClosed: true,
    planPolicy: {
      mode: "derived_regular",
      frequency: "Weekly",
      regularInstalmentCents: 1_250,
      upfrontAmountCents: 0,
    },
  }));
}

export function belaReviewBlackFridayCourse(
  tenant: Pick<NzTenant, "slug" | "providerCode">,
  slug: string,
): NzCourse | null {
  const courses = belaReviewBlackFridayCourses(tenant);
  if (!courses) {
    return null;
  }
  return courses.find((course) => course.slug === slug.trim().toLowerCase()) || null;
}
