import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import { getPlatformBrand } from "@/lib/provider-experience/branding";

export function ProviderDemoBanner() {
  if (getPlatformBrand() !== "studentpay") {
    return null;
  }

  return (
    <div className="sp-demo-banner" role="note">
      <div className="sp-shell sp-demo-banner__inner">
        <FlaskConical size={16} aria-hidden="true" />
        <span>
          <strong>Demonstration environment</strong> — provider branding below
          is illustrative, not StudentPay
        </span>
        <Link href="/" className="sp-demo-banner__link">
          Back to product home
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
