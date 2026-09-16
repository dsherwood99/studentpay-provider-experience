import {
  cataloguePath,
  providerCourseWebsiteUrl,
  safeProviderUrl,
} from "@/lib/nz-enrolment/presentation";
import type { NzPublicCourse, NzPublicTenant } from "@/lib/nz-enrolment/types";
import styles from "./provider-chrome.module.css";

type Props = {
  tenant: NzPublicTenant;
  course?: Pick<NzPublicCourse, "slug">;
};

export function ProviderNativeHeader({ tenant, course }: Props) {
  const websiteUrl = safeProviderUrl(tenant.websiteUrl, tenant);
  const homeHref = websiteUrl || cataloguePath(tenant);
  const courseUrl = course ? providerCourseWebsiteUrl(tenant, course) : null;

  return (
    <header className={styles.header} data-testid="nz-provider-header">
      <div className={styles.headerInner}>
        <a className={styles.brand} href={homeHref} aria-label={`${tenant.displayName} home`}>
          {tenant.branding.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.logo}
              src={tenant.branding.logoPath}
              alt={tenant.displayName}
            />
          ) : (
            <span className={styles.brandName}>{tenant.displayName}</span>
          )}
          <span className={styles.brandEnrol}>Enrolment</span>
        </a>

        <nav className={styles.nav} aria-label={`${tenant.displayName} enrolment`}>
          {courseUrl ? (
            <a className={styles.backLink} href={courseUrl}>
              Back to course
            </a>
          ) : null}
          {tenant.supportPhone ? (
            <a className={styles.help} href={`tel:${tenant.supportPhone.replace(/\s+/g, "")}`}>
              <span className={styles.helpLabel}>Need help?</span>
              <span className={styles.helpNumber}>{tenant.supportPhone}</span>
            </a>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
