import Link from "next/link";
import { AuDemoNotice } from "@/components/au-enrolment/AuDemoNotice";
import { AuPaymentPlanFacts } from "@/components/au-enrolment/AuPaymentPlanFacts";
import {
  AU_PAYMENT_PLAN_DIRECTORY_PATH,
  auPaymentPlanCoursePath,
  formatAuInstalmentSummary,
  type AuPaymentPlanCourse,
} from "@/lib/au-enrolment/courses";
import {
  ACADEMYAU_AGREEMENT_PRODUCTION_VERSION,
  academyAuEnrolmentBlockers,
} from "@/lib/au-enrolment/readiness";
import type { Provider } from "@/types/provider";

type AuPaymentPlanEnrolPreviewProps = {
  provider: Provider;
  course: AuPaymentPlanCourse;
};

const studentFields = [
  ["First name", "Given name"],
  ["Last name", "Family name"],
  ["Email", "name@example.com"],
  ["Mobile", "Australian mobile number"],
  ["Date of birth", "DD/MM/YYYY"],
] as const;

const bankFields = [
  ["Account name", "Name on the account"],
  ["BSB", "000-000"],
  ["Account number", "Bank account number"],
] as const;

const journeyStates = [
  "Student details",
  "Verified plan",
  "Agreement acceptance",
  "Pinch bank authorisation",
  "Processing",
  "Confirmation",
] as const;

export function AuPaymentPlanEnrolPreview({
  provider,
  course,
}: AuPaymentPlanEnrolPreviewProps) {
  return (
    <div className="simple-course-page au-plan-enrol">
      <section className="simple-course-hero">
        <div className="page-shell">
          <div className="simple-course-hero__breadcrumb">
            <Link href={AU_PAYMENT_PLAN_DIRECTORY_PATH}>
              Australian payment plans
            </Link>
            <span>/</span>
            <Link href={auPaymentPlanCoursePath(course.slug)}>{course.title}</Link>
            <span>/</span>
            <span>Enrol</span>
          </div>

          <p className="aa-script aa-script--on-coral">Submission held</p>
          <h1>Enrol in {course.title}</h1>
          <p>
            {provider.name} checkout for {course.code}. The plan is{" "}
            {formatAuInstalmentSummary(course)}. Nothing on this page is sent
            to StudentPay, Pinch, or Salesforce.
          </p>
        </div>
      </section>

      <section className="simple-course-body">
        <div className="page-shell au-plan-enrol__layout">
          <AuDemoNotice />

          <div className="au-plan-status" role="status">
            <strong>Live submission is held.</strong>
            <p>
              Checkout identifier {course.checkoutPrefix}. Bank details stay in
              the browser and are discarded with the page. No payer, source,
              application, or charge is created.
            </p>
          </div>

          <article className="simple-course-card">
            <span className="simple-course-card__label">Student details</span>
            <h2>Who is enrolling</h2>
            <div className="au-plan-fields">
              {studentFields.map(([label, placeholder]) => (
                <label key={label}>
                  {label}
                  <input
                    type="text"
                    name={label}
                    placeholder={placeholder}
                    autoComplete="off"
                    disabled
                  />
                </label>
              ))}
            </div>
          </article>

          <article className="simple-course-card">
            <span className="simple-course-card__label">Verified plan</span>
            <h2>{course.title}</h2>
            <p>{formatAuInstalmentSummary(course)}</p>
            {course.exclusions.length > 0 ? (
              <p>{course.exclusions.join(". ")}.</p>
            ) : null}
            <AuPaymentPlanFacts course={course} />
          </article>

          <article className="simple-course-card">
            <span className="simple-course-card__label">Agreement</span>
            <h2>Academy Australia Student Agreement</h2>
            <p>
              Version {ACADEMYAU_AGREEMENT_PRODUCTION_VERSION} is prepared from
              the approved Academy Australia terms and is not activated.
              Acceptance stays off. The StudentPay Payment Plan Agreement and
              Direct Debit Service Agreement remain part of the journey.
            </p>
            <ul className="au-plan-pending">
              <li>
                <span>Digital presentation and consent evidence</span>
                <strong>Prepared</strong>
              </li>
              <li>
                <span>Version and immutable document hash</span>
                <strong>Prepared</strong>
              </li>
              <li>
                <span>Payment authorisation wording</span>
                <strong>Prepared</strong>
              </li>
              <li>
                <span>Acceptance</span>
                <strong>Inactive</strong>
              </li>
            </ul>
            <label className="au-plan-check">
              <input type="checkbox" disabled />
              <span>
                I have read and agree to the Academy Australia Student
                Agreement, the StudentPay Payment Plan Agreement, and the
                Direct Debit Service Agreement.
              </span>
            </label>
          </article>

          <article className="simple-course-card">
            <span className="simple-course-card__label">Bank authorisation</span>
            <h2>Pinch production account</h2>
            <p>
              When submission is approved, these details authorise a Pinch
              production payer and source for Academy Australia. That call is
              not connected.
            </p>
            <div className="au-plan-fields">
              {bankFields.map(([label, placeholder]) => (
                <label key={label}>
                  {label}
                  <input
                    type="text"
                    name={label}
                    placeholder={placeholder}
                    autoComplete="off"
                    disabled
                    inputMode={label === "Account name" ? "text" : "numeric"}
                  />
                </label>
              ))}
            </div>
          </article>

          <article className="simple-course-card">
            <h2>Processing and confirmation</h2>
            <ul className="au-plan-pending">
              {journeyStates.map((state) => (
                <li key={state}>
                  <span>{state}</span>
                  <strong>Held</strong>
                </li>
              ))}
            </ul>
            <p className="au-plan-summary__note">
              Confirmation is shown only after a real enrolment exists. This
              page cannot reach that state.
            </p>
          </article>

          <article className="simple-course-card">
            <h2>Incomplete applications</h2>
            <p>
              No incomplete application is stored while submission is held.
              Recovery for a later Academy application uses the existing
              Australian enrolment recovery link and this course path. It does
              not resume a Bela or Careers application.
            </p>
          </article>

          <article className="simple-course-card">
            <h2>Why submission stays off</h2>
            <ul className="au-plan-pending">
              {academyAuEnrolmentBlockers.map((blocker) => (
                <li key={blocker.code}>
                  <span>{blocker.summary}</span>
                  <strong>Held</strong>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="button button--primary au-plan-disabled"
              disabled
            >
              Enrolment checkout is not available
            </button>
            <p className="au-plan-summary__note">
              This control cannot create a mandate or a payment plan.
            </p>
          </article>

          <p className="au-plan-enrol__back">
            <Link href={auPaymentPlanCoursePath(course.slug)}>
              ← Back to {course.title}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
