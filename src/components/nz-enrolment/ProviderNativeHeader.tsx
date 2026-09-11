import {
  safeHeaderLinks,
  safeProviderUrl,
  safeStudentPayUrl,
} from "@/lib/nz-enrolment/presentation";
import type { NzPublicTenant } from "@/lib/nz-enrolment/types";
import { cataloguePath } from "@/lib/nz-enrolment/presentation";
import styles from "./provider-chrome.module.css";

type Props = {
  tenant: NzPublicTenant;
};

export function ProviderNativeHeader({ tenant }: Props) {
  const websiteUrl = safeProviderUrl(tenant.websiteUrl, tenant);
  const headerLinks = safeHeaderLinks(tenant);
  const studentPayUrl = safeStudentPayUrl(tenant);
  const homeHref = websiteUrl || cataloguePath(tenant);

  return (
    <header className={styles.header}>
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
        </a>

        <nav className={styles.nav} aria-label={`${tenant.displayName} enrolment`}>
          {headerLinks.map((item) => (
            <a key={`${item.label}-${item.href}`} href={item.href}>
              {item.label}
            </a>
          ))}
          {tenant.supportPhone ? (
            <a className={styles.phone} href={`tel:${tenant.supportPhone.replace(/\s+/g, "")}`}>
              {tenant.supportPhone}
            </a>
          ) : null}
          <p className={styles.attribution}>
            <a href={studentPayUrl}>{tenant.presentation.attributionLabel}</a>
          </p>
        </nav>
      </div>
    </header>
  );
}
