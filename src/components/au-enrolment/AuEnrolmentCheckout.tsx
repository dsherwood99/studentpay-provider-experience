"use client";

import { useEffect, useRef, useState } from "react";
import { formatAudCents, type AuPaymentPlanCourse } from "@/lib/au-enrolment/courses";
import type { Provider } from "@/types/provider";
import {
  ACADEMYAU_AGREEMENT_HASH,
  ACADEMYAU_AGREEMENT_HTML,
  ACADEMYAU_AGREEMENT_VERSION,
} from "@/lib/au-enrolment/agreement";
import { AuDemoNotice } from "@/components/au-enrolment/AuDemoNotice";
import { AuPaymentPlanFacts } from "@/components/au-enrolment/AuPaymentPlanFacts";
import { BankSourceCapture, type BankCaptureHandle } from "@/components/au-enrolment/BankSourceCapture";

type AuEnrolmentCheckoutProps = {
  provider: Provider;
  course: AuPaymentPlanCourse;
  enrolmentId?: string;
};

type EnrolmentResponse = {
  ok?: boolean;
  activated?: boolean;
  enrolmentId?: string | null;
  enrolmentReference?: string | null;
  message?: string;
  agreementHtml?: string | null;
  documentHash?: string | null;
  publishableKey?: string;
  agreementAccepted?: boolean;
  bankAuthorised?: boolean;
  salesforceStage?: string | null;
  upfrontStatus?: string | null;
};

const COURSE_PATH = "/academy-australia/bridal-freelancer-bundle";

function idempotencyKey(): string {
  const storageKey = "academyau-enrolment-idempotency";
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing && /^[A-Za-z0-9_-]{8,80}$/.test(existing)) return existing;
  const created = `academyau-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  window.sessionStorage.setItem(storageKey, created);
  return created;
}

export function AuEnrolmentCheckout({ provider, course, enrolmentId }: AuEnrolmentCheckoutProps) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [application, setApplication] = useState<EnrolmentResponse | null>(null);
  const [accepted, setAccepted] = useState(false);
  const bank = useRef<BankCaptureHandle>(null);

  useEffect(() => {
    if (!enrolmentId || !/^enrol_[a-f0-9]{20}$/.test(enrolmentId)) return;
    let cancelled = false;
    fetch(`/api/studentpay/au-enrolments?enrolmentId=${encodeURIComponent(enrolmentId)}`)
      .then((response) => response.json())
      .then((result: EnrolmentResponse) => {
        if (!cancelled && result.enrolmentId) setApplication(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enrolmentId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const student = Object.fromEntries(
      [
        "firstName",
        "lastName",
        "dateOfBirth",
        "email",
        "mobile",
        "addressLine1",
        "addressLine2",
        "suburb",
        "state",
        "postcode",
        "firstPaymentDate",
        "abilityToRepay",
      ].map((key) => [key, String(form.get(key) || "")]),
    );
    const body: Record<string, unknown> = {
      coursePath: COURSE_PATH,
      ...student,
      providerAgreementVersion: ACADEMYAU_AGREEMENT_VERSION,
      providerAgreementHash: ACADEMYAU_AGREEMENT_HASH,
    };
    if (application?.enrolmentId && application.documentHash) {
      if (!accepted) {
        setMessage("Accept the payment plan and the Academy Australia agreement before continuing.");
        setSubmitting(false);
        return;
      }
      const tokenised = await bank.current?.tokenise();
      if (!tokenised?.ok) {
        setMessage(tokenised?.message || "Payment authorisation was not completed. No plan was created.");
        setSubmitting(false);
        return;
      }
      body.enrolmentId = application.enrolmentId;
      body.documentHash = application.documentHash;
      body.paymentPlanAccepted = true;
      body.directDebitServiceAgreementAccepted = true;
      body.sourceToken = tokenised.token;
    }
    try {
      const response = await fetch("/api/studentpay/au-enrolments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey(),
        },
        body: JSON.stringify(body),
      });
      const result = await response.json() as EnrolmentResponse;
      if (result.enrolmentId) setApplication(result);
      if (result.activated) {
        window.sessionStorage.removeItem("academyau-enrolment-idempotency");
      }
      setMessage(result.message || "Enrolment could not be confirmed. No plan was created.");
    } catch {
      setMessage("Enrolment could not be confirmed. No plan was created. You can try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="au-plan-page">
      <section className="au-plan-hero">
        <div className="container au-plan-hero__layout">
          <div>
            <p className="aa-script aa-script--on-coral">Enrolment</p>
            <h1>{course.title}</h1>
            <p>
              {provider.name} · {course.code} · {course.checkoutPrefix}
            </p>
          </div>
          <AuPaymentPlanFacts course={course} />
        </div>
      </section>
      <section className="section">
        <div className="container au-plan-layout">
          <div className="au-plan-copy">
            <AuDemoNotice />
            <h2>Approved plan</h2>
            <p>
              The total is {formatAudCents(course.schedule.coursePriceCents)}. The
              upfront amount of {formatAudCents(course.schedule.upfrontPaymentCents)} is
              scheduled within 24 hours and is not treated as paid until it
              settles. Then {course.schedule.numberOfInstallments} weekly payments
              of {formatAudCents(course.schedule.weeklyAmountCents)}. The final
              payment is {formatAudCents(course.schedule.finalPaymentCents)}.{" "}
              {course.exclusions.join(", ")}.
            </p>
            <h2>Academy Australia Student Agreement</h2>
            <p>
              Version {ACADEMYAU_AGREEMENT_VERSION}. Document hash{" "}
              <code>{ACADEMYAU_AGREEMENT_HASH}</code>.
            </p>
            <div
              className="au-plan-agreement"
              dangerouslySetInnerHTML={{ __html: ACADEMYAU_AGREEMENT_HTML }}
            />
            {application?.agreementHtml ? (
              <>
                <h2>Payment plan</h2>
                <div
                  className="au-plan-agreement"
                  dangerouslySetInnerHTML={{ __html: application.agreementHtml }}
                />
              </>
            ) : null}
          </div>
          <form className="au-plan-form" onSubmit={submit}>
            <h2>Your details</h2>
            <div className="au-plan-fields">
              <label>First name<input name="firstName" required autoComplete="given-name" /></label>
              <label>Last name<input name="lastName" required autoComplete="family-name" /></label>
              <label>Date of birth<input name="dateOfBirth" type="date" required /></label>
              <label>Email<input name="email" type="email" required autoComplete="email" /></label>
              <label>Mobile<input name="mobile" required autoComplete="tel" /></label>
              <label>Address<input name="addressLine1" required autoComplete="address-line1" /></label>
              <label>Address line 2<input name="addressLine2" autoComplete="address-line2" /></label>
              <label>Suburb<input name="suburb" required autoComplete="address-level2" /></label>
              <label>State<input name="state" required autoComplete="address-level1" /></label>
              <label>Postcode<input name="postcode" required autoComplete="postal-code" /></label>
              <label>First weekly payment date<input name="firstPaymentDate" type="date" required /></label>
              <label>Ability to repay<textarea name="abilityToRepay" required /></label>
            </div>
            {application?.enrolmentId && application.documentHash ? (
              <>
                <label className="au-plan-consent">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                  />
                  I accept the payment plan and the Academy Australia Student
                  Agreement shown above, and I authorise the direct debit.
                </label>
                {application.publishableKey ? (
                  <BankSourceCapture ref={bank} publishableKey={application.publishableKey} />
                ) : (
                  <p>Payment capture is unavailable, so the plan cannot be authorised.</p>
                )}
              </>
            ) : null}
            {message ? <p role="status">{message}</p> : null}
            {application?.activated ? (
              <p>
                Application {application.enrolmentReference || application.enrolmentId} is
                confirmed. The upfront payment is {application.upfrontStatus || "scheduled"} and
                is not treated as paid until it settles.
              </p>
            ) : (
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? "Submitting" : application?.enrolmentId ? "Authorise and submit" : "Continue"}
              </button>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
