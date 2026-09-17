import {
  cataloguePath,
  providerCourseWebsiteUrl,
  safeHeaderLinks,
  safeHeaderPhone,
  safeHeaderSearchUrl,
  safeHeaderSocialLinks,
  safeProviderUrl,
  safePublicAssetPath,
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
    tenant.presentation.headerSearchPlaceholder || "Search …";
  const phoneIconSrc = safePublicAssetPath(tenant.presentation.headerPhoneIconSrc);
  const searchIconSrc = safePublicAssetPath(tenant.presentation.headerSearchIconSrc);

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
                  <SocialIcon network={item.network} iconSrc={item.iconSrc} label={item.label} />
                </a>
              ))}
            </div>
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

          <div className={styles.headerRight}>
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
                    {phoneIconSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={phoneIconSrc} alt="" />
                    ) : (
                      <PhoneFallback />
                    )}
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
                    {searchIconSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={searchIconSrc} alt="" />
                    ) : (
                      <SearchFallback />
                    )}
                  </button>
                  <label className={styles.searchField}>
                    <span className={styles.srOnly}>Search for Courses</span>
                    <input type="search" name="s" placeholder={searchPlaceholder} />
                  </label>
                </form>
              ) : null}

              {searchUrl ? (
                <a
                  className={styles.mobileSearchLink}
                  href={searchUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Search for Courses"
                >
                  <span className={styles.searchSquare} aria-hidden="true">
                    {searchIconSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={searchIconSrc} alt="" />
                    ) : (
                      <SearchFallback />
                    )}
                  </span>
                </a>
              ) : null}

              <details className={styles.mobileMenu}>
                <summary className={styles.menuToggle} aria-label="Open menu">
                  <span className={styles.hamburger} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
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
                        {searchIconSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={searchIconSrc} alt="" />
                        ) : (
                          <SearchFallback />
                        )}
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

function SocialIcon({
  network,
  iconSrc,
  label,
}: {
  network: NzHeaderSocialNetwork;
  iconSrc?: string;
  label: string;
}) {
  if (iconSrc) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={iconSrc} alt="" />;
  }
  if (network === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <title>{label}</title>
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
        <title>{label}</title>
        <path
          fill="currentColor"
          d="M8.5 3h7A5.5 5.5 0 0 1 21 8.5v7A5.5 5.5 0 0 1 15.5 21h-7A5.5 5.5 0 0 1 3 15.5v-7A5.5 5.5 0 0 1 8.5 3zm0 2A3.5 3.5 0 0 0 5 8.5v7A3.5 3.5 0 0 0 8.5 19h7a3.5 3.5 0 0 0 3.5-3.5v-7A3.5 3.5 0 0 0 15.5 5h-7zm8.2 1.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2zM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2zm0 2A1.8 1.8 0 1 0 13.8 12 1.8 1.8 0 0 0 12 10.2z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <title>{label}</title>
      <path
        fill="currentColor"
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-1-.08A6.34 6.34 0 0 0 3.23 16a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.31a8.17 8.17 0 0 0 4.76 1.52V6.79a4.85 4.85 0 0 1-1.08-.1z"
      />
    </svg>
  );
}

function PhoneFallback() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
      <path
        fill="currentColor"
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C12.2 21 3 11.8 3 1c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"
      />
    </svg>
  );
}

function SearchFallback() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
      <path
        fill="currentColor"
        d="M10 4a6 6 0 1 1 0 12A6 6 0 0 1 10 4zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm6.3 8.9 3.4 3.4-1.4 1.4-3.4-3.4a8 8 0 1 1 1.4-1.4z"
      />
    </svg>
  );
}
