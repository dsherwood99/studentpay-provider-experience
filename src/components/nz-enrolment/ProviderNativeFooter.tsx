import {
  safeFooterCourseLinks,
  safeFooterPhones,
  safeFooterQuickLinks,
  safeProviderUrl,
  safeReturnToProviderUrl,
  safeStudentPayUrl,
  usesSiteFooter,
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
  if (usesSiteFooter(tenant)) {
    return (
      <SiteFooter
        tenant={tenant}
        websiteUrl={websiteUrl}
        studentPayUrl={studentPayUrl}
      />
    );
  }

  const links = [
    ...safeFooterQuickLinks(tenant),
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

function SiteFooter({
  tenant,
  websiteUrl,
  studentPayUrl,
}: {
  tenant: NzPublicTenant;
  websiteUrl: string | null;
  studentPayUrl: string;
}) {
  const quickLinks = safeFooterQuickLinks(tenant);
  const courseLinks = safeFooterCourseLinks(tenant);
  const phones = safeFooterPhones(tenant);
  const tagline = tenant.presentation.footerTagline?.trim();
  const addressLines = tenant.presentation.footerAddressLines || [];
  const contactHeading = tenant.presentation.footerContactHeading || "Get in Touch";

  return (
    <footer className={`${styles.footer} ${styles.siteFooter}`} data-testid="nz-oli-site-footer">
      <div className={styles.siteFooterInner}>
        <div className={styles.siteFooterBrand}>
          {tenant.branding.logoPath ? (
            <a href={websiteUrl || "#"} className={styles.siteFooterLogoLink}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tenant.branding.logoPath}
                alt={tenant.displayName}
                className={styles.siteFooterLogo}
              />
            </a>
          ) : (
            <strong>{tenant.displayName}</strong>
          )}
          {tagline ? <p>{tagline}</p> : null}
        </div>
        {quickLinks.length > 0 ? (
          <nav className={styles.siteFooterCol} aria-label="Quick links">
            <h2>Quick Links</h2>
            <ul>
              {quickLinks.map((item) => (
                <li key={`${item.label}-${item.href}`}>
                  <a href={item.href} target="_blank" rel="noreferrer">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {courseLinks.length > 0 ? (
          <nav className={styles.siteFooterCol} aria-label="Courses">
            <h2>Courses</h2>
            <ul>
              {courseLinks.map((item) => (
                <li key={`${item.label}-${item.href}`}>
                  <a href={item.href} target="_blank" rel="noreferrer">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <div className={styles.siteFooterCol} data-testid="nz-oli-footer-contact">
          <h2>{contactHeading}</h2>
          {addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {phones.map((phone) => (
            <p key={phone.href}>
              <a href={phone.href}>{phone.display}</a>
            </p>
          ))}
          {tenant.supportEmail ? (
            <p>
              <a href={`mailto:${tenant.supportEmail}`}>{tenant.supportEmail}</a>
            </p>
          ) : null}
        </div>
      </div>
      <div className={styles.siteFooterBottom}>
        <span>Payment services powered by StudentPay NZ</span>
        <a href={studentPayUrl}>StudentPay NZ</a>
      </div>
    </footer>
  );
}
