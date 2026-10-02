import { ProviderNativeHeader } from "@/components/nz-enrolment/ProviderNativeHeader";
import { describeDerivedWeeklyPlan, formatNzdFromCents } from "@/lib/nz-enrolment/plan-math";
import { kitDisclosureForPolicy } from "@/lib/nz-enrolment/kit-policy";
import { cataloguePath } from "@/lib/nz-enrolment/presentation";
import type { NzPublicCourse, NzPublicTenant } from "@/lib/nz-enrolment/types";
import styles from "./provider-chrome.module.css";

type Props = {
  tenant: NzPublicTenant;
  course: NzPublicCourse;
};

export function NzCourseLegalGate({ tenant, course }: Props) {
  const described =
    course.planPolicy.mode === "derived_regular"
      ? describeDerivedWeeklyPlan({
          coursePriceCents: course.paymentPlanCourseFeeCents,
          upfrontAmountCents: course.planPolicy.upfrontAmountCents,
          regularInstalmentCents: course.planPolicy.regularInstalmentCents,
        })
      : null;

  return (
    <>
      <ProviderNativeHeader tenant={tenant} />
      <section className={styles.missing} data-testid="nz-course-legal-gate">
        <p className={styles.category}>{course.category || tenant.displayName}</p>
        <h1>{course.name}</h1>
        <p>
          Course fee <strong>{formatNzdFromCents(course.paymentPlanCourseFeeCents)}</strong>
          {described ? `. ${described.summary}.` : "."}
        </p>
        {kitDisclosureForPolicy(tenant.kitPolicy) ? (
          <p className={styles.note}>{kitDisclosureForPolicy(tenant.kitPolicy)}</p>
        ) : null}
        <p className={styles.note}>
          Enrolment is not open until the provider agreement is active.
        </p>
        <div className={styles.missingActions}>
          <a className={styles.enrol} href={cataloguePath(tenant)}>
            Choose a course
          </a>
          {course.websiteUrl ? (
            <a href={course.websiteUrl}>View on the provider website</a>
          ) : null}
        </div>
      </section>
    </>
  );
}
