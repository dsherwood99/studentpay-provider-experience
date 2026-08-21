import { ProviderBrand } from "@/components/providers/ProviderBrand";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseCard } from "@/components/courses/CourseCard";
import { getFeaturedCoursesByProvider } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";

type ProviderPageProps = {
  params: Promise<{
    providerSlug: string;
  }>;
};

export default async function ProviderPage({
  params,
}: ProviderPageProps) {
  const { providerSlug } = await params;
  const provider = getProviderBySlug(providerSlug);

  if (!provider) {
    notFound();
  }

  const featuredCourses = getFeaturedCoursesByProvider(provider.code);

  return (
    <div className="provider-page">
      <section className="provider-hero">
        <div className="page-shell provider-hero__grid">
          <div className="provider-hero__content">
            <p className="provider-eyebrow">Flexible online learning</p>

            <ProviderBrand
              provider={provider}
              width={260}
              height={105}
              className="provider-hero__logo"
              priority
            />

            <h1>
              Job-ready online courses with payment options that fit real life.
            </h1>

            <p className="provider-hero__lead">
              Study online with practical course material, provider support and
              simple weekly, fortnightly or monthly payment options.
            </p>

            <div className="button-row">
              <Link
                href={`/providers/${provider.slug}/courses`}
                className="button button--provider-primary"
              >
                Browse courses
              </Link>

              <a
                href="#how-it-works"
                className="button button--provider-secondary"
              >
                How enrolment works
              </a>
            </div>

            <div className="provider-hero__trust">
              <span>Flexible study</span>
              <span>Provider-supported</span>
              <span>StudentPay payment options</span>
            </div>
          </div>

          <div className="provider-hero__showcase">
            <div className="provider-showcase-card provider-showcase-card--main">
              <p className="provider-showcase-card__label">
                Popular course
              </p>
              <h2>Makeup Artistry Course Bundle</h2>
              <p>
                Flexible online study, practical demonstrations and mentor
                support.
              </p>

              <div className="provider-showcase-card__price">
                <span>Payment plan from</span>
                <strong>$25 per week</strong>
              </div>
            </div>

            <div className="provider-showcase-card provider-showcase-card--small provider-showcase-card--top">
              <span>100% online</span>
              <strong>Study from anywhere</strong>
            </div>

            <div className="provider-showcase-card provider-showcase-card--small provider-showcase-card--bottom">
              <span>Flexible payments</span>
              <strong>Weekly, fortnightly or monthly</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="provider-benefits">
        <div className="page-shell provider-benefits__grid">
          <article>
            <span>01</span>
            <h2>Learn flexibly</h2>
            <p>
              Access course content online and study around work, family and
              existing commitments.
            </p>
          </article>

          <article>
            <span>02</span>
            <h2>Build practical skills</h2>
            <p>
              Explore courses designed around practical learning, clear
              outcomes and career pathways.
            </p>
          </article>

          <article>
            <span>03</span>
            <h2>Choose how to pay</h2>
            <p>
              Pay upfront or select a flexible StudentPay payment plan during
              enrolment.
            </p>
          </article>
        </div>
      </section>

      <section className="provider-featured-courses">
        <div className="page-shell">
          <div className="provider-section-heading">
            <div>
              <p className="provider-eyebrow">Featured courses</p>
              <h2>Find a course that fits your goals.</h2>
            </div>

            <Link
              href={`/providers/${provider.slug}/courses`}
              className="provider-text-link"
            >
              View all courses
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="course-grid">
            {featuredCourses.map((course) => (
              <CourseCard
                key={course.code}
                course={course}
                providerSlug={provider.slug}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="provider-how-it-works" id="how-it-works">
        <div className="page-shell">
          <div className="provider-section-heading provider-section-heading--light">
            <div>
              <p className="provider-eyebrow">A simpler way to enrol</p>
              <h2>From course choice to enrolment in four clear steps.</h2>
            </div>
          </div>

          <div className="provider-steps">
            <article>
              <span>1</span>
              <h3>Choose your course</h3>
              <p>Review course details, study options and fees.</p>
            </article>

            <article>
              <span>2</span>
              <h3>Complete your details</h3>
              <p>Work through a short, guided online enrolment.</p>
            </article>

            <article>
              <span>3</span>
              <h3>Select how to pay</h3>
              <p>Pay in full or choose a suitable payment plan.</p>
            </article>

            <article>
              <span>4</span>
              <h3>Start your course</h3>
              <p>Receive confirmation and your provider’s next steps.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="provider-cta">
        <div className="page-shell provider-cta__inner">
          <div>
            <p className="provider-eyebrow">Ready to explore?</p>
            <h2>Find your next course with Academy Australia.</h2>
          </div>

          <Link
            href={`/providers/${provider.slug}/courses`}
            className="button button--light"
          >
            Browse all courses
          </Link>
        </div>
      </section>
    </div>
  );
}