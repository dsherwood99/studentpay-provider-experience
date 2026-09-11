"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import {
  NZ_CONFIRM_CTA,
  NZ_CONFIRMATION_COPY,
  NZ_DIRECT_DEBIT_COPY,
  NZ_DIRECT_DEBIT_CTA,
  NZ_PAYMENT_PLAN_COPY,
  NZ_REVIEW_COPY,
  NZ_STUDENT_DETAILS_COPY,
  confirmEnabled,
  declarationsAccepted,
  isConfirmedCheckoutStatus,
  planDisplay,
  sectionStatus,
  sectionStatusLabel,
  shouldConfirmCheckout,
  shouldCreateCheckout,
  shouldPollDirectDebitStatus,
  studentDetailsAreValid,
  studentDetailsStarted,
} from "@/lib/nz-enrolment/checkout-ui";
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
import { validateStudentDetails } from "@/lib/nz-enrolment/validation";
import styles from "./enrolment-checkout.module.css";

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

const POLL_MS = 3_000;

type StoredDraft = {
  student: NzStudentDetails;
  upfrontAmountCents: number;
  frequency: NzPublicCourse["planPolicy"]["frequency"];
  numberOfInstalments: number;
  firstPaymentDate: string;
};

function draftStorageKey(providerSlug: string, courseSlug: string): string {
  return `nz-enrolment-draft:${providerSlug}:${courseSlug}`;
}

function writeStoredDraft(providerSlug: string, courseSlug: string, draft: StoredDraft): void {
  window.sessionStorage.setItem(draftStorageKey(providerSlug, courseSlug), JSON.stringify(draft));
}

function clearStoredDraft(providerSlug: string, courseSlug: string): void {
  window.sessionStorage.removeItem(draftStorageKey(providerSlug, courseSlug));
}

function useStoredDraft(providerSlug: string, courseSlug: string): StoredDraft | null {
  const key = draftStorageKey(providerSlug, courseSlug);
  const raw = useSyncExternalStore(
    () => () => undefined,
    () => {
      try {
        return window.sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredDraft;
  } catch {
    return null;
  }
}

type StatusPayload = {
  success?: boolean;
  checkout?: { checkout_id?: string; status?: string };
  direct_debit?: {
    setup_complete?: boolean;
    setup_url?: string | null;
  };
  session?: {
    providerSlug?: string;
    courseSlug?: string;
  };
  agreement?: { number?: string | null };
  error?: { message?: string; invalid_fields?: Record<string, string> };
};

export function NzEnrolmentCheckout({ tenant, course, ddaReturn = null }: Props) {
  const studentSectionRef = useRef<HTMLElement | null>(null);
  const ddaSectionRef = useRef<HTMLElement | null>(null);
  const reviewSectionRef = useRef<HTMLElement | null>(null);
  const firstErrorRef = useRef<HTMLSpanElement | null>(null);
  const confirmHelpId = useId();
  const ddaHelpId = useId();

  const storedDraft = useStoredDraft(tenant.slug, course.slug);
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
  const [sectionErrors, setSectionErrors] = useState<{
    student?: string;
    dda?: string;
    review?: string;
  }>({});
  const [setupUrl, setSetupUrl] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [agreementNumber, setAgreementNumber] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const ddaFocusedRef = useRef(false);
  const [declarations, setDeclarations] = useState({
    payment_plan_accepted: false,
    information_confirmed: false,
    privacy_consent_accepted: false,
  });

  const resolvedStudent = studentDetailsStarted(student)
    ? student
    : (storedDraft?.student ?? student);
  const resolvedUpfront =
    storedDraft && !studentDetailsStarted(student)
      ? storedDraft.upfrontAmountCents
      : upfrontAmountCents;
  const resolvedFrequency =
    storedDraft && !studentDetailsStarted(student)
      ? storedDraft.frequency
      : frequency;
  const resolvedInstalments =
    storedDraft && !studentDetailsStarted(student)
      ? storedDraft.numberOfInstalments
      : numberOfInstalments;
  const resolvedFirstPaymentDate =
    storedDraft && firstPaymentDate === defaultFirstPaymentDate()
      ? storedDraft.firstPaymentDate
      : firstPaymentDate;

  const derivedPlan = course.planPolicy.mode === "derived_regular";
  const preview: NzPlanPreview | null = useMemo(() => {
    try {
      if (course.planPolicy.mode === "derived_regular") {
        return previewPlan({
          coursePriceCents: course.paymentPlanCourseFeeCents,
          upfrontAmountCents: course.planPolicy.upfrontAmountCents,
          frequency: course.planPolicy.frequency,
          regularInstalmentCents: course.planPolicy.regularInstalmentCents,
          firstPaymentDate: resolvedFirstPaymentDate,
        });
      }
      return previewPlan({
        coursePriceCents: course.paymentPlanCourseFeeCents,
        upfrontAmountCents: resolvedUpfront,
        frequency: resolvedFrequency,
        numberOfInstalments: resolvedInstalments,
        firstPaymentDate: resolvedFirstPaymentDate,
      });
    } catch {
      return null;
    }
  }, [
    course,
    resolvedFirstPaymentDate,
    resolvedFrequency,
    resolvedInstalments,
    resolvedUpfront,
  ]);

  const display = preview ? planDisplay(preview) : null;
  const studentValid = studentDetailsAreValid(resolvedStudent);
  const studentStarted = studentDetailsStarted(resolvedStudent);
  const ddaError =
    sectionErrors.dda ||
    (ddaReturn === "cancelled"
      ? "Direct Debit setup was cancelled. You can try again without creating a second enrolment."
      : undefined);
  const alreadyCreated = Boolean(setupUrl || checkoutId);
  const alreadyConfirmed = confirmed || isConfirmedCheckoutStatus(checkoutStatus || undefined);
  const accepted = declarationsAccepted(declarations);
  const planLocked = alreadyCreated;
  const payInFull = tenant.checkout.paymentOptions.pay_in_full;
  const courseWebsiteUrl = providerCourseWebsiteUrl(tenant, course);
  const returnToProviderUrl = safeReturnToProviderUrl(tenant);
  const attribution = tenant.presentation.attributionLabel;

  const planStatus = sectionStatus({
    section: "plan",
    planReady: Boolean(preview),
    studentValid,
    studentStarted,
    studentErrors: Object.keys(fieldErrors).length > 0,
    hasCheckoutSession: alreadyCreated,
    setupComplete,
    ddaCancelled: ddaReturn === "cancelled",
    confirmed: alreadyConfirmed,
  });
  const studentStatus = sectionStatus({
    section: "student",
    planReady: Boolean(preview),
    studentValid,
    studentStarted,
    studentErrors: Object.keys(fieldErrors).length > 0,
    hasCheckoutSession: alreadyCreated,
    setupComplete,
    ddaCancelled: ddaReturn === "cancelled",
    confirmed: alreadyConfirmed,
  });
  const ddaStatus = sectionStatus({
    section: "dda",
    planReady: Boolean(preview),
    studentValid,
    studentStarted,
    studentErrors: Object.keys(fieldErrors).length > 0,
    hasCheckoutSession: alreadyCreated,
    setupComplete,
    ddaCancelled: ddaReturn === "cancelled",
    confirmed: alreadyConfirmed,
  });
  const reviewStatus = sectionStatus({
    section: "review",
    planReady: Boolean(preview),
    studentValid,
    studentStarted,
    studentErrors: Object.keys(fieldErrors).length > 0,
    hasCheckoutSession: alreadyCreated,
    setupComplete,
    ddaCancelled: ddaReturn === "cancelled",
    confirmed: alreadyConfirmed,
  });

  const canCreate = shouldCreateCheckout({
    studentValid,
    alreadyCreated,
    userClickedDirectDebit: true,
    busy: false,
  });
  const canConfirm = confirmEnabled({
    studentValid,
    setupComplete,
    declarationsAccepted: accepted,
    busy: false,
    alreadyConfirmed,
  });

  function persistDraft() {
    writeStoredDraft(tenant.slug, course.slug, {
      student: resolvedStudent,
      upfrontAmountCents: resolvedUpfront,
      frequency: resolvedFrequency,
      numberOfInstalments: resolvedInstalments,
      firstPaymentDate: resolvedFirstPaymentDate,
    });
  }

  function applyStatus(json: StatusPayload) {
    if (json.session?.providerSlug && json.session.providerSlug !== tenant.slug) {
      return;
    }
    if (json.session?.courseSlug && json.session.courseSlug !== course.slug) {
      return;
    }
    if (json.direct_debit?.setup_url) {
      setSetupUrl(json.direct_debit.setup_url);
    }
    if (json.direct_debit?.setup_complete) {
      setSetupComplete(true);
    }
    if (json.checkout?.checkout_id) {
      setCheckoutId(json.checkout.checkout_id);
    }
    if (json.checkout?.status) {
      setCheckoutStatus(json.checkout.status);
      if (isConfirmedCheckoutStatus(json.checkout.status)) {
        setConfirmed(true);
        clearStoredDraft(tenant.slug, course.slug);
      }
    }
    if (json.agreement?.number) {
      setAgreementNumber(json.agreement.number);
    }
  }

  async function fetchStatus() {
    const response = await fetch("/api/enrolment-checkout/status", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    const json = (await response.json().catch(() => ({}))) as StatusPayload;
    if (!response.ok) {
      if (response.status !== 404 && alreadyCreated) {
        setSectionErrors((current) => ({
          ...current,
          dda: json.error?.message || "Unable to refresh Direct Debit status.",
        }));
      }
      return;
    }
    applyStatus(json);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/enrolment-checkout/status", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = (await response.json().catch(() => ({}))) as StatusPayload;
      if (cancelled || !response.ok) {
        return;
      }
      applyStatus(json);
    })();
    return () => {
      cancelled = true;
    };
    // Resume only. Never create or confirm from this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot status resume on mount
  }, []);

  useEffect(() => {
    if (!shouldPollDirectDebitStatus({ hasCheckoutSession: alreadyCreated, ddaReturn })) {
      return;
    }
    const timer = window.setInterval(() => {
      void fetchStatus();
    }, POLL_MS);
    return () => window.clearInterval(timer);
    // fetchStatus closes over latest state; interval is gated only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyCreated, ddaReturn]);

  useEffect(() => {
    if (!ddaReturn || ddaFocusedRef.current) {
      return;
    }
    const target = setupComplete ? reviewSectionRef.current : ddaSectionRef.current;
    if (!target) {
      return;
    }
    target.focus();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    ddaFocusedRef.current = true;
  }, [ddaReturn, setupComplete]);

  function updateStudent<K extends keyof NzStudentDetails>(
    key: K,
    value: NzStudentDetails[K],
  ) {
    setStudent((current) => {
      const base = studentDetailsStarted(current)
        ? current
        : (storedDraft?.student ?? current);
      return { ...base, [key]: value };
    });
  }

  async function createCheckout() {
    const nextErrors = validateStudentDetails(resolvedStudent);
    if (
      !shouldCreateCheckout({
        studentValid: Object.keys(nextErrors).length === 0,
        alreadyCreated,
        userClickedDirectDebit: true,
        busy,
      })
    ) {
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        setSectionErrors((current) => ({
          ...current,
          student: "Complete your details before setting up Direct Debit.",
        }));
        studentSectionRef.current?.focus();
        studentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => firstErrorRef.current?.focus(), 50);
      }
      return;
    }

    setBusy(true);
    setError("");
    setSectionErrors((current) => ({ ...current, student: undefined, dda: undefined }));
    persistDraft();
    try {
      const response = await fetch("/api/enrolment-checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerSlug: tenant.slug,
          courseSlug: course.slug,
          student: resolvedStudent,
          plan: {
            paymentOption: "interest_free_payment_plan",
            upfrontAmountCents: resolvedUpfront,
            frequency: resolvedFrequency,
            numberOfInstalments: resolvedInstalments,
            firstPaymentDate: resolvedFirstPaymentDate,
          },
        }),
      });
      const json = (await response.json().catch(() => ({}))) as StatusPayload & {
        success?: boolean;
        direct_debit?: { setup_url?: string; setup_complete?: boolean };
      };
      if (!response.ok || json.success === false) {
        setFieldErrors(json.error?.invalid_fields || {});
        throw new Error(json.error?.message || "Unable to create this enrolment.");
      }
      setSetupUrl(json.direct_debit?.setup_url || "");
      setSetupComplete(Boolean(json.direct_debit?.setup_complete));
      if (json.checkout?.checkout_id) {
        setCheckoutId(json.checkout.checkout_id);
      }
      ddaSectionRef.current?.focus();
      ddaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to create this enrolment.";
      setError(message);
      setSectionErrors((current) => ({ ...current, dda: message }));
      ddaSectionRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function confirmCheckout() {
    if (
      !shouldConfirmCheckout({
        studentValid,
        setupComplete,
        declarationsAccepted: accepted,
        userClickedConfirm: true,
        busy,
        alreadyConfirmed,
      })
    ) {
      setSectionErrors((current) => ({
        ...current,
        review: "Accept the required declarations after Direct Debit is authorised.",
      }));
      reviewSectionRef.current?.focus();
      return;
    }

    setBusy(true);
    setError("");
    setSectionErrors((current) => ({ ...current, review: undefined }));
    try {
      const response = await fetch("/api/enrolment-checkout/confirm", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declarations }),
      });
      const json = (await response.json().catch(() => ({}))) as StatusPayload & {
        success?: boolean;
        already_confirmed?: boolean;
      };
      if (!response.ok || json.success === false) {
        throw new Error(json.error?.message || "Unable to confirm this enrolment.");
      }
      setAgreementNumber(json.agreement?.number || null);
      setCheckoutStatus(json.checkout?.status || "confirmed");
      setConfirmed(true);
      clearStoredDraft(tenant.slug, course.slug);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to confirm this enrolment.";
      setError(message);
      setSectionErrors((current) => ({ ...current, review: message }));
      reviewSectionRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  if (alreadyConfirmed) {
    return (
      <div
        className={styles.page}
        data-testid="nz-enrolment-confirmed"
        style={tenantCssVars(tenant) as CSSProperties}
      >
        <div className={styles.shell}>
          <section className={styles.form} aria-labelledby="nz-enrolment-confirmed-heading">
            <div className={styles.section}>
              <p className={styles.kicker}>{tenant.displayName}</p>
              <h1 id="nz-enrolment-confirmed-heading">{NZ_CONFIRMATION_COPY.heading}</h1>
              <p className={styles.lead}>
                Your {tenant.displayName} enrolment and StudentPay payment plan are now active.
              </p>
              <dl className={styles.review}>
                <dt>Course</dt>
                <dd>{course.name}</dd>
                <dt>Course fee</dt>
                <dd>{formatNzdFromCents(course.paymentPlanCourseFeeCents)}</dd>
                {preview ? (
                  <>
                    <dt>Payment plan</dt>
                    <dd>
                      {display?.regularLabel}
                      {display?.finalPaymentLabel ? ` · ${display.finalPaymentLabel}` : ""}
                    </dd>
                    <dt>First payment date</dt>
                    <dd>{preview.firstPaymentDate}</dd>
                  </>
                ) : null}
                {agreementNumber ? (
                  <>
                    <dt>Payment Plan Agreement</dt>
                    <dd>{agreementNumber}</dd>
                  </>
                ) : null}
                {checkoutId ? (
                  <>
                    <dt>Checkout</dt>
                    <dd>{checkoutId}</dd>
                  </>
                ) : null}
              </dl>
              <p className={styles.lead}>
                Keep an eye on {resolvedStudent.email || "your email"} for your payment plan agreement.{" "}
                {tenant.displayName} will confirm your course access separately.
              </p>
              {returnToProviderUrl ? (
                <div className={styles.actions}>
                  <a className={`${styles.btn} ${styles.btnPrimary}`} href={returnToProviderUrl}>
                    {tenant.presentation.returnToProviderLabel ||
                      `Return to ${tenant.displayName}`}
                  </a>
                </div>
              ) : null}
              <p className={styles.powered}>{attribution}</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.page}
      data-testid="nz-enrolment-single-page"
      style={tenantCssVars(tenant) as CSSProperties}
    >
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <p className={styles.kicker}>{tenant.legalName}</p>
            <h1>{course.name}</h1>
            <p className={styles.fee}>{formatNzdFromCents(course.paymentPlanCourseFeeCents)}</p>
            <p className={styles.lead}>
              Course already selected · {tenant.presentation.attributionLabel}
            </p>
            {courseWebsiteUrl ? (
              <p>
                <a href={courseWebsiteUrl}>
                  View this course on the {tenant.displayName} website
                </a>
              </p>
            ) : null}
          </div>
        </header>

        {error && !sectionErrors.dda && !sectionErrors.review && !sectionErrors.student ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.form}>
          <CheckoutSection
            number={1}
            title={NZ_PAYMENT_PLAN_COPY.heading}
            status={planStatus}
            testId="nz-section-plan"
          >
            <p className={styles.lead}>{NZ_PAYMENT_PLAN_COPY.intro}</p>
            <dl className={styles.review}>
              <dt>Course</dt>
              <dd>{course.name}</dd>
              <dt>Course fee</dt>
              <dd>{formatNzdFromCents(course.paymentPlanCourseFeeCents)}</dd>
              <dt>Payment plan</dt>
              <dd>
                {display?.regularLabel || "Weekly payment plan"}
                <br />
                {display?.upfrontLabel || "$0.00 upfront"}
              </dd>
              <dt>Schedule</dt>
              <dd>
                {display?.regularCountLabel}
                {display?.finalPaymentLabel ? (
                  <>
                    <br />
                    {display.finalPaymentLabel}
                  </>
                ) : null}
              </dd>
              <dt>Total</dt>
              <dd>{display?.totalLabel}</dd>
            </dl>

            {derivedPlan ? null : (
              <div className={styles.grid}>
                <TextField
                  label="Payment-plan deposit (NZD)"
                  name="upfront"
                  type="number"
                  value={String(resolvedUpfront / 100)}
                  disabled={planLocked}
                  onChange={(value) =>
                    setUpfrontAmountCents(Math.round(Number(value || 0) * 100))
                  }
                />
                <label className={styles.field}>
                  <span>Frequency</span>
                  <select
                    value={resolvedFrequency}
                    disabled={planLocked}
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
                  value={String(resolvedInstalments)}
                  disabled={planLocked}
                  onChange={(value) => setNumberOfInstalments(Number(value || 0))}
                />
              </div>
            )}

            <div className={styles.options} data-testid="nz-pay-in-full-secondary">
              <label className={styles.option}>
                <input type="radio" name="payment-option" defaultChecked readOnly />
                <span>
                  <strong>Interest-free payment plan</strong>
                  Pay the Payment Plan Course Fee of{" "}
                  {formatNzdFromCents(course.paymentPlanCourseFeeCents)} in scheduled
                  StudentPay instalments.
                </span>
              </label>
              <div className={styles.option} data-disabled="true">
                <input type="radio" name="payment-option-full" disabled />
                <span>
                  <strong>Payment in Full of Course Fees</strong>{" "}
                  {formatNzdFromCents(course.paymentInFullCourseFeeCents)}.
                  {payInFull.comingSoon
                    ? " Informational only. Not available on this checkout."
                    : " Unavailable."}
                </span>
              </div>
            </div>
            {!preview ? (
              <p className={styles.error} role="alert">
                This plan cannot be reconciled in integer cents.
              </p>
            ) : null}
          </CheckoutSection>

          <CheckoutSection
            number={2}
            title={NZ_STUDENT_DETAILS_COPY.heading}
            status={studentStatus}
            testId="nz-section-student"
            sectionRef={studentSectionRef}
          >
            <p className={styles.lead}>{NZ_STUDENT_DETAILS_COPY.lead}</p>
            {sectionErrors.student ? (
              <p className={styles.error} role="alert">
                {sectionErrors.student}
              </p>
            ) : null}
            <div className={styles.grid}>
              <TextField
                label="First name"
                name="given-name"
                autoComplete="given-name"
                value={resolvedStudent.firstName}
                error={fieldErrors.firstName}
                errorRef={fieldErrors.firstName ? firstErrorRef : undefined}
                onChange={(value) => updateStudent("firstName", value)}
              />
              <TextField
                label="Last name"
                name="family-name"
                autoComplete="family-name"
                value={resolvedStudent.lastName}
                error={fieldErrors.lastName}
                onChange={(value) => updateStudent("lastName", value)}
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                value={resolvedStudent.email}
                error={fieldErrors.email}
                span
                onChange={(value) => updateStudent("email", value)}
              />
              <TextField
                label="Mobile"
                name="tel"
                type="tel"
                autoComplete="tel"
                value={resolvedStudent.mobile}
                error={fieldErrors.mobile}
                onChange={(value) => updateStudent("mobile", value)}
              />
              <TextField
                label="Date of birth"
                name="bday"
                type="date"
                autoComplete="bday"
                value={resolvedStudent.dateOfBirth}
                error={fieldErrors.dateOfBirth}
                onChange={(value) => updateStudent("dateOfBirth", value)}
              />
              <TextField
                label="Street address"
                name="address-line1"
                autoComplete="address-line1"
                value={resolvedStudent.streetAddress}
                error={fieldErrors.streetAddress}
                span
                onChange={(value) => updateStudent("streetAddress", value)}
              />
              <TextField
                label="Suburb"
                name="address-level3"
                autoComplete="address-line2"
                value={resolvedStudent.suburb}
                error={fieldErrors.suburb}
                onChange={(value) => updateStudent("suburb", value)}
              />
              <TextField
                label="City / region"
                name="address-level1"
                autoComplete="address-level1"
                value={resolvedStudent.region}
                error={fieldErrors.region}
                onChange={(value) => {
                  setStudent((current) => {
                    const base = studentDetailsStarted(current)
                      ? current
                      : (storedDraft?.student ?? current);
                    return { ...base, region: value, city: value };
                  });
                }}
              />
              <TextField
                label="Postcode"
                name="postal-code"
                autoComplete="postal-code"
                value={resolvedStudent.postcode}
                error={fieldErrors.postcode}
                onChange={(value) => updateStudent("postcode", value)}
              />
              <TextField
                label="Country"
                name="country-name"
                autoComplete="country-name"
                value={resolvedStudent.country}
                error={fieldErrors.country}
                onChange={(value) => updateStudent("country", value)}
              />
            </div>
          </CheckoutSection>

          <CheckoutSection
            number={3}
            title={NZ_DIRECT_DEBIT_COPY.heading}
            status={ddaStatus}
            testId="nz-section-dda"
            sectionRef={ddaSectionRef}
          >
            <p className={styles.lead}>
              {tenant.checkout.wording?.ddaLead ||
                "You are setting up a Direct Debit authority with StudentPay NZ. This is not a card payment."}
            </p>
            <div className={styles.grid}>
              <TextField
                label="First payment date"
                name="first-payment-date"
                type="date"
                value={resolvedFirstPaymentDate}
                disabled={planLocked}
                onChange={setFirstPaymentDate}
              />
            </div>
            {setupComplete ? (
              <div className={styles.completePanel} data-testid="nz-dda-complete" role="status">
                <h3>{NZ_DIRECT_DEBIT_COPY.authorisedTitle}</h3>
                <p>{NZ_DIRECT_DEBIT_COPY.authorisedBody}</p>
              </div>
            ) : (
              <>
                <p id={ddaHelpId} className={styles.note}>
                  {studentValid
                    ? alreadyCreated
                      ? "Continue to StudentPay’s hosted bank setup (GoCardless BECS NZ). Come back here when it finishes."
                      : "Your details are ready. Set up Direct Debit when you are ready to continue."
                    : "Complete your details above before setting up Direct Debit."}
                </p>
                {!alreadyCreated ? (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}
                      disabled={!canCreate || busy}
                      aria-describedby={ddaHelpId}
                      onClick={() => void createCheckout()}
                    >
                      {busy ? "Creating enrolment…" : NZ_DIRECT_DEBIT_CTA}
                    </button>
                  </div>
                ) : null}
                {setupUrl && !setupComplete ? (
                  <div className={styles.actions}>
                    <a
                      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}
                      href={setupUrl}
                    >
                      Continue to Direct Debit setup
                    </a>
                  </div>
                ) : null}
              </>
            )}
            {ddaError ? (
              <p className={styles.error} role="alert">
                {ddaError}
              </p>
            ) : null}
          </CheckoutSection>

          <CheckoutSection
            number={4}
            title={NZ_REVIEW_COPY.heading}
            status={reviewStatus}
            testId="nz-section-review"
            sectionRef={reviewSectionRef}
          >
            <dl className={styles.review}>
              <dt>Course</dt>
              <dd>{course.name}</dd>
              <dt>Course fee</dt>
              <dd>{formatNzdFromCents(course.paymentPlanCourseFeeCents)}</dd>
              <dt>Payment plan</dt>
              <dd>
                {display?.regularLabel}
                {display?.finalPaymentLabel ? ` · ${display.finalPaymentLabel}` : ""}
              </dd>
              <dt>Regular instalment</dt>
              <dd>
                {preview
                  ? formatNzdFromCents(preview.regularInstalmentAmountCents)
                  : "—"}
              </dd>
              {preview?.hasResidualFinal && preview.finalInstalmentAmountCents != null ? (
                <>
                  <dt>Final residual</dt>
                  <dd>{formatNzdFromCents(preview.finalInstalmentAmountCents)}</dd>
                </>
              ) : null}
              <dt>First payment date</dt>
              <dd>{resolvedFirstPaymentDate}</dd>
              <dt>Student</dt>
              <dd>
                {resolvedStudent.firstName} {resolvedStudent.lastName}
                {resolvedStudent.email ? ` · ${resolvedStudent.email}` : ""}
              </dd>
            </dl>
            <fieldset className={styles.checks}>
              <legend>Agreements</legend>
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
            </fieldset>
            <p id={confirmHelpId} className={styles.lead}>
              {!studentValid
                ? "Complete your details before confirming."
                : !setupComplete
                  ? "Authorise Direct Debit before confirming enrolment."
                  : !canConfirm
                    ? "Accept every declaration to confirm enrolment."
                    : "Ready to confirm enrolment and activate the payment plan."}
            </p>
            {sectionErrors.review ? (
              <p className={styles.error} role="alert">
                {sectionErrors.review}
              </p>
            ) : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}
                disabled={!canConfirm || busy}
                aria-describedby={confirmHelpId}
                onClick={() => void confirmCheckout()}
              >
                {busy ? "Confirming…" : NZ_CONFIRM_CTA}
              </button>
            </div>
          </CheckoutSection>
        </div>
        <p className={styles.powered}>
          {attribution}
          {tenant.checkout.wording?.supportNote
            ? ` · ${tenant.checkout.wording.supportNote}`
            : null}
        </p>
      </div>
    </div>
  );
}

function CheckoutSection({
  number,
  title,
  status,
  testId,
  children,
  sectionRef,
}: {
  number: number;
  title: string;
  status: ReturnType<typeof sectionStatus>;
  testId: string;
  children: ReactNode;
  sectionRef?: RefObject<HTMLElement | null>;
}) {
  const headingId = `nz-section-heading-${number}`;
  return (
    <section
      className={styles.section}
      data-testid={testId}
      data-status={status}
      aria-labelledby={headingId}
      tabIndex={-1}
      ref={sectionRef}
    >
      <div className={styles.sectionHeading}>
        <p className={styles.kicker}>
          <span>Section {number}</span>
          <span className={styles.statusBadge} data-status={status}>
            {sectionStatusLabel(status)}
          </span>
        </p>
        <h2 id={headingId}>{title}</h2>
      </div>
      {children}
    </section>
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
  disabled,
  errorRef,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  error?: string;
  span?: boolean;
  disabled?: boolean;
  errorRef?: RefObject<HTMLSpanElement | null>;
}) {
  const id = `nz-enrol-${name}`;
  const errorId = `${id}-error`;
  return (
    <label className={styles.field} data-span={span ? "2" : undefined} data-invalid={Boolean(error)}>
      <span>{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        inputMode={type === "number" ? "decimal" : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <span id={errorId} className={styles.error} role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
