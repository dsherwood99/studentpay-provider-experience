import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseBySlug } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";
import {
  formatCurrency,
  formatPaymentFrequency,
} from "@/lib/format";

type CourseDetailPageProps = {
  params: Promise<{
    providerSlug: string;
    courseSlug: string;
  }>;
};

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const { providerSlug, courseSlug } = await params;

  const provider = getProviderBySlug(providerSlug);

  if (!provider) {
    notFound();
  }

  const course = getCourseBySlug(provider.code, courseSlug);

  if (!course) {
    notFound();
  }

  const paymentFrequency = formatPaymentFrequency(
    course.paymentPlan.frequency,
  );

  return (
    <div className="course-detail-page">
      <section
        className={`course-detail-hero course-detail-hero--${course.visualTone}`}
      >
        <div className="page-shell">
          <div className="course-detail-hero__topbar">
            <Link
              href={`/providers/${provider.slug}/courses`}
              className="course-detail-back-link"
            >
              ← Back to courses
            </Link>

            <Image
              src={provider.logoPath}
              alt={`${provider.name} logo`}
              width={140}
              height={44}
              className="course-detail-hero__logo"
              priority
            />
          </div>

          <div className="course-detail-hero__grid">
            <div className="course-detail-hero__content">
              <p className="course-detail-eyebrow">{course.category}</p>

              <h1>{course.title}</h1>

              <p className="course-detail-hero__lead">
                {course.shortDescription}
              </p>

              <div className="course-detail-hero__badges">
                {course.badges.map((badge) => (
                  <span key={badge}>{badge}</span>
                ))}
              </div>

              {course.deliveryProvider ? (
                <div className="course-detail-provider">
                  <span>Delivered by</span>
                  <strong>{course.deliveryProvider}</strong>
                </div>
              ) : null}
            </div>

            <aside className="course-detail-payment-card">
              <p className="course-detail-payment-card__label">
                Flexible payment option
              </p>

              <div className="course-detail-payment-card__price">
                <span>From</span>
                <strong>
                  {formatCurrency(
                    course.paymentPlan.repaymentAmount,
                  )}{" "}
                  per {paymentFrequency}
                </strong>
              </div>

              <p>
                Start with a{" "}
                {formatCurrency(
                  course.paymentPlan.depositAmount,
                )}{" "}
                deposit, then choose a suitable StudentPay payment
                plan during enrolment.
              </p>

              <Link
                href={`/providers/${provider.slug}/courses/${course.slug}/enrol`}
                className="button button--course-primary"
              >
                Start enrolment
              </Link>

              <Link
                href="#course-fees"
                className="course-detail-payment-card__secondary"
              >
                View all payment options
              </Link>

              <div className="course-detail-payment-card__note">
                <strong>StudentPay sandbox</strong>
                <span>
                  Completing enrolment creates a real sandbox checkout
                  and continues to direct-debit setup.
                </span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="course-detail-summary">
        <div className="page-shell course-detail-summary__grid">
          <article>
            <span>Delivery</span>
            <strong>{course.deliveryMode}</strong>
          </article>

          <article>
            <span>Duration</span>
            <strong>{course.duration}</strong>
          </article>

          <article>
            <span>Total course fee</span>
            <strong>
              {formatCurrency(course.paymentPlan.totalFee)}
            </strong>
          </article>

          <article>
            <span>Payment plan</span>
            <strong>
              From{" "}
              {formatCurrency(
                course.paymentPlan.repaymentAmount,
              )}{" "}
              per {paymentFrequency}
            </strong>
          </article>
        </div>
      </section>

      <section className="course-detail-content-section">
        <div className="page-shell course-detail-content-grid">
          <div className="course-detail-main-content">
            <section className="course-detail-copy-block">
              <p className="course-detail-eyebrow">Course overview</p>

              <h2>Build practical skills with flexible online study.</h2>

              <p>{course.description}</p>

              <p>
                The course is designed to help students build confidence
                progressively through practical learning, online resources and
                provider support.
              </p>
            </section>
          </div>

          <aside className="course-detail-sidebar">
            <div className="course-detail-sidebar-card course-detail-sidebar-card--compact">
              <p className="course-detail-sidebar-card__label">
                Course at a glance
              </p>

              <dl>
                <div>
                  <dt>Course</dt>
                  <dd>{course.title}</dd>
                </div>

                <div>
                  <dt>Category</dt>
                  <dd>{course.category}</dd>
                </div>

                <div>
                  <dt>Delivery</dt>
                  <dd>{course.deliveryMode}</dd>
                </div>

                <div>
                  <dt>Duration</dt>
                  <dd>{course.duration}</dd>
                </div>

                {course.deliveryProvider ? (
                  <div>
                    <dt>Provider</dt>
                    <dd>{course.deliveryProvider}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </aside>
        </div>
      </section>

      <section className="course-detail-final-cta">
        <div className="page-shell course-detail-final-cta__inner">
          <div>
            <p className="course-detail-eyebrow">
              Ready to get started?
            </p>

            <h2>Begin your guided enrolment.</h2>

            <p>
              Confirm the course, enter your details and choose your
              preferred payment option.
            </p>
          </div>

          <Link
            href={`/providers/${provider.slug}/courses/${course.slug}/enrol`}
            className="button button--light"
          >
            Start enrolment
          </Link>
        </div>
      </section>

      <section
        className="course-fees-section"
        id="course-fees"
      >
        <div className="page-shell">
          <div className="course-detail-section-heading">
            <div>
              <p className="course-detail-eyebrow">
                Course fees
              </p>

              <h2>Choose the payment option that works for you.</h2>
            </div>

            <p>
              Payment options shown are demonstration values and can
              be configured for each provider and course.
            </p>
          </div>

          <div className="course-payment-options">
            <article className="course-payment-option">
              <p className="course-payment-option__label">
                Pay in full
              </p>

              <strong>
                {formatCurrency(course.paymentPlan.totalFee)}
              </strong>

              <p>
                Pay the complete course fee during enrolment.
              </p>

              <Link
                href={`/providers/${provider.slug}/courses/${course.slug}/enrol?payment=full`}
                className="button button--course-secondary"
              >
                Choose pay in full
              </Link>
            </article>

            <article className="course-payment-option course-payment-option--featured">
              <span className="course-payment-option__badge">
                Flexible option
              </span>

              <p className="course-payment-option__label">
                StudentPay payment plan
              </p>

              <strong>
                {formatCurrency(
                  course.paymentPlan.repaymentAmount,
                )}{" "}
                per {paymentFrequency}
              </strong>

              <p>
                Start with a{" "}
                {formatCurrency(
                  course.paymentPlan.depositAmount,
                )}{" "}
                deposit and spread the remaining course fee over
                regular payments.
              </p>

              <Link
                href={`/providers/${provider.slug}/courses/${course.slug}/enrol?payment=plan`}
                className="button button--course-primary"
              >
                Choose payment plan
              </Link>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}