"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { DdaSetupEmbed } from "@/components/enrolment/DdaSetupEmbed";
import {
  TermsModal,
  type TermsModalType,
} from "@/components/enrolment/TermsModal";
import {
  ageFromDob,
  createId,
  formatCurrency,
  formatPaymentFrequency,
  futureDate,
} from "@/lib/provider-experience/format";
import {
  formatApiError,
  toEmbeddedSetupUrl,
} from "@/lib/provider-experience/checkout";
import type { Course } from "@/types/course";
import type {
  CheckoutSession,
  EnrolmentFieldErrors,
  EnrolmentFormData,
  EnrolmentPaymentOption,
} from "@/types/enrolment";
import type { Provider } from "@/types/provider";

type EnrolmentWizardProps = {
  provider: Provider;
  course: Course;
  initialPaymentOption?: EnrolmentPaymentOption;
  /** StudentPay API host used for legal agreement iframes (must match token issuer). */
  legalApiBaseUrl?: string;
  /** Provider code sent to StudentPay APIs (e.g. SANDBOX_DEMO), not the catalogue brand code. */
  studentPayProviderCode?: string;
  /** When true, hide the standalone harness chrome for in-page embedding. */
  embedded?: boolean;
};

const STEPS = [
  { id: "course", label: "Course" },
  { id: "screening", label: "Screening" },
  { id: "ssc", label: "Study skills" },
  { id: "dossier", label: "Details" },
  { id: "payment", label: "Confirm and Pay" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function createInitialFormData(
  paymentOption: EnrolmentPaymentOption,
): EnrolmentFormData {
  return {
    firstName: "Jamie",
    lastName: "Nguyen",
    dateOfBirth: "1998-06-15",
    email: "jamie.nguyen.example@example.com",
    mobile: "0412345678",
    citizenship: "australian_citizen",
    guardianName: "",
    guardianRelationship: "",
    guardianEmail: "",
    guardianPhone: "",
    addressLine1: "42 Example Street",
    suburb: "Fortitude Valley",
    state: "QLD",
    postcode: "4006",
    usi: "EXAMPLEUSI",
    emergencyName: "Alex Nguyen",
    emergencyPhone: "0411000000",
    emergencyRelationship: "Sibling",
    paymentOption,
    firstPaymentDate: futureDate(14),
    depositConfirmed: false,
    sscPassed: false,
    photoIdUploaded: false,
    marketingConsent: false,
    paymentTermsAccepted: false,
    informationConfirmed: false,
    privacyAccepted: false,
  };
}

function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateMobile(value: string): boolean {
  const normalised = value.replace(/\s/g, "");
  return /^(\+?61|0)4\d{8}$/.test(normalised);
}

function validatePostcode(value: string): boolean {
  return /^\d{4}$/.test(value);
}

export function EnrolmentWizard({
  provider,
  course,
  initialPaymentOption = "plan",
  legalApiBaseUrl = "https://sandbox-api.studentpay.com.au",
  studentPayProviderCode,
  embedded = false,
}: EnrolmentWizardProps) {
  const apiProviderCode = studentPayProviderCode || provider.code;
  const storageKey = `studentpay-px-enrolment:${provider.slug}:${course.slug}`;
  const paymentFrequency = formatPaymentFrequency(
    course.paymentPlan.frequency,
  );

  const [currentStep, setCurrentStep] = useState<StepId>("course");
  const [formData, setFormData] = useState<EnrolmentFormData>(() =>
    createInitialFormData(initialPaymentOption),
  );
  const [errors, setErrors] = useState<EnrolmentFieldErrors>({});
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);
  const [openingDda, setOpeningDda] = useState(false);
  const [showEmbeddedDda, setShowEmbeddedDda] = useState(false);
  const [directDebitAuthorised, setDirectDebitAuthorised] = useState(false);
  const [checkoutSession, setCheckoutSession] =
    useState<CheckoutSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [enrolmentConfirmed, setEnrolmentConfirmed] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
    [key: string]: unknown;
  } | null>(null);
  const [termsModal, setTermsModal] = useState<TermsModalType | null>(null);
  const [cardDetails, setCardDetails] = useState({
    cardholderName: "Jamie Nguyen",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  const stepIndex = STEPS.findIndex((step) => step.id === currentStep);
  const progressPercentage = ((stepIndex + 1) / STEPS.length) * 100;
  const age = ageFromDob(formData.dateOfBirth);
  const needsGuardian = age !== null && age < 18;
  const planBalance = Math.max(
    course.paymentPlan.totalFee - course.paymentPlan.depositAmount,
    0,
  );
  const instalments =
    course.paymentPlan.numberOfPayments ??
    Math.max(
      Math.round(planBalance / course.paymentPlan.repaymentAmount),
      1,
    );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          currentStep?: StepId;
          formData?: EnrolmentFormData;
        };
        if (parsed.formData) {
          setFormData({
            ...createInitialFormData(initialPaymentOption),
            ...parsed.formData,
            paymentOption:
              parsed.formData.paymentOption ?? initialPaymentOption,
          });
        }
        if (parsed.currentStep) {
          setCurrentStep(parsed.currentStep);
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHasLoadedSavedData(true);
    }
  }, [initialPaymentOption, storageKey]);

  useEffect(() => {
    if (!hasLoadedSavedData || enrolmentConfirmed) {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ currentStep, formData }),
    );
  }, [
    currentStep,
    formData,
    hasLoadedSavedData,
    enrolmentConfirmed,
    storageKey,
  ]);

  useEffect(() => {
    function receiveMessage(event: MessageEvent) {
      const trustedOrigins = [
        "https://api.studentpay.com.au",
        "https://sandbox-api.studentpay.com.au",
      ];

      if (!trustedOrigins.includes(event.origin)) {
        return;
      }

      if (
        event.data?.type !== "studentpay:dda-authorised" ||
        event.data?.status !== "authorised"
      ) {
        return;
      }

      if (
        checkoutSession?.ddaId &&
        event.data.ddaId &&
        checkoutSession.ddaId !== event.data.ddaId
      ) {
        return;
      }

      setDirectDebitAuthorised(true);
      setShowEmbeddedDda(false);
      setEnrolmentConfirmed(false);
      setResult({
        success: true,
        message: "Direct debit authority successfully completed.",
        ddaId: event.data.ddaId,
        opportunityId: event.data.opportunityId,
      });
    }

    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, [checkoutSession]);

  const themeStyle = useMemo(
    () =>
      ({
        "--px-primary": provider.theme.primaryColour,
        "--px-secondary": provider.theme.secondaryColour,
        "--px-accent": provider.theme.accentColour,
        "--px-bg": provider.theme.backgroundColour,
        "--px-surface": provider.theme.surfaceColour,
        "--px-text": provider.theme.textColour,
        "--px-muted": provider.theme.mutedTextColour,
      }) as CSSProperties,
    [provider.theme],
  );

  function updateField<K extends keyof EnrolmentFormData>(
    field: K,
    value: EnrolmentFormData[K],
  ) {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleTextChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const field = event.target.name as keyof EnrolmentFormData;
    updateField(field, event.target.value as never);
  }

  function resetStudentPayAuthorisation() {
    setDirectDebitAuthorised(false);
    setCheckoutSession(null);
    setEnrolmentConfirmed(false);
    setShowEmbeddedDda(false);
    setResult(null);
  }

  function selectPaymentOption(option: EnrolmentPaymentOption) {
    updateField("paymentOption", option);
    setEnrolmentConfirmed(false);
    setResult(null);

    if (option !== "plan") {
      updateField("depositConfirmed", false);
      resetStudentPayAuthorisation();
      updateField("paymentTermsAccepted", false);
      updateField("informationConfirmed", false);
      updateField("privacyAccepted", false);
    }
  }

  function validateCurrentStep(): boolean {
    const nextErrors: EnrolmentFieldErrors = {};

    if (currentStep === "screening") {
      if (!formData.firstName.trim()) {
        nextErrors.firstName = "Enter your first name.";
      }
      if (!formData.lastName.trim()) {
        nextErrors.lastName = "Enter your last name.";
      }
      if (!formData.dateOfBirth) {
        nextErrors.dateOfBirth = "Enter your date of birth.";
      }
      if (!formData.email.trim()) {
        nextErrors.email = "Enter your email address.";
      } else if (!validateEmail(formData.email)) {
        nextErrors.email = "Enter a valid email address.";
      }
      if (!formData.mobile.trim()) {
        nextErrors.mobile = "Enter your mobile number.";
      } else if (!validateMobile(formData.mobile)) {
        nextErrors.mobile = "Enter a valid Australian mobile number.";
      }
      if (!formData.citizenship) {
        nextErrors.citizenship = "Select your citizenship status.";
      }
      if (needsGuardian) {
        if (!formData.guardianName.trim()) {
          nextErrors.guardianName = "Enter your guardian's name.";
        }
        if (!formData.guardianRelationship.trim()) {
          nextErrors.guardianRelationship =
            "Enter your relationship to your guardian.";
        }
        if (!formData.guardianEmail.trim()) {
          nextErrors.guardianEmail = "Enter your guardian's email.";
        } else if (!validateEmail(formData.guardianEmail)) {
          nextErrors.guardianEmail = "Enter a valid guardian email.";
        }
      }
    }

    if (currentStep === "ssc" && !formData.sscPassed) {
      nextErrors.sscPassed = "Pass the Study Skills Check to continue.";
    }

    if (currentStep === "dossier") {
      if (!formData.addressLine1.trim()) {
        nextErrors.addressLine1 = "Enter your street address.";
      }
      if (!formData.suburb.trim()) {
        nextErrors.suburb = "Enter your suburb.";
      }
      if (!formData.state) {
        nextErrors.state = "Select your state.";
      }
      if (!formData.postcode.trim()) {
        nextErrors.postcode = "Enter your postcode.";
      } else if (!validatePostcode(formData.postcode)) {
        nextErrors.postcode = "Enter a valid four-digit postcode.";
      }
      if (!formData.usi.trim()) {
        nextErrors.usi = "Enter your USI.";
      }
      if (!formData.emergencyName.trim()) {
        nextErrors.emergencyName = "Enter an emergency contact name.";
      }
      if (!formData.emergencyPhone.trim()) {
        nextErrors.emergencyPhone = "Enter an emergency contact phone.";
      }
      if (!formData.emergencyRelationship.trim()) {
        nextErrors.emergencyRelationship =
          "Enter the emergency contact relationship.";
      }
      if (!formData.photoIdUploaded) {
        nextErrors.photoIdUploaded =
          "Confirm photo ID upload (simulated in this environment).";
      }
    }

    if (currentStep === "payment" && !formData.paymentOption) {
      nextErrors.paymentOption = "Choose a payment option.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goToStep(step: StepId) {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNext() {
    if (!validateCurrentStep()) {
      return;
    }

    const next = STEPS[Math.min(stepIndex + 1, STEPS.length - 1)];
    goToStep(next.id);
  }

  function handleBack() {
    setErrors({});
    const previous = STEPS[Math.max(stepIndex - 1, 0)];
    goToStep(previous.id);
  }

  function getPopupFeatures() {
    const width = 700;
    const height = 850;
    const left =
      window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top =
      window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    return [
      `width=${width}`,
      `height=${height}`,
      `left=${Math.round(left)}`,
      `top=${Math.round(top)}`,
      "resizable=yes",
      "scrollbars=yes",
    ].join(",");
  }

  async function createCheckoutSession(): Promise<CheckoutSession> {
    const response = await fetch("/api/studentpay/provider-checkouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerSlug: provider.slug,
        courseSlug: course.slug,
        formData,
        providerOrderId: createId(`AA-${course.code}`),
      }),
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(
        data.error?.message ||
          data.error ||
          "StudentPay could not prepare the direct debit setup.",
      );
    }

    const session: CheckoutSession = {
      checkoutToken: data.checkout_token || data.checkout?.checkout_token || "",
      opportunityId:
        data.opportunity_id || data.checkout?.opportunity_id || "",
      ddaId: data.dda_id || data.checkout?.dda_id || "",
      checkoutId: data.checkout_id || data.checkout?.checkout_id || "",
      providerOrderId: data.provider_order_id,
      redirectUrl: data.setup_url || data.redirect_url || "",
    };

    if (!session.redirectUrl) {
      throw new Error("StudentPay did not return a direct debit setup URL.");
    }

    setCheckoutSession(session);
    return session;
  }

  async function openDirectDebitWindow() {
    if (directDebitSetupBlocked || openingDda) {
      return;
    }

    const popup = window.open("", "studentpay-dda", getPopupFeatures());

    if (!popup) {
      setOpeningDda(true);
      setResult(null);

      try {
        let session = checkoutSession;
        if (!session) {
          session = await createCheckoutSession();
        }
        setShowEmbeddedDda(true);
        setCheckoutSession({
          ...session,
          redirectUrl: toEmbeddedSetupUrl(session.redirectUrl),
        });
      } catch (error) {
        setResult({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to start the direct debit setup.",
        });
      } finally {
        setOpeningDda(false);
      }
      return;
    }

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Preparing StudentPay</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="margin:0;min-height:100vh;display:grid;place-items:center;padding:32px;box-sizing:border-box;font-family:Georgia,serif;color:#43464B;background:#FFF9F4;text-align:center;">
          <div>
            <h1 style="margin:0 0 12px;">StudentPay</h1>
            <p style="margin:0;color:#666A71;">Preparing your secure direct debit setup…</p>
          </div>
        </body>
      </html>
    `);
    popup.document.close();

    setOpeningDda(true);
    setResult(null);
    setEnrolmentConfirmed(false);

    try {
      let session = checkoutSession;
      if (!session) {
        session = await createCheckoutSession();
      }
      popup.location.replace(session.redirectUrl);
      popup.focus();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to start the direct debit setup.";

      setResult({ success: false, error: errorMessage });

      if (!popup.closed) {
        popup.document.open();
        popup.document.write(`
          <!doctype html>
          <html lang="en-AU">
            <head><meta charset="utf-8" /><title>StudentPay Setup Error</title></head>
            <body style="margin:0;min-height:100vh;display:grid;place-items:center;padding:32px;font-family:Georgia,serif;background:#FFF9F4;color:#43464B;">
              <div style="max-width:520px;padding:28px;border:1px solid #D9DCE1;border-radius:16px;background:#fff;">
                <h1 style="margin:0 0 12px;font-size:26px;">Unable to start direct debit setup</h1>
                <p style="margin:0 0 18px;color:#666A71;">${errorMessage.replaceAll("<", "&lt;")}</p>
                <button type="button" onclick="window.close()" style="padding:12px 18px;border:0;border-radius:8px;background:#F45F68;color:#fff;font-weight:700;cursor:pointer;">Close</button>
              </div>
            </body>
          </html>
        `);
        popup.document.close();
      }
    } finally {
      setOpeningDda(false);
    }
  }

  async function confirmAndPay(event?: FormEvent) {
    event?.preventDefault();

    if (confirmAndPayBlocked || enrolmentConfirmed) {
      return;
    }

    if (!checkoutSession) {
      setResult({
        success: false,
        error:
          "The StudentPay checkout session is missing. Please complete the direct debit setup again.",
      });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch(
        "/api/studentpay/provider-checkout-confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: {
              provider_code: apiProviderCode,
              provider_order_id: checkoutSession.providerOrderId,
            },
            checkout: {
              checkout_id: checkoutSession.checkoutId,
              checkout_token: checkoutSession.checkoutToken,
              opportunity_id: checkoutSession.opportunityId,
              dda_id: checkoutSession.ddaId,
            },
            payment: {
              payment_method: "studentpay_payment_plan",
              deposit_confirmed: formData.depositConfirmed,
              first_payment_date: formData.firstPaymentDate,
            },
            declarations: {
              payment_plan_accepted: formData.paymentTermsAccepted,
              information_confirmed: formData.informationConfirmed,
              privacy_consent_accepted: formData.privacyAccepted,
            },
            confirmed_at: new Date().toISOString(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          formatApiError(
            data.error ?? data.message ?? data,
            "The enrolment could not be confirmed.",
          ),
        );
      }

      window.localStorage.removeItem(storageKey);
      setEnrolmentConfirmed(true);
      setResult({
        success: true,
        message:
          data.message ||
          "Your enrolment and StudentPay payment plan have been confirmed.",
        opportunityId: checkoutSession.opportunityId,
        ddaId: checkoutSession.ddaId,
      });
    } catch (error) {
      setResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "The enrolment could not be confirmed.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function startAgain() {
    window.localStorage.removeItem(storageKey);
    setFormData(createInitialFormData(initialPaymentOption));
    setErrors({});
    setCurrentStep("course");
    setDirectDebitAuthorised(false);
    setCheckoutSession(null);
    setEnrolmentConfirmed(false);
    setShowEmbeddedDda(false);
    setResult(null);
    setSubmitting(false);
    setOpeningDda(false);
  }

  const directDebitSetupBlocked =
    openingDda ||
    !formData.sscPassed ||
    !formData.firstPaymentDate ||
    !formData.depositConfirmed ||
    formData.paymentOption !== "plan";

  const confirmAndPayBlocked =
    submitting ||
    !checkoutSession ||
    !directDebitAuthorised ||
    !formData.depositConfirmed ||
    !formData.paymentTermsAccepted ||
    !formData.informationConfirmed ||
    !formData.privacyAccepted;

  if (showEmbeddedDda && checkoutSession) {
    return (
      <div style={themeStyle}>
        <DdaSetupEmbed
          setupUrl={toEmbeddedSetupUrl(checkoutSession.redirectUrl)}
          studentFirstName={formData.firstName}
          courseTitle={course.title}
          onAuthorised={() => {
            setDirectDebitAuthorised(true);
            setShowEmbeddedDda(false);
            setResult({
              success: true,
              message: "Direct debit authority successfully completed.",
            });
          }}
          onRestart={() => setShowEmbeddedDda(false)}
        />
      </div>
    );
  }

  if (enrolmentConfirmed) {
    return (
      <section className="enrolment-complete" style={themeStyle}>
        <div className="page-shell enrolment-complete__card">
          <div className="enrolment-complete__icon" aria-hidden="true">
            ✓
          </div>
          <p className="enrolment-wizard__eyebrow">Enrolment confirmed</p>
          <h1>
            Thanks, {formData.firstName}. Your Criminal Psychology enrolment
            is confirmed.
          </h1>
          <p className="enrolment-complete__lead">
            Your StudentPay payment plan has been activated using the same
            confirm-and-pay flow developed in the OnFit enrolment wizard.
          </p>
          <div className="enrolment-complete__summary">
            <div>
              <span>Course</span>
              <strong>{course.title}</strong>
            </div>
            <div>
              <span>Student</span>
              <strong>
                {formData.firstName} {formData.lastName}
              </strong>
            </div>
            <div>
              <span>Payment plan</span>
              <strong>
                {formatCurrency(course.paymentPlan.depositAmount)} deposit +{" "}
                {formatCurrency(course.paymentPlan.repaymentAmount)} per{" "}
                {paymentFrequency}
              </strong>
            </div>
          </div>
          <div className="enrolment-complete__actions">
            <Link href="/" className="button button--primary">
              Return to harness home
            </Link>
            <button
              type="button"
              className="button button--secondary"
              onClick={startAgain}
            >
              Start again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      className={
        embedded
          ? "enrolment-wizard enrolment-wizard--embedded"
          : "enrolment-wizard"
      }
      style={themeStyle}
    >
      {embedded ? null : (
        <header className="enrolment-wizard__header">
          <div className="page-shell enrolment-wizard__header-inner">
            <Link href="/" className="enrolment-wizard__back-link">
              ← Return to harness
            </Link>

            <Image
              src={provider.logoPath}
              alt={`${provider.name} logo`}
              width={185}
              height={70}
              className="enrolment-wizard__logo"
              priority
            />

            <span className="enrolment-wizard__powered-by">
              Provider Experience · OnFit wizard parity
            </span>
          </div>
        </header>
      )}

      <div className="enrolment-wizard__progress">
        <div className="page-shell">
          <div className="enrolment-wizard__progress-heading">
            <div>
              <span>
                Step {stepIndex + 1} of {STEPS.length}
              </span>
              <strong>{STEPS[stepIndex].label}</strong>
            </div>
            <span>{Math.round(progressPercentage)}% complete</span>
          </div>

          <div className="enrolment-wizard__progress-track" aria-hidden="true">
            <span style={{ width: `${progressPercentage}%` }} />
          </div>

          <ol className="enrolment-wizard__step-list">
            {STEPS.map((step, index) => (
              <li
                key={step.id}
                className={
                  step.id === currentStep
                    ? "is-active"
                    : index < stepIndex
                      ? "is-complete"
                      : ""
                }
              >
                <span>{index + 1}</span>
                <strong>{step.label}</strong>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <main className="enrolment-wizard__main">
        <div className="page-shell enrolment-wizard__layout">
          <form
            className="enrolment-wizard__form-card"
            onSubmit={confirmAndPay}
            noValidate
          >
            {currentStep === "course" ? (
              <section className="wizard-step">
                <p className="enrolment-wizard__eyebrow">Course confirmation</p>
                <h1>Confirm your Criminal Psychology enrolment.</h1>
                <p className="wizard-step__lead">
                  This Provider Experience checkout uses the full OnFit
                  enrolment wizard flow: screening, study skills, dossier and
                  StudentPay confirm-and-pay.
                </p>

                <div className="wizard-course-confirmation">
                  <div
                    className={`wizard-course-confirmation__visual wizard-course-confirmation__visual--${course.visualTone}`}
                  >
                    <span>{course.category}</span>
                  </div>
                  <div className="wizard-course-confirmation__content">
                    <h2>{course.title}</h2>
                    <p>{course.shortDescription}</p>
                    <dl>
                      <div>
                        <dt>Delivery</dt>
                        <dd>{course.deliveryMode}</dd>
                      </div>
                      <div>
                        <dt>Duration</dt>
                        <dd>{course.duration}</dd>
                      </div>
                      <div>
                        <dt>Course fee</dt>
                        <dd>
                          {formatCurrency(course.paymentPlan.totalFee)}
                        </dd>
                      </div>
                      <div>
                        <dt>Delivered by</dt>
                        <dd>{course.deliveryProvider || provider.name}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="wizard-notice">
                  <strong>OnFit wizard parity</strong>
                  <span>
                    Course → Screening → Study skills → Details → Confirm and
                    Pay, including deposit simulation, direct debit authority,
                    terms modals and enrolment confirmation.
                  </span>
                </div>
              </section>
            ) : null}

            {currentStep === "screening" ? (
              <section className="wizard-step">
                <p className="enrolment-wizard__eyebrow">
                  Eligibility screening
                </p>
                <h1>Tell us who you are.</h1>
                <p className="wizard-step__lead">
                  Pre-SSC screening collects identity and citizenship before
                  the fuller dossier.
                </p>

                <div className="wizard-form-grid">
                  <Field
                    id="firstName"
                    label="First name"
                    value={formData.firstName}
                    error={errors.firstName}
                    onChange={handleTextChange}
                    autoComplete="given-name"
                  />
                  <Field
                    id="lastName"
                    label="Last name"
                    value={formData.lastName}
                    error={errors.lastName}
                    onChange={handleTextChange}
                    autoComplete="family-name"
                  />
                  <Field
                    id="email"
                    label="Email address"
                    type="email"
                    value={formData.email}
                    error={errors.email}
                    onChange={handleTextChange}
                    autoComplete="email"
                  />
                  <Field
                    id="mobile"
                    label="Mobile number"
                    value={formData.mobile}
                    error={errors.mobile}
                    onChange={handleTextChange}
                    autoComplete="tel"
                    placeholder="04XX XXX XXX"
                  />
                  <Field
                    id="dateOfBirth"
                    label="Date of birth"
                    type="date"
                    value={formData.dateOfBirth}
                    error={errors.dateOfBirth}
                    onChange={handleTextChange}
                  />
                  <div className="wizard-field">
                    <label htmlFor="citizenship">Citizenship</label>
                    <select
                      id="citizenship"
                      name="citizenship"
                      value={formData.citizenship}
                      onChange={handleTextChange}
                      aria-invalid={Boolean(errors.citizenship)}
                    >
                      <option value="australian_citizen">
                        Australian / NZ Citizen
                      </option>
                      <option value="permanent_resident">
                        Australian / NZ Permanent Resident
                      </option>
                      <option value="temporary_visa">Visa Holder</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.citizenship ? (
                      <span className="wizard-field__error">
                        {errors.citizenship}
                      </span>
                    ) : null}
                  </div>
                </div>

                {needsGuardian ? (
                  <div className="wizard-form-grid wizard-guardian">
                    <p className="wizard-step__lead wizard-field--full">
                      Because you are under 18, guardian details are required
                      before continuing.
                    </p>
                    <Field
                      id="guardianName"
                      label="Guardian name"
                      value={formData.guardianName}
                      error={errors.guardianName}
                      onChange={handleTextChange}
                    />
                    <Field
                      id="guardianRelationship"
                      label="Relationship"
                      value={formData.guardianRelationship}
                      error={errors.guardianRelationship}
                      onChange={handleTextChange}
                    />
                    <Field
                      id="guardianEmail"
                      label="Guardian email"
                      type="email"
                      value={formData.guardianEmail}
                      error={errors.guardianEmail}
                      onChange={handleTextChange}
                    />
                    <Field
                      id="guardianPhone"
                      label="Guardian phone (optional)"
                      value={formData.guardianPhone}
                      onChange={handleTextChange}
                    />
                  </div>
                ) : null}
              </section>
            ) : null}

            {currentStep === "ssc" ? (
              <section className="wizard-step">
                <p className="enrolment-wizard__eyebrow">Study Skills Check</p>
                <h1>Complete the Study Skills Check.</h1>
                <p className="wizard-step__lead">
                  As in the OnFit harness, the live SSC question set is not
                  bundled here. Use the control below to simulate a pass and
                  unlock the dossier.
                </p>

                <button
                  type="button"
                  className={
                    formData.sscPassed
                      ? "button button--success"
                      : "button button--primary"
                  }
                  onClick={() => {
                    updateField("sscPassed", !formData.sscPassed);
                    setErrors((current) => ({
                      ...current,
                      sscPassed: undefined,
                    }));
                  }}
                >
                  {formData.sscPassed
                    ? "✓ SSC passed"
                    : "Simulate SSC pass"}
                </button>

                {errors.sscPassed ? (
                  <p className="wizard-step__error">{errors.sscPassed}</p>
                ) : null}
              </section>
            ) : null}

            {currentStep === "dossier" ? (
              <section className="wizard-step">
                <p className="enrolment-wizard__eyebrow">Student dossier</p>
                <h1>Complete your enrolment details.</h1>
                <p className="wizard-step__lead">
                  Address, USI, emergency contact and photo ID — required after
                  an SSC pass, matching the OnFit dossier step.
                </p>

                <div className="wizard-form-grid">
                  <Field
                    id="addressLine1"
                    label="Street address"
                    value={formData.addressLine1}
                    error={errors.addressLine1}
                    onChange={handleTextChange}
                    className="wizard-field--full"
                    autoComplete="address-line1"
                  />
                  <Field
                    id="suburb"
                    label="Suburb"
                    value={formData.suburb}
                    error={errors.suburb}
                    onChange={handleTextChange}
                    autoComplete="address-level2"
                  />
                  <div className="wizard-field">
                    <label htmlFor="state">State</label>
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleTextChange}
                      aria-invalid={Boolean(errors.state)}
                    >
                      <option value="">Select state</option>
                      {["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"].map(
                        (state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ),
                      )}
                    </select>
                    {errors.state ? (
                      <span className="wizard-field__error">
                        {errors.state}
                      </span>
                    ) : null}
                  </div>
                  <Field
                    id="postcode"
                    label="Postcode"
                    value={formData.postcode}
                    error={errors.postcode}
                    onChange={handleTextChange}
                    maxLength={4}
                    autoComplete="postal-code"
                  />
                  <Field
                    id="usi"
                    label="USI"
                    value={formData.usi}
                    error={errors.usi}
                    onChange={handleTextChange}
                  />
                  <Field
                    id="emergencyName"
                    label="Emergency contact"
                    value={formData.emergencyName}
                    error={errors.emergencyName}
                    onChange={handleTextChange}
                  />
                  <Field
                    id="emergencyPhone"
                    label="Emergency phone"
                    value={formData.emergencyPhone}
                    error={errors.emergencyPhone}
                    onChange={handleTextChange}
                  />
                  <Field
                    id="emergencyRelationship"
                    label="Relationship"
                    value={formData.emergencyRelationship}
                    error={errors.emergencyRelationship}
                    onChange={handleTextChange}
                  />
                </div>

                <label className="checkboxLine">
                  <input
                    type="checkbox"
                    checked={formData.photoIdUploaded}
                    onChange={(event) =>
                      updateField("photoIdUploaded", event.target.checked)
                    }
                  />
                  <span>
                    Simulate colour photo ID upload (no identity documents are
                    stored in this test environment).
                  </span>
                </label>
                {errors.photoIdUploaded ? (
                  <span className="wizard-field__error">
                    {errors.photoIdUploaded}
                  </span>
                ) : null}
              </section>
            ) : null}

            {currentStep === "payment" ? (
              <section className="wizard-step">
                <p className="enrolment-wizard__eyebrow">Confirm and Pay</p>
                <h1>Review your payment arrangement.</h1>
                <p className="wizard-step__lead">
                  Choose how to pay, then complete deposit confirmation, direct
                  debit authority and enrolment confirmation — matching the
                  OnFit StudentPay path.
                </p>

                <div className="checkoutSection">
                  <div className="sectionHeading">
                    <span className="sectionNumber">1</span>
                    <div>
                      <h3>Select your payment option</h3>
                      <p>Choose the payment method that works best for you.</p>
                    </div>
                  </div>

                  <div className="wizard-payment-options">
                    <PaymentCard
                      selected={formData.paymentOption === "full"}
                      title="Pay in full"
                      price={formatCurrency(course.paymentPlan.totalFee)}
                      description="Pay the complete course fee securely today."
                      onSelect={() => selectPaymentOption("full")}
                    />
                    <PaymentCard
                      selected={formData.paymentOption === "afterpay"}
                      title="Afterpay"
                      price={`4 × ${formatCurrency(
                        Math.ceil(course.paymentPlan.totalFee / 4),
                      )}`}
                      description="Split the eligible course amount into four instalments."
                      onSelect={() => selectPaymentOption("afterpay")}
                    />
                    <PaymentCard
                      selected={formData.paymentOption === "plan"}
                      title="StudentPay payment plan"
                      price={`${formatCurrency(
                        course.paymentPlan.depositAmount,
                      )} deposit + weekly`}
                      description="Pay the provider deposit today and manage the remaining balance through StudentPay."
                      featured
                      onSelect={() => selectPaymentOption("plan")}
                    />
                  </div>
                </div>

                {formData.paymentOption === "plan" ? (
                  <>
                    <div className="checkoutSection">
                      <div className="sectionHeading">
                        <span className="sectionNumber">2</span>
                        <div>
                          <h3>Your StudentPay payment plan</h3>
                          <p>Review your proposed payment arrangement.</p>
                        </div>
                      </div>

                      <div className="planSummary">
                        <div>
                          <span>Course total</span>
                          <strong>
                            {formatCurrency(course.paymentPlan.totalFee)}
                          </strong>
                        </div>
                        <div>
                          <span>Deposit payable today</span>
                          <strong>
                            {formatCurrency(course.paymentPlan.depositAmount)}
                          </strong>
                        </div>
                        <div>
                          <span>StudentPay plan balance</span>
                          <strong>{formatCurrency(planBalance)}</strong>
                        </div>
                        <div>
                          <span>Payment frequency</span>
                          <strong>Weekly</strong>
                        </div>
                        <div>
                          <span>Number of payments</span>
                          <strong>{instalments}</strong>
                        </div>
                        <div>
                          <span>Weekly payment</span>
                          <strong>
                            {formatCurrency(
                              course.paymentPlan.repaymentAmount,
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="wizard-form-grid">
                        <Field
                          id="firstPaymentDate"
                          label="First StudentPay payment date"
                          type="date"
                          value={formData.firstPaymentDate}
                          onChange={(event) => {
                            resetStudentPayAuthorisation();
                            handleTextChange(event);
                          }}
                        />
                      </div>
                    </div>

                    <div className="checkoutSection">
                      <div className="sectionHeading">
                        <span className="sectionNumber">3</span>
                        <div>
                          <h3>Provider deposit</h3>
                          <p>
                            Simulates the provider receiving deposit
                            confirmation before StudentPay plan activation.
                          </p>
                        </div>
                      </div>

                      <div className="testPaymentBadge">
                        Test payment fields — no card data is submitted
                      </div>

                      <div className="wizard-form-grid">
                        <Field
                          id="cardholderName"
                          label="Cardholder name"
                          value={cardDetails.cardholderName}
                          onChange={(event) =>
                            setCardDetails((current) => ({
                              ...current,
                              cardholderName: event.target.value,
                            }))
                          }
                        />
                        <Field
                          id="cardNumber"
                          label="Card number"
                          value={cardDetails.cardNumber}
                          onChange={(event) =>
                            setCardDetails((current) => ({
                              ...current,
                              cardNumber: event.target.value,
                            }))
                          }
                        />
                        <Field
                          id="expiry"
                          label="Expiry"
                          value={cardDetails.expiry}
                          onChange={(event) =>
                            setCardDetails((current) => ({
                              ...current,
                              expiry: event.target.value,
                            }))
                          }
                        />
                        <Field
                          id="cvc"
                          label="CVC"
                          value={cardDetails.cvc}
                          onChange={(event) =>
                            setCardDetails((current) => ({
                              ...current,
                              cvc: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="amountDue">
                        <span>Amount payable today</span>
                        <strong>
                          {formatCurrency(course.paymentPlan.depositAmount)}
                        </strong>
                      </div>

                      <label className="checkboxLine">
                        <input
                          type="checkbox"
                          checked={formData.depositConfirmed}
                          onChange={(event) => {
                            resetStudentPayAuthorisation();
                            updateField(
                              "depositConfirmed",
                              event.target.checked,
                            );
                          }}
                        />
                        <span>
                          Simulate successful provider deposit confirmation
                        </span>
                      </label>
                    </div>

                    <div className="checkoutSection">
                      <div className="sectionHeading">
                        <span className="sectionNumber">4</span>
                        <div>
                          <h3>Direct debit authority</h3>
                          <p>
                            Authorise StudentPay to collect scheduled
                            payment-plan instalments from your nominated bank
                            account.
                          </p>
                        </div>
                      </div>

                      {directDebitAuthorised ? (
                        <div className="ddaAuthorisedCard">
                          <div className="ddaAuthorisedIcon">✓</div>
                          <div>
                            <strong>Direct Debit Authorised</strong>
                            <p>
                              Your bank account has been successfully
                              authorised for your StudentPay payment plan.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="ddaSetupCard">
                          <div className="ddaSetupContent">
                            <p>
                              Your payment plan is almost ready. The final
                              step is to securely authorise your nominated bank
                              account for scheduled payments.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="button button--primary"
                            disabled={directDebitSetupBlocked}
                            onClick={openDirectDebitWindow}
                          >
                            {openingDda
                              ? "Preparing StudentPay…"
                              : "Set Up Direct Debit"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="checkoutSection">
                      <div className="sectionHeading">
                        <span className="sectionNumber">5</span>
                        <div>
                          <h3>Review &amp; Confirm</h3>
                          <p>
                            Accept the terms below to confirm your enrolment
                            and activate the payment plan.
                          </p>
                        </div>
                      </div>

                      <div className="confirmationChecks">
                        <label className="checkboxLine termsCheckbox">
                          <input
                            type="checkbox"
                            checked={formData.paymentTermsAccepted}
                            onChange={(event) =>
                              updateField(
                                "paymentTermsAccepted",
                                event.target.checked,
                              )
                            }
                          />
                          <span>
                            I have read and agree to the{" "}
                            <button
                              type="button"
                              className="termsLink"
                              onClick={(event) => {
                                event.preventDefault();
                                setTermsModal("provider");
                              }}
                            >
                              {provider.name} Terms &amp; Conditions
                            </button>
                            , the{" "}
                            <button
                              type="button"
                              className="termsLink"
                              onClick={(event) => {
                                event.preventDefault();
                                setTermsModal("studentpay");
                              }}
                            >
                              StudentPay Payment Plan Agreement
                            </button>{" "}
                            and the{" "}
                            <button
                              type="button"
                              className="termsLink"
                              onClick={(event) => {
                                event.preventDefault();
                                setTermsModal("direct-debit");
                              }}
                            >
                              Direct Debit Service Agreement
                            </button>
                            .
                          </span>
                        </label>

                        <label className="checkboxLine termsCheckbox">
                          <input
                            type="checkbox"
                            checked={formData.informationConfirmed}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              updateField("informationConfirmed", checked);
                              updateField("privacyAccepted", checked);
                            }}
                          />
                          <span>
                            I confirm that the information I have supplied is
                            true and complete, and I authorise {provider.name}{" "}
                            and StudentPay to use my information to establish
                            and administer my payment plan.
                          </span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        className={
                          enrolmentConfirmed
                            ? "button button--success submit"
                            : "button button--primary submit"
                        }
                        disabled={confirmAndPayBlocked || enrolmentConfirmed}
                      >
                        {enrolmentConfirmed
                          ? "✓ Enrolment Confirmed"
                          : submitting
                            ? "Confirming enrolment…"
                            : "Confirm Enrolment & Activate Payment Plan"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="checkoutSection">
                    <div className="wizard-notice wizard-notice--payment">
                      <strong>
                        {formData.paymentOption === "afterpay"
                          ? "Afterpay"
                          : "Pay in full"}{" "}
                        remains a provider payment path.
                      </strong>
                      <span>
                        Only the StudentPay payment plan uses the Provider
                        Checkout API, direct debit authority and dual
                        confirmation flow from the OnFit wizard.
                      </span>
                    </div>
                  </div>
                )}

                {result ? (
                  <div
                    className={
                      result.success ? "result success" : "result error"
                    }
                  >
                    <strong>
                      {result.success
                        ? enrolmentConfirmed
                          ? "Enrolment confirmed"
                          : "Direct debit authorised"
                        : "Action required"}
                    </strong>
                    <p>{result.message || result.error}</p>
                    <details>
                      <summary>View technical confirmation data</summary>
                      <pre>{JSON.stringify(result, null, 2)}</pre>
                    </details>
                  </div>
                ) : null}
              </section>
            ) : null}

            <div className="enrolment-wizard__navigation">
              {currentStep !== "course" ? (
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={handleBack}
                >
                  Back
                </button>
              ) : (
                <Link href="/" className="button button--secondary">
                  Cancel
                </Link>
              )}

              {currentStep !== "payment" ? (
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleNext}
                >
                  Continue
                </button>
              ) : null}
            </div>
          </form>

          <aside className="enrolment-wizard__summary">
            <p className="enrolment-wizard__eyebrow">Your enrolment</p>
            <h2>{course.title}</h2>
            {course.deliveryProvider ? (
              <p className="enrolment-wizard__summary-provider">
                Delivered by {course.deliveryProvider}
              </p>
            ) : null}

            <dl>
              <div>
                <dt>Delivery</dt>
                <dd>{course.deliveryMode}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{course.duration}</dd>
              </div>
              <div>
                <dt>Course fee</dt>
                <dd>{formatCurrency(course.paymentPlan.totalFee)}</dd>
              </div>
              <div>
                <dt>Selected payment</dt>
                <dd>
                  {formData.paymentOption === "full"
                    ? "Pay in full"
                    : formData.paymentOption === "afterpay"
                      ? "Afterpay"
                      : `${formatCurrency(
                          course.paymentPlan.repaymentAmount,
                        )} per ${paymentFrequency}`}
                </dd>
              </div>
            </dl>

            {formData.paymentOption === "plan" ? (
              <div className="planBox">
                <span>StudentPay estimate</span>
                <strong>
                  {formatCurrency(course.paymentPlan.depositAmount)} deposit
                </strong>
                <strong>
                  + {formatCurrency(course.paymentPlan.repaymentAmount)} /{" "}
                  {paymentFrequency}
                </strong>
                <small>for {instalments} payments</small>
              </div>
            ) : null}

            <div className="enrolment-wizard__autosave">
              <span aria-hidden="true">✓</span>
              <p>
                <strong>Progress saved</strong>
                Your enrolment progress is saved in this browser.
              </p>
            </div>
          </aside>
        </div>
      </main>

      {termsModal ? (
        <TermsModal
          type={termsModal}
          checkoutToken={checkoutSession?.checkoutToken || ""}
          providerName={provider.name}
          providerCode={apiProviderCode}
          legalApiBaseUrl={legalApiBaseUrl}
          onClose={() => setTermsModal(null)}
        />
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  className = "",
  autoComplete,
  placeholder,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
  className?: string;
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div className={`wizard-field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
      />
      {error ? <span className="wizard-field__error">{error}</span> : null}
    </div>
  );
}

function PaymentCard({
  selected,
  title,
  price,
  description,
  featured,
  onSelect,
}: {
  selected: boolean;
  title: string;
  price: string;
  description: string;
  featured?: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`wizard-payment-card ${selected ? "is-selected" : ""} ${
        featured ? "wizard-payment-card--featured" : ""
      }`}
    >
      <input
        type="radio"
        name="paymentOption"
        checked={selected}
        onChange={onSelect}
      />
      {featured ? (
        <span className="wizard-payment-card__badge">Flexible option</span>
      ) : null}
      <span className="wizard-payment-card__selector" />
      <span className="wizard-payment-card__label">{title}</span>
      <strong>{price}</strong>
      <p>{description}</p>
    </label>
  );
}
