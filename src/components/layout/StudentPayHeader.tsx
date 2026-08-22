import Image from "next/image";
import Link from "next/link";
import { StudentPayButton } from "@/components/studentpay/StudentPayButton";

const navItems = [
  { href: "/#provider-demos", label: "Provider demos" },
  { href: "/#enrolment-checkout", label: "Enrolment checkout" },
  { href: "/#integrations", label: "Integrations" },
  { href: "/#integrations", label: "Developers" },
] as const;

export function StudentPayHeader() {
  return (
    <header className="sp-site-header">
      <div className="sp-shell sp-site-header__inner">
        <Link href="/" className="sp-site-header__brand" aria-label="StudentPay home">
          <Image
            src="/studentpay/studentpay-logo.png"
            alt="StudentPay"
            width={160}
            height={44}
            className="sp-site-header__logo"
            priority
          />
        </Link>

        <nav className="sp-site-header__nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sp-site-header__actions">
          <StudentPayButton
            href="/providers/academy-australia/courses/criminal-psychology/enrol"
            showArrow
            className="sp-btn--compact"
          >
            View demo
          </StudentPayButton>
        </div>
      </div>
    </header>
  );
}
