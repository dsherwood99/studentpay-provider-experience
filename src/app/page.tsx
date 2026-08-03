import Image from "next/image";
import Link from "next/link";
import { courses } from "@/config/courses";
import { providers } from "@/config/providers";

export default function HomePage() {
  const academyAustralia = providers[0];
  const featuredCourse = courses.find((course) => course.featured);

  return (
    <>
      <section className="platform-hero">
        <div className="page-shell platform-hero__grid">
          <div className="platform-hero__content">
            <p className="eyebrow">StudentPay Enrolment</p>

            <h1>
              A better enrolment experience for education providers and their students.
            </h1>

            <p className="platform-hero__lead">
              Present your courses, guide students through enrolment and offer flexible
  payment options through one seamless, provider-branded journey.
            </p>

            <div className="button-row">
              <Link
                href="/providers/academy-australia"
                className="button button--primary"
              >
                View the provider demo
              </Link>

              <Link
                href="/providers/academy-australia/courses"
                className="button button--secondary"
              >
                Browse demo courses
              </Link>
            </div>
          </div>

          <div className="experience-preview">
            <div className="experience-preview__window">
              <div className="experience-preview__toolbar">
                <span />
                <span />
                <span />
              </div>

              <div className="experience-preview__body">
                <div className="experience-preview__provider">
                  <Image
                    src={academyAustralia.logoPath}
                    alt={`${academyAustralia.name} logo`}
                    width={180}
                    height={70}
                    priority
                  />
                </div>

                <p className="experience-preview__label">Featured course</p>

                <h2>{featuredCourse?.title}</h2>

                <p>{featuredCourse?.shortDescription}</p>

                <div className="experience-preview__payment">
                  <span>Flexible payment plan</span>
                  <strong>
                    ${featuredCourse?.paymentPlan.repaymentAmount} per week
                  </strong>
                </div>

                <div className="experience-preview__progress">
                  <span className="is-complete" />
                  <span className="is-active" />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="platform-section">
        <div className="page-shell">
          <div className="section-heading">
            <p className="eyebrow">One reusable platform</p>
            <h2>Designed to support the entire student journey</h2>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <span className="feature-card__number">01</span>
              <h3>Course discovery</h3>
              <p>
                Present courses through branded catalogue and course pages that
                clearly explain outcomes, fees and delivery.
              </p>
            </article>

            <article className="feature-card">
              <span className="feature-card__number">02</span>
              <h3>Guided enrolment</h3>
              <p>
                Replace long static forms with a clear, responsive enrolment
                wizard that adapts to each provider and course.
              </p>
            </article>

            <article className="feature-card">
              <span className="feature-card__number">03</span>
              <h3>Integrated payments</h3>
              <p>
                Offer upfront payment or StudentPay payment plans without
                creating a disconnected checkout experience.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="demo-provider-section">
        <div className="page-shell demo-provider-section__grid">
          <div>
            <p className="eyebrow">First demonstration provider</p>
            <h2>{academyAustralia.name}</h2>
            <p>{academyAustralia.description}</p>
          </div>

          <Link
            href="/providers/academy-australia"
            className="button button--light"
          >
            Open Academy Australia
          </Link>
        </div>
      </section>
    </>
  );
}