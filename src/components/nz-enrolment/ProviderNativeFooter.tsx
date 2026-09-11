import {
  safeHeaderLinks,
  safeProviderUrl,
  safeReturnToProviderUrl,
  safeStudentPayUrl,
} from "@/lib/nz-enrolment/presentation";
import type { NzPublicTenant } from "@/lib/nz-enrolment/types";
import styles from "./provider-chrome.module.css";

type Props = {
  tenant: NzPublicTenant;
};

export function ProviderNativeFooter({ tenant }: Props) {
  const websiteUrl = safeProviderUrl(tenant.websiteUrl, tenant);
  const returnUrl = safeReturnToProviderUrl(tenant);
  const studentPayUrl = safeStudentPayUrl(tenant);
  const links = [
    ...safeHeaderLinks(tenant),
    tenant.privacyUrl
      ? { label: "Privacy", href: tenant.privacyUrl }
      : null,
    tenant.termsUrl ? { label: "Terms", href: tenant.termsUrl } : null,
    returnUrl
      ? {
          label: tenant.presentation.returnToProviderLabel || `Return to ${tenant.displayName}`,
          href: returnUrl,
        }
      : null,
  ].filter((item): item is { label: string; href: string } => {
    if (!item) {
      return false;
    }
    return Boolean(safeProviderUrl(item.href, tenant) || item.href === studentPayUrl);
  });

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <strong>{tenant.displayName}</strong>
          <p>
            {tenant.displayName} provides the course.{" "}
            {tenant.presentation.attributionLabel}.
          </p>
          {tenant.supportEmail ? (
            <p>
              <a href={`mailto:${tenant.supportEmail}`}>{tenant.supportEmail}</a>
              {tenant.supportPhone ? ` · ${tenant.supportPhone}` : null}
            </p>
          ) : null}
        </div>
        <div className={styles.footerLinks}>
          {links.map((item) => (
            <a key={`${item.label}-${item.href}`} href={item.href}>
              {item.label}
            </a>
          ))}
        </div>
      </div>
      <div className={styles.footerBottom}>
        <span>
          © {new Date().getFullYear()} {tenant.displayName}
        </span>
        <a href={studentPayUrl}>{tenant.presentation.attributionLabel}</a>
        {websiteUrl ? <a href={websiteUrl}>{tenant.displayName} website</a> : null}
      </div>
    </footer>
  );
}
