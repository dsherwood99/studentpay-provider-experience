import { allowSandboxFixtures } from "./environment.ts";
import oliProduction from "./catalogues/oli-production.json" with { type: "json" };
import type { NzCourse, NzPlanPolicy, NzPublicCourse } from "./types.ts";

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
  status: "active" | "inactive";
  sandboxOnly?: boolean;
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
    status: row.status,
    sandboxOnly: row.sandboxOnly,
    sourceRow: row.sourceRow,
    planPolicy: row.planPolicy,
  };
}

const OLI_PRODUCTION_COURSES: readonly NzCourse[] = (
  oliProduction as Array<Parameters<typeof asCourse>[0]>
).map(asCourse);

function courseVisible(course: NzCourse): boolean {
  if (course.status !== "active") {
    return false;
  }
  if (course.sandboxOnly) {
    return allowSandboxFixtures();
  }
  return true;
}

export function listConfiguredNzCourses(): NzCourse[] {
  return [...SANDBOX_FIXTURE_COURSES, ...OLI_PRODUCTION_COURSES];
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
  };
}
