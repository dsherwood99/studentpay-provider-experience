import Link from "next/link";
import { ProviderIdentity } from "@/components/providers/ProviderIdentity";
import {
  dedicatedProductionHomePath,
  getDedicatedProductionProvider,
} from "@/lib/provider-experience/host-isolation";

export function BelaBeautyHeader() {
  const provider = getDedicatedProductionProvider();
  const homePath = dedicatedProductionHomePath() || "/";

  if (!provider) {
    return null;
  }

  return (
    <header className="platform-header">
      <div className="page-shell platform-header__inner">
        <Link
          href={homePath}
          className="platform-brand"
          aria-label={`${provider.name} home`}
        >
          <ProviderIdentity
            provider={provider}
            width={240}
            height={64}
            className="platform-brand__logo"
            priority
          />
        </Link>
      </div>
    </header>
  );
}
