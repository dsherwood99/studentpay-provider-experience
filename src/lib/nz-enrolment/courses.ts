import {
  allowSandboxFixtures,
  configuredNzHostedTenantSlug,
  isInternalE13CanaryHostedEnabled,
} from "./environment.ts";
import { getNzTenantBySlug } from "./tenants.ts";
import { courseEnrolmentPaymentOptions } from "./pay-in-full.ts";
import oliProduction from "./catalogues/oli-production.json" with { type: "json" };
import belaWebsiteCatalogue from "./catalogues/bela-website-courses.json" with { type: "json" };
import type {
  NzCourse,
  NzEnrolmentPaymentOption,
  NzPlanPolicy,
  NzPublicCourse,
} from "./types.ts";

const SANDBOX_FIXTURE_COURSES: readonly NzCourse[] = [
  {
    courseCode: "OLI_SANDBOX_CERT_COURSE",
    slug: "certification-course",
    providerSlug: "oli",
    name: "Sandbox Certification Course",
    description:
      "StudentPay NZ sandbox certification course for Online Learning Institute hosted enrolment. Not a live student offering.",
    paymentPlanCourseFeeCents: 120_000,
    paymentInFullCourseFeeCents: 120_000,
    status: "active",
    sandboxOnly: true,
    duration: "Self-paced",
    planPolicy: {
      mode: "derived_regular",
      frequency: "Weekly",
      regularInstalmentCents: 2500,
      upfrontAmountCents: 0,
    },
  },
  {
    courseCode: "OLI_TEST_001",
    slug: "studentpay-test-course",
    providerSlug: "oli",
    name: "OLI Test Course – StudentPay",
    description:
      "StudentPay NZ sandbox-only test course for validating OLI Hosted Checkout, Pay Now and Payment Plan enrolment. Not a live student offering.",
    paymentPlanCourseFeeCents: 1000,
    paymentInFullCourseFeeCents: 1000,
    enrolmentPaymentOptions: ["payment_plan", "pay_in_full"],
    status: "active",
    sandboxOnly: true,
    duration: "Test only",
    planPolicy: {
      mode: "derived_regular",
      frequency: "Weekly",
      regularInstalmentCents: 250,
      upfrontAmountCents: 0,
    },
  },
  {
    courseCode: "FIXTURE_EXAMPLE_CERTIFICATE",
    slug: "example-certificate",
    providerSlug: "fixture-institute",
    name: "Example Certificate",
    description:
      "Generic fixture course used to prove Enrolment Checkout is tenant-configured, not OLI-hardcoded.",
    paymentPlanCourseFeeCents: 120_000,
    paymentInFullCourseFeeCents: 120_000,
    status: "active",
    sandboxOnly: true,
    planPolicy: {
      mode: "student_selected_equal",
      frequency: "Monthly",
      numberOfInstalments: 12,
      upfrontAmountCents: 0,
    },
  },
  {
    courseCode: "BELA_LASH_BUSINESS_BUNDLE",
    slug: "lash-business-bundle",
    providerSlug: "bela-nz",
    name: "Lash Business Bundle",
    description:
      "Lash Business Bundle — Bela Beauty College. Payment-plan course fee is the StudentPay financed amount. Hosted Pay in Full is disabled.",
    paymentPlanCourseFeeCents: 280_000,
    paymentInFullCourseFeeCents: 280_000,
    enrolmentPaymentOptions: ["payment_plan"],
    status: "active",
    sandboxOnly: true,
    showWhenEnrolmentClosed: true,
    websiteUrl: "https://belabeautycollege.com/products/the-ultimate-lash-business-bundle",
    duration: "Self-paced",
    planPolicy: {
      mode: "derived_regular",
      frequency: "Weekly",
      regularInstalmentCents: 1500,
      upfrontAmountCents: 1000,
    },
  },
  {
    courseCode: "E13_PROD_CANARY_001",
    slug: "e13-prod-canary-001",
    providerSlug: "studentpay-internal-e13",
    name: "E13 Production Canary $1.00 (internal — not a student offering)",
    description:
      "Dedicated StudentPay internal Production Pay in Full canary. Not a live education-provider course.",
    paymentPlanCourseFeeCents: 100,
    paymentInFullCourseFeeCents: 100,
    enrolmentPaymentOptions: ["pay_in_full"],
    status: "active",
    internalCanary: true,
    duration: "Internal canary",
    planPolicy: {
      mode: "derived_regular",
      frequency: "Weekly",
      regularInstalmentCents: 100,
      upfrontAmountCents: 0,
    },
  },
];

function asCourse(row: {
  courseCode: string;
  slug: string;
  providerSlug: string;
  name: string;
  category?: string;
  description: string;
  paymentInFullCourseFeeCents: number;
  paymentPlanCourseFeeCents: number;
  enrolmentPaymentOptions?: readonly NzEnrolmentPaymentOption[];
  status: "active" | "inactive";
  catalogueOnly?: boolean;
  showWhenEnrolmentClosed?: boolean;
  websiteUrl?: string;
  sortOrder?: number;
  sandboxOnly?: boolean;
  internalCanary?: boolean;
  sourceRow?: number;
  planPolicy: NzPlanPolicy;
}): NzCourse {
  return {
    courseCode: row.courseCode,
    slug: row.slug,
    providerSlug: row.providerSlug,
    name: row.name,
    category: row.category,
    description: row.description,
    paymentInFullCourseFeeCents: row.paymentInFullCourseFeeCents,
    paymentPlanCourseFeeCents: row.paymentPlanCourseFeeCents,
    enrolmentPaymentOptions:
      row.enrolmentPaymentOptions ??
      (row.providerSlug === "oli" ? ["payment_plan", "pay_in_full"] : undefined),
    status: row.status,
    catalogueOnly: row.catalogueOnly,
    showWhenEnrolmentClosed: row.showWhenEnrolmentClosed,
    websiteUrl: row.websiteUrl,
    sortOrder: row.sortOrder,
    sandboxOnly: row.sandboxOnly,
    internalCanary: row.internalCanary,
    sourceRow: row.sourceRow,
    planPolicy: row.planPolicy,
  };
}

const OLI_PRODUCTION_COURSES: readonly NzCourse[] = (
  oliProduction as Array<Parameters<typeof asCourse>[0]>
).map(asCourse);

type BelaWebsiteRow = {
  handle: string;
  name: string;
  category: string;
  publishedPriceCents: number;
  sourceUrl: string;
  sortOrder: number;
  studentPaySlug?: string;
};

function belaCourseCode(handle: string): string {
  return `BELA_${handle.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toUpperCase()}`;
}

const LASH_BUSINESS_BUNDLE = SANDBOX_FIXTURE_COURSES.find(
  (course) => course.slug === "lash-business-bundle",
);

function belaWebsiteCourses(): NzCourse[] {
  const lash = LASH_BUSINESS_BUNDLE;
  if (!lash) {
    throw new Error("Lash Business Bundle fixture is missing.");
  }
  const rows = belaWebsiteCatalogue.courses as BelaWebsiteRow[];
  return rows.map((row) => {
    if (row.studentPaySlug === lash.slug) {
      return {
        ...lash,
        category: row.category,
        sortOrder: row.sortOrder,
        websiteUrl: row.sourceUrl,
      };
    }
    return {
      courseCode: belaCourseCode(row.handle),
      slug: row.handle,
      providerSlug: "bela-nz",
      name: row.name,
      category: row.category,
      description:
        "Listed from the Bela Beauty College website. A StudentPay payment plan is not open for this course.",
      paymentPlanCourseFeeCents: row.publishedPriceCents,
      paymentInFullCourseFeeCents: row.publishedPriceCents,
      enrolmentPaymentOptions: [],
      status: "active" as const,
      catalogueOnly: true,
      sandboxOnly: true,
      sortOrder: row.sortOrder,
      websiteUrl: row.sourceUrl,
      planPolicy: {
        mode: "derived_regular" as const,
        frequency: "Weekly" as const,
        regularInstalmentCents: 0,
        upfrontAmountCents: 0,
      },
    };
  });
}

const BELA_WEBSITE_COURSES = belaWebsiteCourses();

function courseVisible(course: NzCourse): boolean {
  if (course.status !== "active") {
    return false;
  }
  if (course.internalCanary) {
    return isInternalE13CanaryHostedEnabled();
  }
  const boundSlug = configuredNzHostedTenantSlug();
  if (boundSlug && course.providerSlug !== boundSlug) {
    return false;
  }
  if (course.sandboxOnly) {
    if (allowSandboxFixtures()) {
      return true;
    }
    if (boundSlug && course.providerSlug === boundSlug) {
      return getNzTenantBySlug(boundSlug)?.sandboxOnly === true;
    }
    return false;
  }
  return true;
}

export function listConfiguredNzCourses(): NzCourse[] {
  const fixtures = SANDBOX_FIXTURE_COURSES.filter(
    (course) => course.slug !== "lash-business-bundle",
  );
  return [...fixtures, ...BELA_WEBSITE_COURSES, ...OLI_PRODUCTION_COURSES];
}

export function getNzCoursesForProvider(providerSlug: string): NzCourse[] {
  const slug = providerSlug.trim().toLowerCase();
  return listConfiguredNzCourses().filter(
    (course) => course.providerSlug === slug && courseVisible(course),
  );
}

export function getNzCourse(
  providerSlug: string,
  courseSlug: string,
): NzCourse | undefined {
  const provider = providerSlug.trim().toLowerCase();
  const course = courseSlug.trim().toLowerCase();
  const found = listConfiguredNzCourses().find(
    (item) => item.providerSlug === provider && item.slug === course,
  );
  return found && courseVisible(found) ? found : undefined;
}

export function toPublicCourse(course: NzCourse): NzPublicCourse {
  const planDefaults =
    course.planPolicy.mode === "derived_regular"
      ? {
          upfrontAmountCents: course.planPolicy.upfrontAmountCents,
          frequency: course.planPolicy.frequency,
          regularInstalmentCents: course.planPolicy.regularInstalmentCents,
        }
      : {
          upfrontAmountCents: course.planPolicy.upfrontAmountCents,
          frequency: course.planPolicy.frequency,
          numberOfInstalments: course.planPolicy.numberOfInstalments,
        };

  return {
    slug: course.slug,
    courseCode: course.courseCode,
    name: course.name,
    category: course.category,
    description: course.description,
    priceCents: course.paymentPlanCourseFeeCents,
    paymentPlanCourseFeeCents: course.paymentPlanCourseFeeCents,
    paymentInFullCourseFeeCents: course.paymentInFullCourseFeeCents,
    duration: course.duration,
    planPolicy: course.planPolicy,
    planDefaults,
    enrolmentPaymentOptions: courseEnrolmentPaymentOptions(course),
    catalogueOnly: course.catalogueOnly,
    legalGateClosed: course.legalGateClosed,
    websiteUrl: course.websiteUrl,
    ...(course.providerStudentAgreement
      ? { providerStudentAgreement: course.providerStudentAgreement }
      : {}),
  };
}
