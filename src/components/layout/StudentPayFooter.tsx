import Image from "next/image";
import Link from "next/link";

export function StudentPayFooter() {
  return (
    <footer className="sp-platform-footer">
      <div className="page-shell sp-platform-footer__grid">
        <div className="sp-platform-footer__brand">
          <Link href="/" className="sp-platform-footer__logo" aria-label="StudentPay home">
            <Image
              src="/studentpay/studentpay-logo.png"
              alt="StudentPay"
              width={160}
              height={42}
              className="sp-platform-footer__logo-image"
              priority={false}
            />
          </Link>
          <p>
            Reusable enrolment and payment experiences for education providers.
            Demonstrations and integration capabilities for the StudentPay product
            team.
          </p>
        </div>

        <div className="sp-platform-footer__links">
          <div>
            <p className="sp-platform-footer__heading">Explore</p>
            <Link href="/#provider-demos">Provider demos</Link>
            <Link href="/#enrolment-checkout">Enrolment checkout</Link>
            <Link href="/#integration-capabilities">Integration capabilities</Link>
          </div>

          <div>
            <p className="sp-platform-footer__heading">Demo provider</p>
            <Link href="/providers/academy-australia">Academy Australia</Link>
            <Link href="/providers/academy-australia/courses">Course catalogue</Link>
            <Link href="/providers/academy-australia/courses/criminal-psychology/enrol">
              Sample enrolment
            </Link>
          </div>
        </div>
      </div>

      <div className="page-shell sp-platform-footer__bottom">
        <span>© {new Date().getFullYear()} StudentPay</span>
        <span>StudentPay Product Environment — not an education provider</span>
      </div>
    </footer>
  );
}
