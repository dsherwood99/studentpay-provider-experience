import Image from "next/image";
import Link from "next/link";
import { courses } from "@/config/courses";
import { formatCurrency } from "@/lib/format";

const courseAreas = [
  {
    title: "Beauty & Makeup",
    description:
      "Learn practical service skills including makeup artistry and beauty business basics.",
    href: "/providers/academy-australia/courses/makeup-artistry",
    image: "/providers/academy-australia/imagery/beauty-makeup.jpg",
  },
  {
    title: "Psychology & Criminology",
    description:
      "Explore criminal behaviour, forensic science and pathways into justice-related study.",
    href: "/providers/academy-australia/courses/criminal-psychology",
    image: "/providers/academy-australia/imagery/psychology-study.jpg",
  },
  {
    title: "Technology",
    description:
      "Build practical front-end and back-end skills through project-based online learning.",
    href: "/providers/academy-australia/courses/full-stack-developer",
    image: "/providers/academy-australia/imagery/technology-laptop.jpg",
  },
] as const;

export default function HomePage() {
  const criminalPsychology = courses.find(
    (course) => course.slug === "criminal-psychology",
  );

  return (
    <>
      <section className="aa-hero">
        <div className="page-shell aa-hero__grid">
          <div className="aa-hero__content">
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

          <div className="aa-hero__visual">
            <div className="aa-hero__visual-plane">
              <Image
                src="/providers/academy-australia/imagery/hero-students.jpg"
                alt=""
                fill
                priority
                className="aa-hero__visual-image"
                sizes="(max-width: 980px) 100vw, 48vw"
              />
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
                className="aa-course-area"
              >
                <span className="aa-course-area__media" aria-hidden="true">
                  <Image
                    src={area.image}
                    alt=""
                    fill
                    className="aa-course-area__image"
                    sizes="(max-width: 980px) 100vw, 33vw"
                  />
                </span>
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
          <div className="aa-payment-banner__copy">
            <p className="aa-script">Support that makes a difference</p>
            <h2>Flexible payment plans built into enrolment.</h2>
            <p>
              Choose how you want to pay during a guided online enrolment —
              then set up your plan and get started.
            </p>
          </div>

          <div className="aa-payment-banner__plans">
            <article>
              <span className="aa-payment-banner__plan-index">01</span>
              <div>
                <strong>
                  Select from weekly, fortnightly or monthly instalments
                </strong>
                <p>Pick the repayment rhythm that fits your budget.</p>
              </div>
            </article>
            <article>
              <span className="aa-payment-banner__plan-index">02</span>
              <div>
                <strong>Choose when to start</strong>
                <p>Set a start date that works for you.</p>
              </div>
            </article>
            <article>
              <span className="aa-payment-banner__plan-index">03</span>
              <div>
                <strong>Set up your direct debit online</strong>
                <p>Complete secure bank setup without leaving enrolment.</p>
              </div>
            </article>
            <article>
              <span className="aa-payment-banner__plan-index">04</span>
              <div>
                <strong>
                  Approve your personalised payment plan and get started
                </strong>
                <p>Confirm the details, then begin your course.</p>
              </div>
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
