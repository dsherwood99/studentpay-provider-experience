"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { Course } from "@/types/course";
import type {
  EnrolmentFieldErrors,
  EnrolmentFormData,
  EnrolmentPaymentOption,
} from "@/types/enrolment";
import type { Provider } from "@/types/provider";
import {
  formatCurrency,
  formatPaymentFrequency,
} from "@/lib/format";

export type EnrolmentWizardMode = "demo" | "sandbox";

type EnrolmentWizardProps = {
  provider: Provider;
  course: Course;
  initialPaymentOption: EnrolmentPaymentOption;
  mode?: EnrolmentWizardMode;
};

const TOTAL_STEPS = 5;

const stepNames = [
  "Course",
  "About you",
  "Contact",
  "Payment",
  "Review",
];

function createInitialFormData(
  paymentOption: EnrolmentPaymentOption,
): EnrolmentFormData {
  return {
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    mobile: "",
    addressLine1: "",
    suburb: "",
    state: "",
    postcode: "",
    paymentOption,
    marketingConsent: false,
    informationConfirmed: false,
    termsAccepted: false,
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
  initialPaymentOption,
  mode = "demo",
}: EnrolmentWizardProps) {
  const isSandbox = mode === "sandbox";
  const storageKey = `studentpay-enrolment:${mode}:${provider.slug}:${course.slug}`;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EnrolmentFormData>(() =>
    createInitialFormData(initialPaymentOption),
  );
  const [errors, setErrors] = useState<EnrolmentFieldErrors>({});
  const [hasLoadedSavedData, setHasLoadedSavedData] =
    useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const paymentFrequency = formatPaymentFrequency(
    course.paymentPlan.frequency,
  );

  useEffect(() => {
    try {
      const savedData = window.localStorage.getItem(storageKey);

      if (savedData) {
        const parsedData = JSON.parse(savedData) as {
          currentStep?: number;
          formData?: EnrolmentFormData;
        };

        if (parsedData.formData) {
          setFormData({
            ...parsedData.formData,
            paymentOption:
              parsedData.formData.paymentOption ??
              initialPaymentOption,
          });
        }

        if (
          parsedData.currentStep &&
          parsedData.currentStep >= 1 &&
          parsedData.currentStep <= TOTAL_STEPS
        ) {
          setCurrentStep(parsedData.currentStep);
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHasLoadedSavedData(true);
    }
  }, [initialPaymentOption, storageKey]);

  useEffect(() => {
    if (!hasLoadedSavedData || isComplete) {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        currentStep,
        formData,
      }),
    );
  }, [
    currentStep,
    formData,
    hasLoadedSavedData,
    isComplete,
    storageKey,
  ]);

  const progressPercentage = useMemo(
    () => (currentStep / TOTAL_STEPS) * 100,
    [currentStep],
  );

  function updateField<K extends keyof EnrolmentFormData>(
    field: K,
    value: EnrolmentFormData[K],
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function handleTextChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >,
  ) {
    const field = event.target.name as keyof EnrolmentFormData;

    updateField(field, event.target.value as never);
  }

  function validateCurrentStep(): boolean {
    const nextErrors: EnrolmentFieldErrors = {};

    if (currentStep === 2) {
      if (!formData.firstName.trim()) {
        nextErrors.firstName = "Enter your first name.";
      }

      if (!formData.lastName.trim()) {
        nextErrors.lastName = "Enter your last name.";
      }

      if (!formData.dateOfBirth) {
        nextErrors.dateOfBirth = "Enter your date of birth.";
      }
    }

    if (currentStep === 3) {
      if (!formData.email.trim()) {
        nextErrors.email = "Enter your email address.";
      } else if (!validateEmail(formData.email)) {
        nextErrors.email =
          "Enter a valid email address.";
      }

      if (!formData.mobile.trim()) {
        nextErrors.mobile = "Enter your mobile number.";
      } else if (!validateMobile(formData.mobile)) {
        nextErrors.mobile =
          "Enter a valid Australian mobile number.";
      }

      if (!formData.addressLine1.trim()) {
        nextErrors.addressLine1 =
          "Enter your street address.";
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
        nextErrors.postcode =
          "Enter a valid four-digit postcode.";
      }
    }

    if (currentStep === 4 && !formData.paymentOption) {
      nextErrors.paymentOption =
        "Choose a payment option.";
    }

    if (currentStep === 5) {
      if (!formData.informationConfirmed) {
        nextErrors.informationConfirmed =
          "Confirm that your information is correct.";
      }

      if (!formData.termsAccepted) {
        nextErrors.termsAccepted =
          "Accept the enrolment declaration to continue.";
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    if (!validateCurrentStep()) {
      return;
    }

    setCurrentStep((current) =>
      Math.min(current + 1, TOTAL_STEPS),
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleBack() {
    setErrors({});

    setCurrentStep((current) =>
      Math.max(current - 1, 1),
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    setSubmitError(null);

    if (!isSandbox) {
      window.localStorage.removeItem(storageKey);
      setIsComplete(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/studentpay/provider-checkouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerSlug: provider.slug,
          courseSlug: course.slug,
          formData,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        setup_url?: string;
        error?: {
          message?: string;
          code?: string;
        };
      };

      if (!response.ok || !result.success || !result.setup_url) {
        throw new Error(
          result.error?.message ||
            "Unable to start StudentPay sandbox enrolment.",
        );
      }

      window.localStorage.removeItem(storageKey);
      window.location.assign(result.setup_url);
    } catch (error) {
      setIsSubmitting(false);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to start StudentPay sandbox enrolment.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }

  function startAgain() {
    window.localStorage.removeItem(storageKey);
    setFormData(createInitialFormData(initialPaymentOption));
    setErrors({});
    setCurrentStep(1);
    setIsComplete(false);
    setSubmitError(null);
    setIsSubmitting(false);
  }

  if (isComplete) {
    return (
      <section className="enrolment-complete">
        <div className="page-shell enrolment-complete__card">
          <div
            className="enrolment-complete__icon"
            aria-hidden="true"
          >
            ✓
          </div>

          <p className="enrolment-wizard__eyebrow">
            {isSandbox ? "Sandbox enrolment" : "Demonstration complete"}
          </p>

          <h1>
            Thanks, {formData.firstName}. Your{" "}
            {isSandbox ? "sandbox" : "demo"} enrolment is complete.
          </h1>

          <p className="enrolment-complete__lead">
            {isSandbox
              ? "Your sandbox checkout was created with the StudentPay Provider Checkout API. In this flow you are redirected to direct-debit setup when the API returns a setup URL."
              : "No application, payment or personal information has been submitted. In the production version, the provider would receive the application and the student would proceed to the secure payment or direct-debit setup."}
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
              <span>Payment preference</span>
              <strong>
                {formData.paymentOption === "full"
                  ? `Pay ${formatCurrency(
                      course.paymentPlan.totalFee,
                    )} in full`
                  : `${formatCurrency(
                      course.paymentPlan.repaymentAmount,
                    )} per ${paymentFrequency}`}
              </strong>
            </div>
          </div>

          <div className="enrolment-complete__actions">
            <Link
              href={`/providers/${provider.slug}/courses/${course.slug}`}
              className="button button--primary"
            >
              Return to course
            </Link>

            <button
              type="button"
              className="button button--secondary"
              onClick={startAgain}
            >
              {isSandbox ? "Start again" : "Restart demo"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="enrolment-wizard">
      <header className="enrolment-wizard__header">
        <div className="page-shell enrolment-wizard__header-inner">
          <Link
            href={`/providers/${provider.slug}/courses/${course.slug}`}
            className="enrolment-wizard__back-link"
          >
            ← Return to course
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
            {isSandbox
              ? "StudentPay sandbox enrolment"
              : "Powered by StudentPay Enrolment"}
          </span>
        </div>
      </header>

      <div className="enrolment-wizard__progress">
        <div className="page-shell">
          <div className="enrolment-wizard__progress-heading">
            <div>
              <span>
                Step {currentStep} of {TOTAL_STEPS}
              </span>
              <strong>{stepNames[currentStep - 1]}</strong>
            </div>

            <span>
              {Math.round(progressPercentage)}% complete
            </span>
          </div>

          <div
            className="enrolment-wizard__progress-track"
            aria-hidden="true"
          >
            <span
              style={{
                width: `${progressPercentage}%`,
              }}
            />
          </div>

          <ol className="enrolment-wizard__step-list">
            {stepNames.map((stepName, index) => {
              const stepNumber = index + 1;

              return (
                <li
                  key={stepName}
                  className={
                    stepNumber === currentStep
                      ? "is-active"
                      : stepNumber < currentStep
                        ? "is-complete"
                        : ""
                  }
                >
                  <span>{stepNumber}</span>
                  <strong>{stepName}</strong>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <main className="enrolment-wizard__main">
        <div className="page-shell enrolment-wizard__layout">
          <form
            className="enrolment-wizard__form-card"
            onSubmit={handleSubmit}
            noValidate
          >
            {submitError ? (
              <div
                className="wizard-field__error enrolment-wizard__submit-error"
                role="alert"
              >
                {submitError}
              </div>
            ) : null}

            {currentStep === 1 ? (
              <section className="wizard-step">
                <p className="enrolment-wizard__eyebrow">
                  Course confirmation
                </p>

                <h1>Let&apos;s confirm what you&apos;re enrolling in.</h1>

                <p className="wizard-step__lead">
                  Review the course details below before continuing
                  with your personal information.
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
                          {formatCurrency(
                            course.paymentPlan.totalFee,
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="wizard-notice">
                  <strong>
                    {isSandbox
                      ? "StudentPay sandbox"
                      : "Demonstration environment"}
                  </strong>
                  <span>
                    {isSandbox
                      ? "Completing this form creates a real sandbox checkout with StudentPay and continues to direct-debit setup."
                      : "You may enter sample details. Nothing will be submitted or retained after this demonstration is completed."}
                  </span>
                </div>
              </section>
            ) : null}

            {currentStep === 2 ? (
              <section className="wizard-step">
                <p className="enrolment-wizard__eyebrow">
                  About you
                </p>

                <h1>Tell us who you are.</h1>

                <p className="wizard-step__lead">
                  These details would normally be used to create your
                  enrolment application.
                </p>

                <div className="wizard-form-grid">
                  <div className="wizard-field">
                    <label htmlFor="firstName">
                      First name
                    </label>

                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      value={formData.firstName}
                      onChange={handleTextChange}
                      aria-invalid={Boolean(errors.firstName)}
                      aria-describedby={
                        errors.firstName
                          ? "firstName-error"
                          : undefined
                      }
                    />

                    {errors.firstName ? (
                      <span
                        className="wizard-field__error"
                        id="firstName-error"
                      >
                        {errors.firstName}
                      </span>
                    ) : null}
                  </div>

                  <div className="wizard-field">
                    <label htmlFor="lastName">
                      Last name
                    </label>

                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      value={formData.lastName}
                      onChange={handleTextChange}
                      aria-invalid={Boolean(errors.lastName)}
                      aria-describedby={
                        errors.lastName
                          ? "lastName-error"
                          : undefined
                      }
                    />

                    {errors.lastName ? (
                      <span
                        className="wizard-field__error"
                        id="lastName-error"
                      >
                        {errors.lastName}
                      </span>
                    ) : null}
                  </div>

                  <div className="wizard-field wizard-field--full">
                    <label htmlFor="dateOfBirth">
                      Date of birth
                    </label>

                    <input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleTextChange}
                      aria-invalid={Boolean(errors.dateOfBirth)}
                      aria-describedby={
                        errors.dateOfBirth
                          ? "dateOfBirth-error"
                          : "dateOfBirth-hint"
                      }
                    />

                    <span
                      className="wizard-field__hint"
                      id="dateOfBirth-hint"
                    >
                      Used to verify your enrolment and identity.
                    </span>

                    {errors.dateOfBirth ? (
                      <span
                        className="wizard-field__error"
                        id="dateOfBirth-error"
                      >
                        {errors.dateOfBirth}
                      </span>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {currentStep === 3 ? (
              <section className="wizard-step">
                <p className="enrolment-wizard__eyebrow">
                  Contact details
                </p>

                <h1>How can the provider contact you?</h1>

                <p className="wizard-step__lead">
                  Enter your contact and residential address
                  information.
                </p>

                <div className="wizard-form-grid">
                  <div className="wizard-field">
                    <label htmlFor="email">
                      Email address
                    </label>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleTextChange}
                      aria-invalid={Boolean(errors.email)}
                    />

                    {errors.email ? (
                      <span className="wizard-field__error">
                        {errors.email}
                      </span>
                    ) : null}
                  </div>

                  <div className="wizard-field">
                    <label htmlFor="mobile">
                      Mobile number
                    </label>

                    <input
                      id="mobile"
                      name="mobile"
                      type="tel"
                      autoComplete="tel"
                      placeholder="04XX XXX XXX"
                      value={formData.mobile}
                      onChange={handleTextChange}
                      aria-invalid={Boolean(errors.mobile)}
                    />

                    {errors.mobile ? (
                      <span className="wizard-field__error">
                        {errors.mobile}
                      </span>
                    ) : null}
                  </div>

                  <div className="wizard-field wizard-field--full">
                    <label htmlFor="addressLine1">
                      Street address
                    </label>

                    <input
                      id="addressLine1"
                      name="addressLine1"
                      type="text"
                      autoComplete="address-line1"
                      value={formData.addressLine1}
                      onChange={handleTextChange}
                      aria-invalid={Boolean(
                        errors.addressLine1,
                      )}
                    />

                    {errors.addressLine1 ? (
                      <span className="wizard-field__error">
                        {errors.addressLine1}
                      </span>
                    ) : null}
                  </div>

                  <div className="wizard-field">
                    <label htmlFor="suburb">Suburb</label>

                    <input
                      id="suburb"
                      name="suburb"
                      type="text"
                      autoComplete="address-level2"
                      value={formData.suburb}
                      onChange={handleTextChange}
                      aria-invalid={Boolean(errors.suburb)}
                    />

                    {errors.suburb ? (
                      <span className="wizard-field__error">
                        {errors.suburb}
                      </span>
                    ) : null}
                  </div>

                  <div className="wizard-field">
                    <label htmlFor="state">State</label>

                    <select
                      id="state"
                      name="state"
                      autoComplete="address-level1"
                      value={formData.state}
                      onChange={handleTextChange}
                      aria-invalid={Boolean(errors.state)}
                    >
                      <option value="">Select state</option>
                      <option value="ACT">ACT</option>
                      <option value="NSW">NSW</option>
                      <option value="NT">NT</option>
                      <option value="QLD">QLD</option>
                      <option value="SA">SA</option>
                      <option value="TAS">TAS</option>
                      <option value="VIC">VIC</option>
                      <option value="WA">WA</option>
                    </select>

                    {errors.state ? (
                      <span className="wizard-field__error">
                        {errors.state}
                      </span>
                    ) : null}
                  </div>

                  <div className="wizard-field">
                    <label htmlFor="postcode">
                      Postcode
                    </label>

                    <input
                      id="postcode"
                      name="postcode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={4}
                      value={formData.postcode}
                      onChange={handleTextChange}
                      aria-invalid={Boolean(errors.postcode)}
                    />

                    {errors.postcode ? (
                      <span className="wizard-field__error">
                        {errors.postcode}
                      </span>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {currentStep === 4 ? (
              <section className="wizard-step">
                <p className="enrolment-wizard__eyebrow">
                  Payment options
                </p>

                <h1>Choose how you would like to pay.</h1>

                <p className="wizard-step__lead">
                  Select an upfront payment or a flexible StudentPay
                  payment plan.
                </p>

                <div className="wizard-payment-options">
                  <label
                    className={`wizard-payment-card ${
                      formData.paymentOption === "full"
                        ? "is-selected"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentOption"
                      value="full"
                      checked={
                        formData.paymentOption === "full"
                      }
                      onChange={() =>
                        updateField("paymentOption", "full")
                      }
                    />

                    <span className="wizard-payment-card__selector" />

                    <span className="wizard-payment-card__label">
                      Pay in full
                    </span>

                    <strong>
                      {formatCurrency(
                        course.paymentPlan.totalFee,
                      )}
                    </strong>

                    <p>
                      Pay the complete course fee during the secure
                      checkout process.
                    </p>
                  </label>

                  <label
                    className={`wizard-payment-card wizard-payment-card--featured ${
                      formData.paymentOption === "plan"
                        ? "is-selected"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentOption"
                      value="plan"
                      checked={
                        formData.paymentOption === "plan"
                      }
                      onChange={() =>
                        updateField("paymentOption", "plan")
                      }
                    />

                    <span className="wizard-payment-card__badge">
                      Flexible option
                    </span>

                    <span className="wizard-payment-card__selector" />

                    <span className="wizard-payment-card__label">
                      StudentPay payment plan
                    </span>

                    <strong>
                      {formatCurrency(
                        course.paymentPlan.repaymentAmount,
                      )}{" "}
                      per {paymentFrequency}
                    </strong>

                    <p>
                      Pay a{" "}
                      {formatCurrency(
                        course.paymentPlan.depositAmount,
                      )}{" "}
                      deposit and spread the remaining fee over
                      regular payments.
                    </p>
                  </label>
                </div>

                {errors.paymentOption ? (
                  <p className="wizard-step__error">
                    {errors.paymentOption}
                  </p>
                ) : null}

                <div className="wizard-notice wizard-notice--payment">
                  <strong>No payment details are collected here.</strong>
                  <span>
                    The production version will hand the student to
                    a secure payment or direct-debit component after
                    the enrolment has been validated.
                  </span>
                </div>
              </section>
            ) : null}

            {currentStep === 5 ? (
              <section className="wizard-step">
                <p className="enrolment-wizard__eyebrow">
                  Review and confirm
                </p>

                <h1>Check your enrolment details.</h1>

                <p className="wizard-step__lead">
                  Review the information below before{" "}
                  {isSandbox
                    ? "continuing to StudentPay payment setup."
                    : "completing the demonstration."}
                </p>

                <div className="wizard-review">
                  <section>
                    <div className="wizard-review__heading">
                      <h2>Course</h2>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                      >
                        Review
                      </button>
                    </div>

                    <dl>
                      <div>
                        <dt>Course</dt>
                        <dd>{course.title}</dd>
                      </div>

                      <div>
                        <dt>Delivery</dt>
                        <dd>{course.deliveryMode}</dd>
                      </div>
                    </dl>
                  </section>

                  <section>
                    <div className="wizard-review__heading">
                      <h2>Student</h2>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                      >
                        Edit
                      </button>
                    </div>

                    <dl>
                      <div>
                        <dt>Name</dt>
                        <dd>
                          {formData.firstName}{" "}
                          {formData.lastName}
                        </dd>
                      </div>

                      <div>
                        <dt>Date of birth</dt>
                        <dd>{formData.dateOfBirth}</dd>
                      </div>
                    </dl>
                  </section>

                  <section>
                    <div className="wizard-review__heading">
                      <h2>Contact</h2>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                      >
                        Edit
                      </button>
                    </div>

                    <dl>
                      <div>
                        <dt>Email</dt>
                        <dd>{formData.email}</dd>
                      </div>

                      <div>
                        <dt>Mobile</dt>
                        <dd>{formData.mobile}</dd>
                      </div>

                      <div>
                        <dt>Address</dt>
                        <dd>
                          {formData.addressLine1},{" "}
                          {formData.suburb} {formData.state}{" "}
                          {formData.postcode}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section>
                    <div className="wizard-review__heading">
                      <h2>Payment</h2>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                      >
                        Edit
                      </button>
                    </div>

                    <dl>
                      <div>
                        <dt>Option</dt>
                        <dd>
                          {formData.paymentOption === "full"
                            ? `Pay ${formatCurrency(
                                course.paymentPlan.totalFee,
                              )} in full`
                            : `${formatCurrency(
                                course.paymentPlan.repaymentAmount,
                              )} per ${paymentFrequency}`}
                        </dd>
                      </div>
                    </dl>
                  </section>
                </div>

                <div className="wizard-consents">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.informationConfirmed}
                      onChange={(event) =>
                        updateField(
                          "informationConfirmed",
                          event.target.checked,
                        )
                      }
                    />

                    <span>
                      {isSandbox
                        ? "I confirm that the information entered is correct."
                        : "I confirm that the information entered in this demonstration is correct."}
                    </span>
                  </label>

                  {errors.informationConfirmed ? (
                    <span className="wizard-field__error">
                      {errors.informationConfirmed}
                    </span>
                  ) : null}

                  <label>
                    <input
                      type="checkbox"
                      checked={formData.termsAccepted}
                      onChange={(event) =>
                        updateField(
                          "termsAccepted",
                          event.target.checked,
                        )
                      }
                    />

                    <span>
                      {isSandbox
                        ? "I confirm these details are correct and agree to proceed to StudentPay sandbox payment setup."
                        : "I acknowledge that this is a demonstration and no enrolment or payment will be submitted."}
                    </span>
                  </label>

                  {errors.termsAccepted ? (
                    <span className="wizard-field__error">
                      {errors.termsAccepted}
                    </span>
                  ) : null}

                  <label>
                    <input
                      type="checkbox"
                      checked={formData.marketingConsent}
                      onChange={(event) =>
                        updateField(
                          "marketingConsent",
                          event.target.checked,
                        )
                      }
                    />

                    <span>
                      I would like to receive information about
                      related courses. Optional.
                    </span>
                  </label>
                </div>
              </section>
            ) : null}

            <div className="enrolment-wizard__navigation">
              {currentStep > 1 ? (
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={handleBack}
                >
                  Back
                </button>
              ) : (
                <Link
                  href={`/providers/${provider.slug}/courses/${course.slug}`}
                  className="button button--secondary"
                >
                  Cancel
                </Link>
              )}

              {currentStep < TOTAL_STEPS ? (
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleNext}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  className="button button--primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Starting sandbox enrolment..."
                    : isSandbox
                      ? "Continue to payment setup"
                      : "Complete demo enrolment"}
                </button>
              )}
            </div>
          </form>

          <aside className="enrolment-wizard__summary">
            <p className="enrolment-wizard__eyebrow">
              Your enrolment
            </p>

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
                <dd>
                  {formatCurrency(course.paymentPlan.totalFee)}
                </dd>
              </div>

              <div>
                <dt>Selected payment</dt>
                <dd>
                  {formData.paymentOption === "full"
                    ? "Pay in full"
                    : `${formatCurrency(
                        course.paymentPlan.repaymentAmount,
                      )} per ${paymentFrequency}`}
                </dd>
              </div>
            </dl>

            <div className="enrolment-wizard__autosave">
              <span aria-hidden="true">✓</span>
              <p>
                <strong>Progress saved</strong>
                {isSandbox
                  ? "Your sandbox enrolment progress is saved in this browser."
                  : "Your demo progress is saved in this browser."}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}