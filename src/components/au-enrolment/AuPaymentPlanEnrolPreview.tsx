import Link from "next/link";
import { AuDemoNotice } from "@/components/au-enrolment/AuDemoNotice";
import { AuPaymentPlanFacts } from "@/components/au-enrolment/AuPaymentPlanFacts";
import {
  AU_PAYMENT_PLAN_DIRECTORY_PATH,
  auPaymentPlanCoursePath,
  formatAuInstalmentSummary,
  type AuPaymentPlanCourse,
} from "@/lib/au-enrolment/courses";
import type { Provider } from "@/types/provider";

const previewSections = [
  "Student details",
  "Agreement display and acceptance",
  "Payment-plan schedule",
  "Pinch bank authorisation",
  "Duplicate prevention",
  "Incomplete enrolment recovery",
  "Salesforce Enrolment Application",
  "Processing and confirmation",
] as const;

type AuPaymentPlanEnrolPreviewProps = {
  provider: Provider;
  course: AuPaymentPlanCourse;
};

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
              Australian payment-plan demonstrations
            </Link>
            <span>/</span>
            <Link href={auPaymentPlanCoursePath(course.slug)}>{course.title}</Link>
            <span>/</span>
            <span>Enrolment preview</span>
          </div>

          <p className="aa-script aa-script--on-coral">Not connected</p>
          <h1>Australian enrolment preview</h1>
          <p>
            {provider.name} can show the verified plan for {course.title}. This
            page does not submit an enrolment.
          </p>
        </div>
      </section>

      <section className="simple-course-body">
        <div className="page-shell au-plan-enrol__layout">
          <AuDemoNotice />

          <div className="au-plan-status" role="status">
            <strong>Checkout is not available in this preview.</strong>
            <p>
              Nothing on this page is sent to StudentPay, Pinch, or Salesforce.
              A dedicated Academy Australia sandbox provider has to be
              configured on the server before enrolment can be submitted.
            </p>
          </div>

          <article className="simple-course-card">
            <span className="simple-course-card__label">Verified plan</span>
            <h2>{course.title}</h2>
            <p>{formatAuInstalmentSummary(course)}</p>
            <AuPaymentPlanFacts course={course} />
          </article>

          <article className="simple-course-card">
            <h2>Sandbox checkout still to connect</h2>
            <ul className="au-plan-pending">
              {previewSections.map((section) => (
                <li key={section}>
                  <span>{section}</span>
                  <strong>Not connected</strong>
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
