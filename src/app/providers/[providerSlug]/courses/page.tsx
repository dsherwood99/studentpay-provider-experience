import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogueCourseCard } from "@/components/courses/CatalogueCourseCard";
import { CatalogueUnavailable } from "@/components/courses/CatalogueUnavailable";
import { CourseCard } from "@/components/courses/CourseCard";
import { ProviderIdentity } from "@/components/providers/ProviderIdentity";
import { getCoursesByProvider } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";
import { isCatalogueProvider } from "@/lib/provider-experience/catalogue";
import { listCatalogueCourses } from "@/lib/provider-experience/catalogue-server";
import { isProviderSlugBlockedByDeployment } from "@/lib/provider-experience/provider-bindings";

type CourseCataloguePageProps = {
  params: Promise<{
    providerSlug: string;
  }>;
};

export default async function CourseCataloguePage({
  params,
}: CourseCataloguePageProps) {
  const { providerSlug } = await params;

  if (isProviderSlugBlockedByDeployment(providerSlug)) {
    notFound();
  }

  const provider = getProviderBySlug(providerSlug);

  if (!provider) {
    notFound();
  }

  const catalogueMode = isCatalogueProvider(provider);
  const catalogueLoad = catalogueMode
    ? await listCatalogueCourses(provider)
    : null;

  if (catalogueLoad?.status === "unavailable") {
    return (
      <CatalogueUnavailable provider={provider} code={catalogueLoad.code} />
    );
  }

  const catalogueCourses =
    catalogueLoad?.status === "ready" ? catalogueLoad.courses : [];
  const legacyCourses = catalogueMode
    ? []
    : getCoursesByProvider(provider.code);
  const courseCount = catalogueMode
    ? catalogueCourses.length
    : legacyCourses.length;

  return (
    <div className="course-catalogue-page">
      <section className="course-catalogue-hero">
        <div className="page-shell course-catalogue-hero__grid">
          <div>
            <Link
              href={`/providers/${provider.slug}`}
              className="provider-back-link"
            >
              ← {provider.name}
            </Link>

            <p className="provider-eyebrow">Course catalogue</p>

            <h1>Find the right course for your future.</h1>

            <p>
              {catalogueMode
                ? `Explore current ${provider.name} courses and payment plans.`
                : "Explore flexible online courses across beauty, psychology, technology and animal care, with upfront and payment-plan options available."}
            </p>
          </div>

          <ProviderIdentity provider={provider} width={235} height={90} />
        </div>
      </section>

      <section className="course-catalogue-content">
        <div className="page-shell">
          <div className="course-catalogue-toolbar">
            <div>
              <strong>
                {courseCount} {catalogueMode ? "courses" : "demo courses"}
              </strong>
              <span>
                {catalogueMode
                  ? "Prices are loaded from the StudentPay catalogue."
                  : "More provider courses can be added through configuration."}
              </span>
            </div>
          </div>

          <div className="course-grid">
            {catalogueMode
              ? catalogueCourses.map((course) => (
                  <CatalogueCourseCard
                    key={course.code}
                    course={course}
                    providerSlug={provider.slug}
                  />
                ))
              : legacyCourses.map((course) => (
                  <CourseCard
                    key={course.code}
                    course={course}
                    providerSlug={provider.slug}
                  />
                ))}
          </div>
        </div>
      </section>
    </div>
  );
}
