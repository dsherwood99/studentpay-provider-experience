import { Menu, Phone, Search } from "lucide-react";
import {
  cataloguePath,
  providerCourseWebsiteUrl,
  safeHeaderLinks,
  safeHeaderPhone,
  safeHeaderSearchUrl,
  safeHeaderSocialLinks,
  safeProviderUrl,
  usesSiteHeader,
} from "@/lib/nz-enrolment/presentation";
import type { NzHeaderSocialNetwork, NzPublicCourse, NzPublicTenant } from "@/lib/nz-enrolment/types";
import styles from "./provider-chrome.module.css";

type Props = {
  tenant: NzPublicTenant;
  course?: Pick<NzPublicCourse, "slug">;
};

export function ProviderNativeHeader({ tenant, course }: Props) {
  if (usesSiteHeader(tenant)) {
    return <SiteHeader tenant={tenant} course={course} />;
  }
  return <CompactHeader tenant={tenant} course={course} />;
}

function SiteHeader({ tenant, course }: Props) {
  const websiteUrl = safeProviderUrl(tenant.websiteUrl, tenant);
  const homeHref = websiteUrl || cataloguePath(tenant);
  const courseUrl = course ? providerCourseWebsiteUrl(tenant, course) : null;
  const nav = safeHeaderLinks(tenant);
  const social = safeHeaderSocialLinks(tenant);
  const phone = safeHeaderPhone(tenant);
  const searchUrl = safeHeaderSearchUrl(tenant);
  const contextLabel = tenant.presentation.headerContextLabel || "Enrolment";
  const searchPlaceholder =
    tenant.presentation.headerSearchPlaceholder || "Search for Courses";

  return (
    <header className={`${styles.header} ${styles.siteHeader}`} data-testid="nz-provider-header">
      {social.length > 0 ? (
        <div className={styles.utility}>
          <div className={styles.headerInner}>
            <div className={styles.social}>
              {social.map((item) => (
                <a
                  key={item.network}
                  className={styles.socialLink}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                >
                  <SocialIcon network={item.network} />
                </a>
              ))}
            </div>
            <p className={styles.utilityContext}>{contextLabel}</p>
          </div>
        </div>
      ) : null}

      <div className={styles.mainBar}>
        <div className={styles.headerInner}>
          <a
            className={styles.brand}
            href={homeHref}
            target="_blank"
            rel="noreferrer"
            aria-label={`${tenant.displayName} home`}
          >
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

          {nav.length > 0 ? (
            <nav className={styles.siteNav} aria-label={`${tenant.displayName} website`}>
              {nav.map((item) => (
                <a key={`${item.label}-${item.href}`} href={item.href} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ))}
            </nav>
          ) : null}

          <div className={styles.headerTools}>
            {phone ? (
              <a className={styles.phone} href={phone.href}>
                <span className={styles.phoneIcon} aria-hidden="true">
                  <Phone size={18} strokeWidth={2.2} />
                </span>
                <span className={styles.phoneNumber}>{phone.display}</span>
              </a>
            ) : null}

            {searchUrl ? (
              <form
                className={styles.search}
                action={searchUrl}
                method="get"
                target="_blank"
              >
                <button className={styles.searchSubmit} type="submit" aria-label="Search for courses">
                  <Search size={18} strokeWidth={2.2} />
                </button>
                <label className={styles.searchField}>
                  <span className={styles.srOnly}>Search for Courses</span>
                  <input type="search" name="s" placeholder={searchPlaceholder} />
                </label>
              </form>
            ) : null}

            {searchUrl ? (
              <a
                className={styles.mobileSearch}
                href={searchUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Search for Courses"
              >
                <span className={styles.phoneIcon} aria-hidden="true">
                  <Search size={18} strokeWidth={2.2} />
                </span>
              </a>
            ) : null}

            <details className={styles.mobileMenu}>
              <summary className={styles.menuToggle} aria-label="Open menu">
                <Menu size={22} strokeWidth={2.2} />
              </summary>
              <div className={styles.mobilePanel}>
                {phone ? (
                  <a href={phone.href}>{phone.display}</a>
                ) : null}
                {nav.map((item) => (
                  <a key={`mobile-${item.label}`} href={item.href} target="_blank" rel="noreferrer">
                    {item.label}
                  </a>
                ))}
                {courseUrl ? (
                  <a href={courseUrl} target="_blank" rel="noreferrer">
                    Back to course
                  </a>
                ) : null}
                {searchUrl ? (
                  <form
                    className={styles.search}
                    action={searchUrl}
                    method="get"
                    target="_blank"
                  >
                    <button className={styles.searchSubmit} type="submit" aria-label="Search for courses">
                      <Search size={18} strokeWidth={2.2} />
                    </button>
                    <label className={styles.searchField}>
                      <span className={styles.srOnly}>Search for Courses</span>
                      <input type="search" name="s" placeholder={searchPlaceholder} />
                    </label>
                  </form>
                ) : null}
              </div>
            </details>
          </div>
        </div>
      </div>

      {courseUrl ? (
        <div className={styles.contextRow}>
          <div className={styles.headerInner}>
            <span>{contextLabel}</span>
            <a href={courseUrl} target="_blank" rel="noreferrer">
              Back to course
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function CompactHeader({ tenant, course }: Props) {
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
            <a className={styles.backLink} href={courseUrl} target="_blank" rel="noreferrer">
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

function SocialIcon({ network }: { network: NzHeaderSocialNetwork }) {
  if (network === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M14.5 8.5V6.8c0-.7.5-1.3 1.5-1.3h1V3h-2.1C12.3 3 11 4.6 11 6.6v2H9v2.6h2V21h3.2v-9.9h2.2l.6-2.6h-2.5z"
        />
      </svg>
    );
  }
  if (network === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8.5 3h7A5.5 5.5 0 0 1 21 8.5v7A5.5 5.5 0 0 1 15.5 21h-7A5.5 5.5 0 0 1 3 15.5v-7A5.5 5.5 0 0 1 8.5 3zm0 2A3.5 3.5 0 0 0 5 8.5v7A3.5 3.5 0 0 0 8.5 19h7a3.5 3.5 0 0 0 3.5-3.5v-7A3.5 3.5 0 0 0 15.5 5h-7zm8.2 1.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2zM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2zm0 2A1.8 1.8 0 1 0 13.8 12 1.8 1.8 0 0 0 12 10.2z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-1-.08A6.34 6.34 0 0 0 3.23 16a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.31a8.17 8.17 0 0 0 4.76 1.52V6.79a4.85 4.85 0 0 1-1.08-.1z"
      />
    </svg>
  );
}
