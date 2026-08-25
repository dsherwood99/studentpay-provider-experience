import Link from "next/link";
import { KitDisclosure } from "@/components/courses/KitDisclosure";
import { PricingSummary } from "@/components/courses/PricingSummary";
import { ProviderIdentity } from "@/components/providers/ProviderIdentity";
import type { CatalogueCourseView } from "@/types/catalogue";
import type { Provider } from "@/types/provider";

type CatalogueCoursePageProps = {
  provider: Provider;
  course: CatalogueCourseView;
};

export function CatalogueCoursePage({
  provider,
  course,
}: CatalogueCoursePageProps) {
  const enrolHref = `/providers/${provider.slug}/courses/${course.slug}/enrol`;

  return (
    <div className="course-detail-page">
      <section className="course-detail-hero course-detail-hero--beauty">
        <div className="page-shell">
          <div className="course-detail-hero__topbar">
            <Link
              href={`/providers/${provider.slug}/courses`}
              className="course-detail-back-link"
            >
              ← Back to courses
            </Link>

            <ProviderIdentity
              provider={provider}
              width={190}
              height={72}
              className="course-detail-hero__logo"
              priority
            />
          </div>

          <div className="course-detail-hero__grid">
            <div className="course-detail-hero__content">
              <p className="course-detail-eyebrow">{provider.name}</p>
              <h1>{course.title}</h1>
              <KitDisclosure text={course.kitDisclosure} />
            </div>

            <aside className="course-detail-payment-card">
              <PricingSummary course={course} />

              <Link href={enrolHref} className="button button--course-primary">
                Start enrolment
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
