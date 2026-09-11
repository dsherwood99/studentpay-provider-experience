"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NZ_ENROLMENT_STEPS, NZ_STUDENT_DETAILS_COPY } from "@/lib/nz-enrolment/checkout-ui";
import {
  defaultFirstPaymentDate,
  formatNzdFromCents,
  previewPlan,
} from "@/lib/nz-enrolment/plan-math";
import {
  providerCourseWebsiteUrl,
  safeReturnToProviderUrl,
  tenantCssVars,
} from "@/lib/nz-enrolment/presentation";
import type {
  NzPlanPreview,
  NzPublicCourse,
  NzPublicTenant,
  NzStudentDetails,
} from "@/lib/nz-enrolment/types";
import type { CSSProperties } from "react";
import styles from "./enrolment-checkout.module.css";

type Step = (typeof NZ_ENROLMENT_STEPS)[number]["id"];

const STEPS = NZ_ENROLMENT_STEPS;

type Props = {
  tenant: NzPublicTenant;
  course: NzPublicCourse;
  ddaReturn?: "return" | "cancelled" | null;
};

const emptyStudent: NzStudentDetails = {
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  dateOfBirth: "",
  streetAddress: "",
  suburb: "",
  city: "",
  postcode: "",
  region: "",
  country: "New Zealand",
};

function stepIndex(step: Step): number {
  return STEPS.findIndex((item) => item.id === step);
}

export function NzEnrolmentCheckout({ tenant, course, ddaReturn }: Props) {
  const [step, setStep] = useState<Step>(ddaReturn === "return" ? "dda" : "student");
  const [student, setStudent] = useState<NzStudentDetails>(emptyStudent);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [upfrontAmountCents, setUpfrontAmountCents] = useState(
    course.planPolicy.upfrontAmountCents,
  );
  const [frequency, setFrequency] = useState(course.planPolicy.frequency);
  const [numberOfInstalments, setNumberOfInstalments] = useState(
    course.planPolicy.mode === "student_selected_equal"
      ? course.planPolicy.numberOfInstalments
      : 0,
  );
  const [firstPaymentDate, setFirstPaymentDate] = useState(defaultFirstPaymentDate());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [setupUrl, setSetupUrl] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
  const [agreementNumber, setAgreementNumber] = useState<string | null>(null);
  const [declarations, setDeclarations] = useState({
    payment_plan_accepted: false,
    information_confirmed: false,
    privacy_consent_accepted: false,
  });
  const errorRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const derivedPlan = course.planPolicy.mode === "derived_regular";
  const preview: NzPlanPreview | null = useMemo(() => {
    try {
      if (course.planPolicy.mode === "derived_regular") {
        return previewPlan({
          coursePriceCents: course.paymentPlanCourseFeeCents,
          upfrontAmountCents: course.planPolicy.upfrontAmountCents,
          frequency: course.planPolicy.frequency,
          regularInstalmentCents: course.planPolicy.regularInstalmentCents,
          firstPaymentDate,
        });
      }
      return previewPlan({
        coursePriceCents: course.paymentPlanCourseFeeCents,
        upfrontAmountCents,
        frequency,
        numberOfInstalments,
        firstPaymentDate,
      });
    } catch {
      return null;
    }
  }, [
    course,
    upfrontAmountCents,
    frequency,
    numberOfInstalments,
    firstPaymentDate,
  ]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  useEffect(() => {
    if (step !== "dda") {
      return;
    }
    let cancelled = false;

    async function poll() {
      const response = await fetch("/api/enrolment-checkout/status", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = await response.json().catch(() => ({}));
      if (cancelled) return;
      if (!response.ok) {
        if (response.status !== 404) {
          setError(json?.error?.message || "Unable to refresh Direct Debit status.");
        }
        return;
      }
      if (json?.direct_debit?.setup_url) {
        setSetupUrl(json.direct_debit.setup_url);
      }
      if (json?.direct_debit?.setup_complete) {
        setSetupComplete(true);
        setStep("agreement");
      }
    }

    if (ddaReturn === "return") {
      void poll();
    }

    const timer = setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [step, ddaReturn]);

  function updateStudent<K extends keyof NzStudentDetails>(
    key: K,
    value: NzStudentDetails[K],
  ) {
    setStudent((current) => ({ ...current, [key]: value }));
  }

  async function createCheckout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/enrolment-checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerSlug: tenant.slug,
          courseSlug: course.slug,
          student,
          plan: {
            paymentOption: "interest_free_payment_plan",
            upfrontAmountCents,
            frequency,
            numberOfInstalments,
            firstPaymentDate,
          },
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.success === false) {
        setFieldErrors(json?.error?.invalid_fields || {});
        throw new Error(json?.error?.message || "Unable to create this enrolment.");
      }
      setSetupUrl(json.direct_debit?.setup_url || "");
      setStep("dda");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create this enrolment.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCheckout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/enrolment-checkout/confirm", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declarations }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.success === false) {
        throw new Error(json?.error?.message || "Unable to confirm this enrolment.");
      }
      setAgreementNumber(json.agreement?.number || null);
      setStep("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to confirm this enrolment.");
    } finally {
      setBusy(false);
    }
  }

  const payInFull = tenant.checkout.paymentOptions.pay_in_full;
  const courseWebsiteUrl = providerCourseWebsiteUrl(tenant, course);
  const returnToProviderUrl = safeReturnToProviderUrl(tenant);
  const attribution = tenant.presentation.attributionLabel;

  return (
    <div className={styles.page} style={tenantCssVars(tenant) as CSSProperties}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <p className={styles.kicker}>{tenant.displayName}</p>
            <h1>{course.name}</h1>
            <p>
              Course fee {formatNzdFromCents(course.paymentPlanCourseFeeCents)} ·
              Payment plan available
            </p>
            {courseWebsiteUrl ? (
              <p>
                <a href={courseWebsiteUrl}>View this course on the {tenant.displayName} website</a>
              </p>
            ) : null}
          </div>
        </header>

        <ol className={styles.progress} aria-label="Enrolment progress">
          {STEPS.map((item) => (
            <li
              key={item.id}
              data-active={item.id === step}
              data-done={stepIndex(item.id) < stepIndex(step)}
            >
              {item.label}
            </li>
          ))}
        </ol>

        {error ? (
          <div className={styles.summary} ref={errorRef} tabIndex={-1} role="alert">
            <p className={styles.error}>{error}</p>
          </div>
        ) : null}

        <section className={styles.card}>
          {step === "student" ? (
            <>
              <h2 ref={headingRef} tabIndex={-1}>
                {NZ_STUDENT_DETAILS_COPY.heading}
              </h2>
              <p className={styles.lead}>{NZ_STUDENT_DETAILS_COPY.lead}</p>
              <div className={styles.grid}>
                <TextField
                  label="First name"
                  name="given-name"
                  autoComplete="given-name"
                  value={student.firstName}
                  error={fieldErrors.firstName}
                  onChange={(value) => updateStudent("firstName", value)}
                />
                <TextField
                  label="Last name"
                  name="family-name"
                  autoComplete="family-name"
                  value={student.lastName}
                  error={fieldErrors.lastName}
                  onChange={(value) => updateStudent("lastName", value)}
                />
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={student.email}
                  error={fieldErrors.email}
                  span
                  onChange={(value) => updateStudent("email", value)}
                />
                <TextField
                  label="Mobile"
                  name="tel"
                  type="tel"
                  autoComplete="tel"
                  value={student.mobile}
                  error={fieldErrors.mobile}
                  onChange={(value) => updateStudent("mobile", value)}
                />
                <TextField
                  label="Date of birth"
                  name="bday"
                  type="date"
                  autoComplete="bday"
                  value={student.dateOfBirth}
                  error={fieldErrors.dateOfBirth}
                  onChange={(value) => updateStudent("dateOfBirth", value)}
                />
                <TextField
                  label="Street address"
                  name="address-line1"
                  autoComplete="address-line1"
                  value={student.streetAddress}
                  error={fieldErrors.streetAddress}
                  span
                  onChange={(value) => updateStudent("streetAddress", value)}
                />
                <TextField
                  label="Suburb"
                  name="address-level3"
                  autoComplete="address-line2"
                  value={student.suburb}
                  error={fieldErrors.suburb}
                  onChange={(value) => updateStudent("suburb", value)}
                />
                <TextField
                  label="City / region"
                  name="address-level1"
                  autoComplete="address-level1"
                  value={student.region}
                  error={fieldErrors.region}
                  onChange={(value) => {
                    updateStudent("region", value);
                    updateStudent("city", value);
                  }}
                />
                <TextField
                  label="Postcode"
                  name="postal-code"
                  autoComplete="postal-code"
                  value={student.postcode}
                  error={fieldErrors.postcode}
                  onChange={(value) => updateStudent("postcode", value)}
                />
                <TextField
                  label="Country"
                  name="country-name"
                  autoComplete="country-name"
                  value={student.country}
                  error={fieldErrors.country}
                  onChange={(value) => updateStudent("country", value)}
                />
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => setStep("payment")}
                >
                  Continue
                </button>
              </div>
            </>
          ) : null}

          {step === "payment" ? (
            <>
              <h2 ref={headingRef} tabIndex={-1}>
                Choose how to pay
              </h2>
              <p className={styles.lead}>
                Interest-free payment plans are available now. Payment in Full of
                Course Fees is a separate whole-course price and is not offered in
                this checkout yet.
              </p>
              <div className={styles.options}>
                <label className={styles.option}>
                  <input type="radio" name="payment-option" defaultChecked />
                  <span>
                    <strong>Interest-free payment plan</strong>
                    Pay the Payment Plan Course Fee of{" "}
                    {formatNzdFromCents(course.paymentPlanCourseFeeCents)}
                    {derivedPlan
                      ? " in weekly StudentPay instalments. There is no payment-plan deposit."
                      : ", split into instalments after any optional payment-plan deposit."}
                  </span>
                </label>
                <div className={styles.option} data-disabled="true">
                  <input type="radio" name="payment-option-full" disabled />
                  <span>
                    <strong>Payment in Full of Course Fees</strong>{" "}
                    {formatNzdFromCents(course.paymentInFullCourseFeeCents)}.
                    {payInFull.comingSoon
                      ? " Not a payment-plan deposit. Not available on this checkout yet."
                      : " Unavailable."}
                  </span>
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => setStep("student")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => setStep("plan")}
                >
                  Continue with payment plan
                </button>
              </div>
            </>
          ) : null}

          {step === "plan" ? (
            <>
              <h2 ref={headingRef} tabIndex={-1}>
                Your plan
              </h2>
              <p className={styles.lead}>
                {derivedPlan
                  ? "This weekly payment plan is calculated from the course fee. There is no payment-plan deposit."
                  : "StudentPay NZ checks these amounts in integer cents."}
              </p>
              {derivedPlan ? (
                <p className={styles.note}>
                  Weekly instalments of $25.00. If the Payment Plan Course Fee does not
                  divide evenly, the final instalment is the exact remaining balance.
                  Payment-plan upfront is $0.00.
                </p>
              ) : (
                <div className={styles.grid}>
                  <TextField
                    label="Payment-plan deposit (NZD)"
                    name="upfront"
                    type="number"
                    value={String(upfrontAmountCents / 100)}
                    onChange={(value) =>
                      setUpfrontAmountCents(Math.round(Number(value || 0) * 100))
                    }
                  />
                  <label className={styles.field}>
                    <span>Frequency</span>
                    <select
                      value={frequency}
                      onChange={(event) =>
                        setFrequency(event.target.value as typeof frequency)
                      }
                    >
                      {tenant.checkout.availableFrequencies.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextField
                    label="Number of instalments"
                    name="instalments"
                    type="number"
                    value={String(numberOfInstalments)}
                    onChange={(value) => setNumberOfInstalments(Number(value || 0))}
                  />
                  <TextField
                    label="First payment date"
                    name="first-payment-date"
                    type="date"
                    value={firstPaymentDate}
                    onChange={setFirstPaymentDate}
                  />
                </div>
              )}
              {derivedPlan ? (
                <div className={styles.grid}>
                  <TextField
                    label="First payment date"
                    name="first-payment-date"
                    type="date"
                    value={firstPaymentDate}
                    onChange={setFirstPaymentDate}
                  />
                </div>
              ) : null}
              {preview ? (
                <PlanSummary preview={preview} />
              ) : (
                <p className={styles.error} role="alert">
                  This plan cannot be reconciled in integer cents.
                </p>
              )}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => setStep("payment")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={!preview}
                  onClick={() => setStep("review")}
                >
                  Review enrolment
                </button>
              </div>
            </>
          ) : null}

          {step === "review" ? (
            <>
              <h2 ref={headingRef} tabIndex={-1}>
                Review
              </h2>
              <p className={styles.lead}>
                Check the payment plan before setting up Direct Debit.
              </p>
              {preview ? <PlanSummary preview={preview} /> : null}
              <dl className={styles.review}>
                <dt>Student</dt>
                <dd>
                  {student.firstName} {student.lastName}
                </dd>
                <dt>Email</dt>
                <dd>{student.email}</dd>
                <dt>Course</dt>
                <dd>{course.name}</dd>
              </dl>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => setStep("plan")}
                  disabled={busy}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={busy}
                  onClick={() => void createCheckout()}
                >
                  {busy ? "Creating enrolment…" : "Continue to Direct Debit"}
                </button>
              </div>
            </>
          ) : null}

          {step === "dda" ? (
            <>
              <h2 ref={headingRef} tabIndex={-1}>
                Set up Direct Debit
              </h2>
              <p className={styles.lead}>
                {tenant.checkout.wording?.ddaLead ||
                  "You are setting up a Direct Debit authority with StudentPay NZ. This is not a card payment."}
              </p>
              <p className={styles.note}>
                {setupComplete
                  ? "Direct Debit setup is complete. Continue to the agreement."
                  : ddaReturn === "cancelled"
                    ? "Direct Debit setup was cancelled. You can try again without creating a second enrolment."
                    : "You will be taken to StudentPay’s hosted bank setup (GoCardless BECS NZ). Come back here when it finishes."}
              </p>
              <div className={styles.actions}>
                {setupUrl && !setupComplete ? (
                  <a className={`${styles.btn} ${styles.btnPrimary}`} href={setupUrl}>
                    Continue to Direct Debit setup
                  </a>
                ) : null}
                {setupComplete ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => setStep("agreement")}
                  >
                    Continue to agreement
                  </button>
                ) : (
                  <p className={styles.lead}>Waiting for bank setup to complete…</p>
                )}
              </div>
            </>
          ) : null}

          {step === "agreement" ? (
            <>
              <h2 ref={headingRef} tabIndex={-1}>
                Agreement and declarations
              </h2>
              <p className={styles.lead}>
                Confirm the payment plan and your details. Direct Debit setup is complete.
              </p>
              {preview ? <PlanSummary preview={preview} /> : null}
              <div className={styles.checks}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={declarations.payment_plan_accepted}
                    onChange={(event) =>
                      setDeclarations((current) => ({
                        ...current,
                        payment_plan_accepted: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    I have read and agree to the{" "}
                    <a href={tenant.termsUrl} target="_blank" rel="noreferrer">
                      {tenant.displayName} terms
                    </a>
                    , the{" "}
                    <a
                      href="/api/enrolment-checkout/legal?kind=payment-plan"
                      target="_blank"
                      rel="noreferrer"
                    >
                      StudentPay Payment Plan Agreement
                    </a>
                    , and the{" "}
                    <a
                      href="/api/enrolment-checkout/legal?kind=direct-debit"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Direct Debit Service Agreement
                    </a>
                    .
                  </span>
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={declarations.information_confirmed}
                    onChange={(event) =>
                      setDeclarations((current) => ({
                        ...current,
                        information_confirmed: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    I confirm my details are true and complete, and I authorise{" "}
                    {tenant.legalName} and StudentPay NZ to use them for this enrolment.
                  </span>
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={declarations.privacy_consent_accepted}
                    onChange={(event) =>
                      setDeclarations((current) => ({
                        ...current,
                        privacy_consent_accepted: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    I have read the{" "}
                    <a href={tenant.privacyUrl} target="_blank" rel="noreferrer">
                      privacy information
                    </a>{" "}
                    and consent to this enrolment being processed.
                  </span>
                </label>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={
                    busy ||
                    !declarations.payment_plan_accepted ||
                    !declarations.information_confirmed ||
                    !declarations.privacy_consent_accepted
                  }
                  onClick={() => void confirmCheckout()}
                >
                  {busy ? "Confirming…" : "Confirm enrolment"}
                </button>
              </div>
            </>
          ) : null}

          {step === "success" ? (
            <div className={styles.success}>
              <h2 ref={headingRef} tabIndex={-1}>
                Enrolment confirmed
              </h2>
              <p className={styles.lead}>
                Your StudentPay NZ payment plan is set up. {tenant.displayName} and
                StudentPay will email next steps.
              </p>
              {agreementNumber ? (
                <p>Payment Plan Agreement: {agreementNumber}</p>
              ) : null}
              {preview ? <PlanSummary preview={preview} /> : null}
              {returnToProviderUrl ? (
                <div className={styles.actions}>
                  <a className={`${styles.btn} ${styles.btnPrimary}`} href={returnToProviderUrl}>
                    {tenant.presentation.returnToProviderLabel ||
                      `Return to ${tenant.displayName}`}
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}

          <p className={styles.powered}>
            {attribution}
            {tenant.checkout.wording?.supportNote
              ? ` · ${tenant.checkout.wording.supportNote}`
              : null}
          </p>
        </section>
      </div>
    </div>
  );
}

function PlanSummary({ preview }: { preview: NzPlanPreview }) {
  return (
    <dl className={styles.review}>
      <dt>Payment Plan Course Fee</dt>
      <dd>{formatNzdFromCents(preview.coursePriceCents)}</dd>
      {preview.upfrontAmountCents > 0 ? (
        <>
          <dt>Payment-plan deposit</dt>
          <dd>{formatNzdFromCents(preview.upfrontAmountCents)}</dd>
        </>
      ) : null}
      <dt>Amount financed</dt>
      <dd>{formatNzdFromCents(preview.amountToFinanceCents)}</dd>
      <dt>Regular payment</dt>
      <dd>
        {formatNzdFromCents(preview.regularInstalmentAmountCents)} {preview.frequency.toLowerCase()}
      </dd>
      {preview.hasResidualFinal && preview.finalInstalmentAmountCents != null ? (
        <>
          <dt>Regular weekly payments</dt>
          <dd>
            {preview.fullRegularInstalmentCount} ×{" "}
            {formatNzdFromCents(preview.regularInstalmentAmountCents)}
          </dd>
          <dt>Final payment</dt>
          <dd>{formatNzdFromCents(preview.finalInstalmentAmountCents)}</dd>
        </>
      ) : (
        <>
          <dt>Instalments</dt>
          <dd>
            {preview.numberOfInstalments} ×{" "}
            {formatNzdFromCents(preview.regularInstalmentAmountCents)}
          </dd>
        </>
      )}
      <dt>Total instalments</dt>
      <dd>{preview.numberOfInstalments}</dd>
      <dt>First payment date</dt>
      <dd>{preview.firstPaymentDate}</dd>
      <dt>Total payable</dt>
      <dd>{formatNzdFromCents(preview.totalPayableCents)}</dd>
    </dl>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
  span,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  error?: string;
  span?: boolean;
}) {
  const id = `nz-enrol-${name}`;
  return (
    <label className={styles.field} data-span={span ? "2" : undefined} data-invalid={Boolean(error)}>
      <span>{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        value={value}
        inputMode={type === "number" ? "decimal" : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
}
