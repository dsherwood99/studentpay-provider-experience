import Link from "next/link";

export function PlatformHeader() {
  return (
    <header className="platform-header">
      <div className="page-shell platform-header__inner">
        <Link href="/" className="platform-brand">
          <span className="platform-brand__student">StudentPay</span>
          <span className="platform-brand__pay"> Enrolment</span>
        </Link>

        <nav className="platform-nav" aria-label="Main navigation">
          <Link href="/">Platform</Link>
          <Link href="/providers/academy-australia">Providers</Link>
          <Link href="/providers/academy-australia/courses">Courses</Link>
          <Link href="/providers/academy-australia/courses/criminal-psychology/enrol">
            Sandbox enrol
          </Link>
        </nav>
      </div>
    </header>
  );
}