"use client";

import { type FormEvent, useState } from "react";
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
  ACADEMYAU_AGREEMENT_HASH,
  ACADEMYAU_AGREEMENT_HTML,
  ACADEMYAU_AGREEMENT_VERSION,
} from "@/lib/au-enrolment/agreement";
import {
  academyAuEnrolmentBlockers,
  academyAuEnrolmentReady,
} from "@/lib/au-enrolment/readiness";
import type { Provider } from "@/types/provider";

type AuEnrolmentCheckoutProps = {
  provider: Provider;
  course: AuPaymentPlanCourse;
};

const studentFields = [
  ["firstName", "First name", "Given name"],
  ["lastName", "Last name", "Family name"],
  ["email", "Email", "name@example.com"],
  ["mobile", "Mobile", "Australian mobile number"],
  ["dateOfBirth", "Date of birth", "YYYY-MM-DD"],
  ["addressLine1", "Street address", "Street address"],
  ["suburb", "Suburb", "Suburb"],
  ["state", "State", "VIC"],
  ["postcode", "Postcode", "3000"],
  ["firstPaymentDate", "First weekly payment", "YYYY-MM-DD"],
  ["abilityToRepay", "Ability to repay", "Yes or No"],
] as const;

type FieldName = (typeof studentFields)[number][0];

export function AuEnrolmentCheckout({
  provider,
  course,
}: AuEnrolmentCheckoutProps) {
  const ready = academyAuEnrolmentReady();
  const [fields, setFields] = useState<Record<FieldName, string>>({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    dateOfBirth: "",
    addressLine1: "",
    suburb: "",
    state: "VIC",
    postcode: "",
    firstPaymentDate: "",
    abilityToRepay: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<string | null>(null);

  function update(name: FieldName, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!academyAuEnrolmentReady()) {
      setMessage("This Academy Australia enrolment is held and cannot be submitted.");
      setConfirmation(null);
      setRecovery(null);
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/studentpay/au-enrolments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coursePath: `/academy-australia/${course.slug}`,
          firstName: fields.firstName,
          lastName: fields.lastName,
          email: fields.email,
          mobile: fields.mobile,
          dateOfBirth: fields.dateOfBirth,
          addressLine1: fields.addressLine1,
          addressLine2: "",
          suburb: fields.suburb,
          state: fields.state,
          postcode: fields.postcode,
          firstPaymentDate: fields.firstPaymentDate,
          abilityToRepay: fields.abilityToRepay,
          providerAgreementVersion: ACADEMYAU_AGREEMENT_VERSION,
          providerAgreementHash: ACADEMYAU_AGREEMENT_HASH,
          paymentPlanAccepted: accepted,
          directDebitServiceAgreementAccepted: accepted,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body?.error?.message || "Enrolment could not be submitted.");
        return;
      }
      setConfirmation(body.enrolment_id || "Enrolment received.");
      setRecovery(body.recovery_token || null);
    } catch {
      setMessage("Enrolment could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

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
            {formatAuInstalmentSummary(course)}. The upfront amount is
            scheduled within 24 hours and is not treated as paid until
            settlement is confirmed.
          </p>
        </div>
      </section>

      <section className="simple-course-body">
        <div className="page-shell au-plan-enrol__layout">
          <AuDemoNotice />
          <form className="au-plan-enrol__layout" onSubmit={submit} noValidate>
            <article className="simple-course-card">
              <span className="simple-course-card__label">Student details</span>
              <h2>Who is enrolling</h2>
              <div className="au-plan-fields">
                {studentFields.map(([name, label, placeholder]) => (
                  <label key={name}>
                    {label}
                    <input
                      type="text"
                      name={name}
                      value={fields[name]}
                      placeholder={placeholder}
                      autoComplete="off"
                      onChange={(event) => update(name, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </article>

            <article className="simple-course-card">
              <span className="simple-course-card__label">Verified plan</span>
              <h2>{course.title}</h2>
              <p>{formatAuInstalmentSummary(course)}</p>
              <p>Kit Not Included.</p>
              <AuPaymentPlanFacts course={course} />
            </article>

            <article className="simple-course-card">
              <span className="simple-course-card__label">Agreement</span>
              <h2>Academy Australia Student Agreement</h2>
              <p>
                Version {ACADEMYAU_AGREEMENT_VERSION}. Document hash{" "}
                {ACADEMYAU_AGREEMENT_HASH}. This is the approved agreement.
                Acceptance stays off until Academy enrolment is activated.
              </p>
              <div
                className="au-plan-agreement"
                dangerouslySetInnerHTML={{ __html: ACADEMYAU_AGREEMENT_HTML }}
              />
              <label className="au-plan-check">
                <input
                  type="checkbox"
                  checked={accepted}
                  disabled={!ready}
                  onChange={(event) => setAccepted(event.target.checked)}
                />
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
                The payer is the student named above. Bank details are
                tokenised by the existing Pinch Capture.js journey. This page
                does not collect raw bank details, and it does not create a
                payer, source, mandate, or payment while Academy enrolment is
                held.
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
              {submitting ? <p role="status">Submitting enrolment.</p> : null}
              {confirmation ? (
                <p role="status">Confirmation {confirmation}.</p>
              ) : null}
              {recovery ? (
                <p role="status">Recovery is available for this application.</p>
              ) : null}
              {message ? <p role="alert">{message}</p> : null}
              <button
                type="submit"
                className="button button--primary au-plan-disabled"
                disabled={!ready || submitting}
              >
                Enrolment checkout is not available
              </button>
              <p className="au-plan-summary__note">
                This control cannot create a mandate or a payment plan.
              </p>
            </article>
          </form>
        </div>
      </section>
    </div>
  );
}
