import Image from "next/image";
import Link from "next/link";
import { courses } from "@/config/courses";
import { providers } from "@/config/providers";
import { formatCurrency, formatPaymentFrequency } from "@/lib/format";

const courseAreas = [
  {
    title: "Beauty & Makeup",
    description:
      "Learn practical service skills including makeup artistry and beauty business basics.",
    href: "/providers/academy-australia/courses/makeup-artistry",
    tone: "beauty",
  },
  {
    title: "Psychology & Criminology",
    description:
      "Explore criminal behaviour, forensic science and pathways into justice-related study.",
    href: "/providers/academy-australia/courses/criminal-psychology",
    tone: "psychology",
  },
  {
    title: "Technology",
    description:
      "Build practical front-end and back-end skills through project-based online learning.",
    href: "/providers/academy-australia/courses/full-stack-developer",
    tone: "technology",
  },
] as const;

export default function HomePage() {
  const academyAustralia = providers[0];
  const featuredCourses = courses.filter((course) => course.featured).slice(0, 3);
  const criminalPsychology = courses.find(
    (course) => course.slug === "criminal-psychology",
  );

  return (
    <>
      <section className="aa-hero">
        <div className="page-shell aa-hero__grid">
          <div className="aa-hero__content">
            <Image
              src={academyAustralia.logoPath}
              alt="Academy Australia"
              width={220}
              height={88}
              className="aa-hero__logo"
              priority
            />

            <p className="aa-script">Flexible online learning</p>

            <h1>
              Job-ready online courses with payment options that fit real life.
            </h1>

            <p className="aa-hero__lead">
              Study online with practical course material, tutor support and
              simple weekly, fortnightly or monthly payment plans.
            </p>

            <div className="button-row">
              <Link
                href="/providers/academy-australia/courses"
                className="button button--primary"
              >
                Explore courses
              </Link>
              <a href="#payment-options" className="button button--secondary">
                View payment options
              </a>
            </div>
          </div>

          <div className="aa-hero__visual" aria-hidden="true">
            <div className="aa-hero__visual-plane">
              <div className="aa-hero__visual-copy">
                <span>Start now. Pay over time.</span>
                <strong>
                  Transparent payment plans built into enrolment — from{" "}
                  {formatCurrency(
                    criminalPsychology?.paymentPlan.repaymentAmount ?? 28,
                  )}{" "}
                  per week.
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="aa-benefits">
        <div className="page-shell aa-benefits__grid">
          <article>
            <span>01</span>
            <h2>Learn anytime</h2>
            <p>
              Access course material online and study around work, family and
              existing commitments.
            </p>
          </article>
          <article>
            <span>02</span>
            <h2>Get tutor support</h2>
            <p>
              Build practical, career-relevant skills with guidance available as
              you progress.
            </p>
          </article>
          <article>
            <span>03</span>
            <h2>Pay your way</h2>
            <p>
              Choose a payment plan that makes enrolment easier and more
              affordable.
            </p>
          </article>
        </div>
      </section>

      <section className="aa-course-areas" id="courses">
        <div className="page-shell">
          <div className="aa-section-heading">
            <p className="aa-script">You may also be interested in…</p>
            <h2>Popular course areas</h2>
            <p>
              Browse practical online course options across beauty, psychology,
              technology and more.
            </p>
          </div>

          <div className="aa-course-areas__grid">
            {courseAreas.map((area) => (
              <Link
                key={area.title}
                href={area.href}
                className={`aa-course-area aa-course-area--${area.tone}`}
              >
                <span className="aa-course-area__media" aria-hidden="true" />
                <strong>{area.title}</strong>
                <p>{area.description}</p>
                <span className="aa-course-area__cta">Learn more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="aa-payment-banner" id="payment-options">
        <div className="page-shell aa-payment-banner__inner">
          <div>
            <p className="aa-script aa-script--on-coral">
              Support that makes a difference
            </p>
            <h2>Flexible payment plans built into enrolment.</h2>
            <p>
              Choose weekly, fortnightly or monthly repayments — or pay in full
              — during a guided online enrolment.
            </p>
          </div>

          <div className="aa-payment-banner__plans">
            <div>
              <span>Weekly</span>
              <strong>From $25</strong>
              <p>Best for tighter budgets</p>
            </div>
            <div>
              <span>Fortnightly</span>
              <strong>Flexible</strong>
              <p>Aligned to pay cycles</p>
            </div>
            <div>
              <span>Monthly</span>
              <strong>Simple</strong>
              <p>Easy to understand</p>
            </div>
          </div>
        </div>
      </section>

      <section className="aa-featured" id="why-us">
        <div className="page-shell">
          <div className="aa-section-heading">
            <p className="aa-script">Why Academy Australia</p>
            <h2>
              Practical learning with clear support from enquiry to completion.
            </h2>
          </div>

          <ol className="aa-why-list">
            <li>
              <span>1</span>
              <p>We make course information easy to understand.</p>
            </li>
            <li>
              <span>2</span>
              <p>We help students choose a manageable payment option.</p>
            </li>
            <li>
              <span>3</span>
              <p>We provide online access and tutor support.</p>
            </li>
            <li>
              <span>4</span>
              <p>We keep the enrolment process simple and transparent.</p>
            </li>
          </ol>

          <div className="aa-featured__courses">
            {featuredCourses.map((course) => (
              <Link
                key={course.code}
                href={`/providers/academy-australia/courses/${course.slug}`}
                className="aa-featured-course"
              >
                <span>{course.category}</span>
                <strong>{course.title}</strong>
                <p>{course.shortDescription}</p>
                <em>
                  From {formatCurrency(course.paymentPlan.repaymentAmount)} per{" "}
                  {formatPaymentFrequency(course.paymentPlan.frequency)}
                </em>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="aa-steps" id="how-it-works">
        <div className="page-shell">
          <div className="aa-section-heading aa-section-heading--light">
            <p className="aa-script aa-script--on-dark">How it works</p>
            <h2>Four simple steps</h2>
          </div>

          <div className="aa-steps__grid">
            <article>
              <span>1</span>
              <h3>Enquire</h3>
              <p>Request a course guide and speak with an advisor.</p>
            </article>
            <article>
              <span>2</span>
              <h3>Choose</h3>
              <p>Select your course and preferred payment option.</p>
            </article>
            <article>
              <span>3</span>
              <h3>Start</h3>
              <p>Access course material online and study at your own pace.</p>
            </article>
            <article>
              <span>4</span>
              <h3>Complete</h3>
              <p>Finish your course and take the next career step.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="aa-final-cta">
        <div className="page-shell aa-final-cta__inner">
          <div>
            <p className="aa-script">Ready to start?</p>
            <h2>Begin a guided online enrolment today.</h2>
            <p>
              Confirm your course, enter your details and choose how you want to
              pay — including flexible StudentPay plans.
            </p>
          </div>

          <div className="button-row">
            <Link
              href="/providers/academy-australia/courses/criminal-psychology/enrol"
              className="button button--primary"
            >
              Enrol in Criminal Psychology
            </Link>
            <Link
              href="/providers/academy-australia/courses"
              className="button button--secondary"
            >
              Browse all courses
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
