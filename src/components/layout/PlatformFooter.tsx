import Link from "next/link";

export function PlatformFooter() {
  return (
    <footer className="platform-footer">
      <div className="page-shell platform-footer__grid">
        <div className="platform-footer__brand">
          <Link href="/" className="platform-footer__logo">
            <span>StudentPay</span>
            <strong> Enrolment</strong>
          </Link>

          <p>
            Modern course discovery, guided enrolment and flexible payment
            experiences for education providers.
          </p>
        </div>

        <div className="platform-footer__links">
          <div>
            <p className="platform-footer__heading">Platform</p>
            <Link href="/">Overview</Link>
            <Link href="/providers/academy-australia">Provider demo</Link>
            <Link href="/providers/academy-australia/courses">Courses</Link>
            <Link href="/enrol/bela-beauty/">Bela Beauty NZ enrol</Link>
          </div>

          <div>
            <p className="platform-footer__heading">Demonstration</p>
            <p className="platform-footer__note">
              This is a demonstration environment. No enrolment or payment is
              submitted from this version.
            </p>
          </div>
        </div>
      </div>

      <div className="page-shell platform-footer__bottom">
        <span>© 2026 StudentPay</span>
        <span>Built for Australian education providers</span>
      </div>
    </footer>
  );
}