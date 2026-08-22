import Image from "next/image";
import Link from "next/link";

export function StudentPayHeader() {
  return (
    <header className="sp-platform-header">
      <div className="page-shell sp-platform-header__inner">
        <Link href="/" className="sp-platform-brand" aria-label="StudentPay home">
          <Image
            src="/studentpay/studentpay-logo.png"
            alt="StudentPay"
            width={180}
            height={48}
            className="sp-platform-brand__logo"
            priority
          />
        </Link>

        <nav className="sp-platform-nav" aria-label="Main navigation">
          <Link href="/#provider-demos">Provider demos</Link>
          <Link href="/#enrolment-checkout">Enrolment checkout</Link>
          <Link href="/#integration-capabilities">Integration capabilities</Link>
        </nav>
      </div>
    </header>
  );
}
