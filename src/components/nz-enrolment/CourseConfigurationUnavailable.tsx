import { ProviderNativeHeader } from "@/components/nz-enrolment/ProviderNativeHeader";
import {
  cataloguePath,
  safeReturnToProviderUrl,
} from "@/lib/nz-enrolment/presentation";
import type { NzPublicTenant } from "@/lib/nz-enrolment/types";
import styles from "./provider-chrome.module.css";

type Props = {
  tenant: NzPublicTenant;
};

export function NzCourseConfigurationUnavailable({ tenant }: Props) {
  const returnUrl = safeReturnToProviderUrl(tenant);

  return (
    <>
      <ProviderNativeHeader tenant={tenant} />
      <section
        className={styles.missing}
        data-testid="nz-course-configuration-unavailable"
      >
        <h1>Enrolment options unavailable</h1>
        <p>
          We’re unable to load the current enrolment options for this course.
          Please try again shortly or contact {tenant.displayName}.
        </p>
        <div className={styles.missingActions}>
          <a className={styles.enrol} href={cataloguePath(tenant)}>
            Choose a course
          </a>
          {returnUrl ? (
            <a href={returnUrl}>
              {tenant.presentation.returnToProviderLabel ||
                `Return to ${tenant.displayName}`}
            </a>
          ) : null}
        </div>
      </section>
    </>
  );
}
