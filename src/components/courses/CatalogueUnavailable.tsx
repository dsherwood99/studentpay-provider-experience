import Link from "next/link";
import { ProviderIdentity } from "@/components/providers/ProviderIdentity";
import { catalogueUnavailableCopy } from "@/lib/provider-experience/catalogue-availability";
import type { Provider } from "@/types/provider";

type CatalogueUnavailableProps = {
  provider: Provider;
  code: string;
};

export function CatalogueUnavailable({
  provider,
  code,
}: CatalogueUnavailableProps) {
  const copy = catalogueUnavailableCopy(code, provider.name);

  return (
    <div className="course-catalogue-page">
      <section className="course-catalogue-hero">
        <div className="page-shell course-catalogue-hero__grid">
          <div>
            <p className="provider-eyebrow">Enrolment</p>
            <ProviderIdentity provider={provider} width={235} height={90} />
            <h1>{copy.title}</h1>
            <p>{copy.body}</p>
            <p>
              <Link href="/" className="provider-back-link">
                ← Back to StudentPay
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
