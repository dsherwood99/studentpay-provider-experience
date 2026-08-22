import Image from "next/image";
import Link from "next/link";

export function AcademyAustraliaHeader() {
  return (
    <header className="platform-header">
      <div className="page-shell platform-header__inner">
        <Link
          href="/"
          className="platform-brand"
          aria-label="Academy Australia home"
        >
          <Image
            src="/providers/academy-australia/academy-australia-logo.png"
            alt="Academy Australia"
            width={240}
            height={78}
            className="platform-brand__logo"
            priority
          />
        </Link>

        <nav className="platform-nav" aria-label="Main navigation">
          <Link href="/providers/academy-australia/courses">Courses</Link>
          <Link href="/#payment-options">Payment options</Link>
          <Link
            href="/providers/academy-australia/courses/criminal-psychology/enrol"
            className="platform-nav__enrol"
          >
            Enrol now
          </Link>
        </nav>

        <a href="tel:1300000000" className="platform-header__phone">
          1300 000 000
        </a>
      </div>
    </header>
  );
}
