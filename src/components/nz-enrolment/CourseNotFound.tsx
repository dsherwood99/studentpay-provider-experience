import {
  cataloguePath,
  safeReturnToProviderUrl,
} from "@/lib/nz-enrolment/presentation";
import type { NzPublicTenant } from "@/lib/nz-enrolment/types";
import styles from "./provider-chrome.module.css";

type Props = {
  tenant: NzPublicTenant;
  courseSlug: string;
};

export function NzCourseNotFound({ tenant, courseSlug }: Props) {
  const returnUrl = safeReturnToProviderUrl(tenant);

  return (
    <section className={styles.missing}>
      <h1>Course not found</h1>
      <p>
        We could not find an enrolment checkout for{" "}
        <strong>{courseSlug}</strong> at {tenant.displayName}. Check the link from
        the course page, or choose a course from the list.
      </p>
      <div className={styles.missingActions}>
        <a className={styles.enrol} href={cataloguePath(tenant)}>
          Choose a course
        </a>
        {returnUrl ? (
          <a href={returnUrl}>
            {tenant.presentation.returnToProviderLabel || `Return to ${tenant.displayName}`}
          </a>
        ) : null}
      </div>
    </section>
  );
}
