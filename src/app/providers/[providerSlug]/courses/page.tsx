import { ProviderBrand } from "@/components/providers/ProviderBrand";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseCard } from "@/components/courses/CourseCard";
import { getCoursesByProvider } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";

type CourseCataloguePageProps = {
  params: Promise<{
    providerSlug: string;
  }>;
};

export default async function CourseCataloguePage({
  params,
}: CourseCataloguePageProps) {
  const { providerSlug } = await params;
  const provider = getProviderBySlug(providerSlug);

  if (!provider) {
    notFound();
  }

  const providerCourses = getCoursesByProvider(provider.code);

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
              Explore flexible online courses across beauty, psychology,
              technology and animal care, with upfront and payment-plan options
              available.
            </p>
          </div>

          <ProviderBrand
            provider={provider}
            width={235}
            height={90}
          />
        </div>
      </section>

      <section className="course-catalogue-content">
        <div className="page-shell">
          <div className="course-catalogue-toolbar">
            <div>
              <strong>{providerCourses.length} demo courses</strong>
              <span>More provider courses can be added through configuration.</span>
            </div>

            <div className="course-catalogue-filters" aria-label="Course filters">
              <button type="button" className="is-active">
                All courses
              </button>
              <button type="button">Online</button>
              <button type="button">Payment plans</button>
            </div>
          </div>

          <div className="course-grid">
            {providerCourses.map((course) => (
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