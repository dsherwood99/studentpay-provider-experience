import Image from "next/image";
import Link from "next/link";

export function PlatformHeader() {
  return (
    <header className="platform-header">
      <div className="page-shell platform-header__inner">
        <Link href="/" className="platform-brand" aria-label="Academy Australia home">
          <Image
            src="/providers/academy-australia/academy-australia-logo.png"
            alt="Academy Australia"
            width={168}
            height={54}
            className="platform-brand__logo"
            priority
          />
        </Link>

        <nav className="platform-nav" aria-label="Main navigation">
          <Link href="/providers/academy-australia/courses">Courses</Link>
          <a href="/#payment-options">Payment options</a>
          <a href="/#how-it-works">How it works</a>
          <a href="/#why-us">Why us</a>
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
