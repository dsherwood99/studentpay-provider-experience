import Image from "next/image";
import Link from "next/link";

export function StudentPayFooter() {
  return (
    <footer className="sp-site-footer">
      <div className="sp-shell sp-site-footer__top">
        <div className="sp-site-footer__brand">
          <Link href="/" aria-label="StudentPay home">
            <Image
              src="/studentpay/studentpay-logo.png"
              alt="StudentPay"
              width={140}
              height={38}
              className="sp-site-footer__logo"
            />
          </Link>
          <p>
            A reusable product environment for demonstrating StudentPay
            enrolment, payment and integration capabilities.
          </p>
        </div>

        <div className="sp-site-footer__links">
          <div>
            <p className="sp-site-footer__heading">Product</p>
            <Link href="/#provider-demos">Provider demos</Link>
            <Link href="/#enrolment-checkout">Enrolment checkout</Link>
            <Link href="/#integrations">Integrations</Link>
          </div>

          <div>
            <p className="sp-site-footer__heading">Demonstration</p>
            <Link href="/providers/academy-australia">Academy Australia</Link>
            <Link href="/providers/academy-australia/courses">
              Course catalogue
            </Link>
          </div>
        </div>
      </div>

      <div className="sp-shell sp-site-footer__bottom">
        <span>© {new Date().getFullYear()} StudentPay</span>
        <span>Product environment — not an education provider</span>
      </div>
    </footer>
  );
}
