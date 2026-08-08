import Image from "next/image";
import Link from "next/link";

export function PlatformFooter() {
  return (
    <footer className="platform-footer">
      <div className="page-shell platform-footer__grid">
        <div className="platform-footer__brand">
          <Link href="/" className="platform-footer__logo">
            <Image
              src="/providers/academy-australia/academy-australia-logo.png"
              alt="Academy Australia"
              width={160}
              height={52}
            />
          </Link>

          <p>
            Flexible online courses with practical learning, tutor support and
            payment options that fit real life.
          </p>
        </div>

        <div className="platform-footer__links">
          <div>
            <p className="platform-footer__heading">Explore</p>
            <Link href="/providers/academy-australia/courses">Courses</Link>
            <a href="/#payment-options">Payment options</a>
            <a href="/#how-it-works">How it works</a>
          </div>

          <div>
            <p className="platform-footer__heading">Get started</p>
            <Link href="/providers/academy-australia/courses/criminal-psychology/enrol">
              Enrol in Criminal Psychology
            </Link>
            <a href="tel:1300000000">1300 000 000</a>
            <a href="mailto:enrolments@academyaustralia.com">
              enrolments@academyaustralia.com
            </a>
          </div>
        </div>
      </div>

      <div className="page-shell platform-footer__bottom">
        <span>© {new Date().getFullYear()} Academy Australia</span>
        <span>Flexible online learning for career-focused students</span>
      </div>
    </footer>
  );
}
