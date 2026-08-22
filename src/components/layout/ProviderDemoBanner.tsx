import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { getPlatformBrand } from "@/lib/provider-experience/branding";

export function ProviderDemoBanner() {
  if (getPlatformBrand() !== "studentpay") {
    return null;
  }

  return (
    <div className="sp-demo-banner" role="note">
      <div className="page-shell sp-demo-banner__inner">
        <FlaskConical size={16} aria-hidden="true" />
        <span>
          <strong>StudentPay Provider Demo</strong>
          <span className="sp-demo-banner__separator">·</span>
          Demonstration environment — provider branding below is illustrative
        </span>
        <Link href="/#provider-demos" className="sp-demo-banner__link">
          Back to product home
        </Link>
      </div>
    </div>
  );
}
