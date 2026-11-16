import Image from "next/image";
import Link from "next/link";
import { AuDemoNotice } from "@/components/au-enrolment/AuDemoNotice";
import { AuPaymentPlanFacts } from "@/components/au-enrolment/AuPaymentPlanFacts";
import {
  AU_PAYMENT_PLAN_DIRECTORY_PATH,
  auPaymentPlanEnrolPath,
  formatAudCents,
  formatAuInstalmentSummary,
  type AuPaymentPlanCourse,
} from "@/lib/au-enrolment/courses";
import type { Provider } from "@/types/provider";

type AuPaymentPlanCoursePageProps = {
  provider: Provider;
  course: AuPaymentPlanCourse;
};

export function AuPaymentPlanCoursePage({
  provider,
  course,
}: AuPaymentPlanCoursePageProps) {
  const enrolHref = auPaymentPlanEnrolPath(course.slug);

  return (
    <div className="simple-course-page au-plan-course">
      <section className="simple-course-hero">
        <div className="page-shell">
          <div className="simple-course-hero__breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href={AU_PAYMENT_PLAN_DIRECTORY_PATH}>
              Australian payment plans
            </Link>
            <span>/</span>
            <span>{course.title}</span>
          </div>

          <p className="aa-script aa-script--on-coral">
            Academy Australia course
          </p>
          <h1>{course.title}</h1>
          <p>
            {provider.name} publishes this course as {course.code}. The weekly
            plan is the approved AUD $3,500 schedule. Enrolment stays held.
          </p>
          <div className="simple-course-hero__badges">
            <span>{course.checkoutPrefix}</span>
            {course.exclusions.map((exclusion) => (
              <span key={exclusion}>{exclusion}</span>
            ))}
            <span>Weekly plan</span>
          </div>
        </div>
      </section>

      <section className="simple-course-body">
        <div className="page-shell simple-course-layout">
          <div className="simple-course-column">
            <AuDemoNotice />

            <article className="simple-course-card">
              <span className="simple-course-card__label">Approved terms</span>
              <h2>Australian weekly payment plan</h2>
              <p>
                The amounts on this page are the owner-approved terms for{" "}
                {course.title}. The schedule is calculated with the existing
                weekly remainder rule. The upfront amount is collected within
                24 hours of signup.
              </p>
              {course.inclusions.length > 0 ? (
                <p>Includes {course.inclusions.join(", ")}.</p>
              ) : (
                <p>No course inclusions are published for this reference plan.</p>
              )}
              {course.exclusions.length > 0 ? (
                <p>{course.exclusions.join(". ")}.</p>
              ) : null}

              <div className="simple-course-visual simple-course-visual--beauty">
                <Image
                  src="/providers/academy-australia/imagery/beauty-makeup.jpg"
                  alt=""
                  fill
                  className="simple-course-visual__image"
                  sizes="(max-width: 1100px) 100vw, 50vw"
                />
                <div className="simple-course-visual__copy">
                  <strong>{formatAudCents(course.schedule.coursePriceCents)}</strong>
                  <span>{formatAuInstalmentSummary(course)}</span>
                </div>
                <div className="simple-course-visual__panel">
                  <span>Verified terms</span>
                  <strong>Weekly payments stay equal.</strong>
                  <p>
                    The upfront amount is the remainder after{" "}
                    {course.schedule.numberOfInstallments} payments of{" "}
                    {formatAudCents(course.schedule.weeklyAmountCents)}.
                  </p>
                </div>
              </div>
            </article>
          </div>

          <aside className="simple-checkout au-plan-summary">
            <div className="simple-checkout__head">
              <p className="aa-script">Held enrolment</p>
              <h2>{formatAudCents(course.schedule.coursePriceCents)}</h2>
              <p>{formatAuInstalmentSummary(course)}</p>
            </div>

            <AuPaymentPlanFacts course={course} />

            <Link href={enrolHref} className="button button--primary">
              Enrol Now
            </Link>

            <p className="au-plan-summary__note">
              Enrol Now opens the held checkout. It does not create an
              enrolment, send an agreement, authorise a bank account, or start
              a payment plan.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
