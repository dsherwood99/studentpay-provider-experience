import { ProviderNativeHeader } from "@/components/nz-enrolment/ProviderNativeHeader";
import { formatNzdFromCents } from "@/lib/nz-enrolment/plan-math";
import { cataloguePath } from "@/lib/nz-enrolment/presentation";
import type { NzPublicCourse, NzPublicTenant } from "@/lib/nz-enrolment/types";
import styles from "./provider-chrome.module.css";

type Props = {
  tenant: NzPublicTenant;
  course: NzPublicCourse;
};

export function NzCoursePlanNotOpen({ tenant, course }: Props) {
  return (
    <>
      <ProviderNativeHeader tenant={tenant} />
      <section className={styles.missing} data-testid="nz-course-plan-not-open">
        <p className={styles.category}>{course.category || tenant.displayName}</p>
        <h1>{course.name}</h1>
        <p>
          Published price{" "}
          <strong>{formatNzdFromCents(course.paymentPlanCourseFeeCents)}</strong>
          . A StudentPay payment plan is not open for this course yet.
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
