"use client";

import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { DdaSetupEmbed } from "@/components/enrolment/DdaSetupEmbed";
import {
  formatApiError,
  toEmbeddedSetupUrl,
} from "@/lib/provider-experience/checkout";
import {
  createId,
  formatCurrency,
  formatPaymentFrequency,
  futureDate,
} from "@/lib/provider-experience/format";
import type { Course } from "@/types/course";
import type {
  CheckoutSession,
  EnrolmentFormData,
  EnrolmentPaymentOption,
} from "@/types/enrolment";
import type { Provider } from "@/types/provider";

type SimpleEnrolmentCheckoutProps = {
  provider: Provider;
  course: Course;
  initialPaymentOption?: EnrolmentPaymentOption;
  studentPayProviderCode?: string;
};

type SimplePaymentChoice = "full" | "plan";

function createFormData(
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
    usi: "",
    emergencyName: "Alex Nguyen",
    emergencyPhone: "0411000000",
    emergencyRelationship: "Sibling",
    paymentOption,
    firstPaymentDate: futureDate(14),
    depositConfirmed: false,
    sscPassed: true,
    photoIdUploaded: true,
    marketingConsent: false,
    paymentTermsAccepted: false,
    informationConfirmed: false,
    privacyAccepted: false,
  };
}

export function SimpleEnrolmentCheckout({
  provider,
  course,
  initialPaymentOption = "plan",
  studentPayProviderCode,
}: SimpleEnrolmentCheckoutProps) {
  const apiProviderCode = studentPayProviderCode || provider.code;
  const paymentFrequency = formatPaymentFrequency(
    course.paymentPlan.frequency,
  );

  const [formData, setFormData] = useState<EnrolmentFormData>(() =>
    createFormData(
      initialPaymentOption === "full" ? "full" : "plan",
    ),
  );
  const [paymentChoice, setPaymentChoice] = useState<SimplePaymentChoice>(
    initialPaymentOption === "full" ? "full" : "plan",
  );
  const [cardDetails, setCardDetails] = useState({
    cardholderName: "Jamie Nguyen",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [openingDda, setOpeningDda] = useState(false);
  const [showEmbeddedDda, setShowEmbeddedDda] = useState(false);
  const [directDebitAuthorised, setDirectDebitAuthorised] = useState(false);
  const [checkoutSession, setCheckoutSession] =
    useState<CheckoutSession | null>(null);
  const [enrolmentConfirmed, setEnrolmentConfirmed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const amountToday = useMemo(
    () =>
      paymentChoice === "plan"
        ? course.paymentPlan.depositAmount
        : course.paymentPlan.totalFee,
    [course.paymentPlan.depositAmount, course.paymentPlan.totalFee, paymentChoice],
  );

  function updateField<K extends keyof EnrolmentFormData>(
    key: K,
    value: EnrolmentFormData[K],
  ) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function selectPayment(choice: SimplePaymentChoice) {
    setPaymentChoice(choice);
    updateField("paymentOption", choice === "plan" ? "plan" : "full");
    setCheckoutSession(null);
    setDirectDebitAuthorised(false);
    setShowEmbeddedDda(false);
    setStatusMessage(null);
    setStatusError(null);
  }

  async function createCheckoutSession(): Promise<CheckoutSession> {
    const response = await fetch("/api/studentpay/provider-checkouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerSlug: provider.slug,
        courseSlug: course.slug,
        formData: {
          ...formData,
          paymentOption: "plan",
          sscPassed: true,
          depositConfirmed: true,
          paymentTermsAccepted: true,
          informationConfirmed: true,
          privacyAccepted: true,
        },
        providerOrderId: createId(`AA-${course.code}`),
      }),
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: { message?: string } | string;
      checkout_token?: string;
      opportunity_id?: string;
      dda_id?: string;
      checkout_id?: string;
      provider_order_id?: string;
      setup_url?: string;
      redirect_url?: string;
      checkout?: {
        checkout_token?: string;
        opportunity_id?: string;
        dda_id?: string;
        checkout_id?: string;
      };
    };

    if (!response.ok || data.success === false) {
      throw new Error(
        (typeof data.error === "object" ? data.error?.message : data.error) ||
          formatApiError(data, "Unable to create checkout."),
      );
    }

    const session: CheckoutSession = {
      checkoutToken: data.checkout_token || data.checkout?.checkout_token || "",
      opportunityId:
        data.opportunity_id || data.checkout?.opportunity_id || "",
      ddaId: data.dda_id || data.checkout?.dda_id || "",
      checkoutId: data.checkout_id || data.checkout?.checkout_id || "",
      providerOrderId: data.provider_order_id || "",
      redirectUrl: data.setup_url || data.redirect_url || "",
    };

    if (!session.redirectUrl) {
      throw new Error("StudentPay did not return a direct debit setup URL.");
    }

    return session;
  }

  async function confirmEnrolment(session: CheckoutSession) {
    const response = await fetch(
      "/api/studentpay/provider-checkout-confirm",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: {
            provider_code: apiProviderCode,
            provider_order_id: session.providerOrderId,
          },
          checkout: {
            checkout_id: session.checkoutId,
            checkout_token: session.checkoutToken,
            opportunity_id: session.opportunityId,
            dda_id: session.ddaId,
          },
          payment: {
            payment_method: "studentpay_payment_plan",
            deposit_confirmed: true,
            first_payment_date: formData.firstPaymentDate,
          },
          declarations: {
            payment_plan_accepted: true,
            information_confirmed: true,
            privacy_accepted: true,
          },
          confirmed_at: new Date().toISOString(),
        }),
      },
    );

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(formatApiError(data, "Unable to confirm enrolment."));
    }

    setEnrolmentConfirmed(true);
    setStatusMessage("Enrolment confirmed. Your StudentPay plan is active.");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatusError(null);
    setStatusMessage(null);

    if (!formData.paymentTermsAccepted) {
      setStatusError("Please accept the terms and conditions to continue.");
      return;
    }

    if (
      !cardDetails.cardholderName.trim() ||
      !cardDetails.cardNumber.trim() ||
      !cardDetails.expiry.trim() ||
      !cardDetails.cvc.trim()
    ) {
      setStatusError("Please complete the card payment fields.");
      return;
    }

    if (paymentChoice === "full") {
      setSubmitting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 700));
        setEnrolmentConfirmed(true);
        setStatusMessage(
          `Sandbox demo: full card payment of ${formatCurrency(
            course.paymentPlan.totalFee,
          )} simulated successfully. No card data was sent.`,
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    setOpeningDda(true);

    try {
      const session = await createCheckoutSession();
      const embeddedSession = {
        ...session,
        redirectUrl: toEmbeddedSetupUrl(session.redirectUrl),
      };
      setCheckoutSession(embeddedSession);
      setShowEmbeddedDda(true);
      setStatusMessage(
        "Deposit simulated. Complete direct debit setup to finish enrolment.",
      );
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : "Unable to start StudentPay checkout.",
      );
    } finally {
      setSubmitting(false);
      setOpeningDda(false);
    }
  }

  if (showEmbeddedDda && checkoutSession) {
    return (
      <div className="simple-checkout">
        <DdaSetupEmbed
          setupUrl={checkoutSession.redirectUrl}
          studentFirstName={formData.firstName}
          courseTitle={course.title}
          onAuthorised={async () => {
            setDirectDebitAuthorised(true);
            setShowEmbeddedDda(false);
            setStatusMessage("Direct debit authorised. Confirming enrolment…");
            try {
              await confirmEnrolment(checkoutSession);
            } catch (error) {
              setStatusError(
                error instanceof Error
                  ? error.message
                  : "Unable to confirm enrolment.",
              );
            }
          }}
          onRestart={() => setShowEmbeddedDda(false)}
        />
      </div>
    );
  }

  if (enrolmentConfirmed) {
    return (
      <aside className="simple-checkout" id="studentpay-checkout">
        <div className="simple-checkout__success">
          <p className="aa-script">You're in</p>
          <h2>Enrolment complete</h2>
          <p>
            Thanks, {formData.firstName}. Your {course.title} enrolment is
            ready
            {paymentChoice === "plan"
              ? " with a StudentPay payment plan"
              : ""}
            .
          </p>
          {directDebitAuthorised ? (
            <p className="simple-checkout__note">
              Direct debit authority captured successfully.
            </p>
          ) : null}
          {statusMessage ? (
            <p className="simple-checkout__note">{statusMessage}</p>
          ) : null}
          <button
            type="button"
            className="button button--course-secondary"
            onClick={() => {
              setEnrolmentConfirmed(false);
              setCheckoutSession(null);
              setDirectDebitAuthorised(false);
              setStatusMessage(null);
              setStatusError(null);
              setFormData(createFormData(paymentChoice === "plan" ? "plan" : "full"));
            }}
          >
            Start another enrolment
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="simple-checkout" id="studentpay-checkout">
      <div className="simple-checkout__head">
        <p className="aa-script">StudentPay API demo</p>
        <h2>Enrolment and payment</h2>
        <p>
          Complete the course enrolment and choose upfront card payment or an
          interest-free payment plan.
        </p>
      </div>

      <form className="simple-checkout__form" onSubmit={handleSubmit} noValidate>
        <section className="simple-checkout__panel">
          <span className="simple-checkout__step">1</span>
          <div>
            <h3>Select your payment option</h3>
            <div className="simple-checkout__choices">
              <label
                className={
                  paymentChoice === "full"
                    ? "simple-checkout__choice is-selected"
                    : "simple-checkout__choice"
                }
              >
                <input
                  type="radio"
                  name="payment_option"
                  checked={paymentChoice === "full"}
                  onChange={() => selectPayment("full")}
                />
                <span>
                  <strong>Pay Now</strong>
                  <small>Pay the full course fee by card today.</small>
                  <b>{formatCurrency(course.paymentPlan.totalFee)} today</b>
                </span>
              </label>

              <label
                className={
                  paymentChoice === "plan"
                    ? "simple-checkout__choice is-selected"
                    : "simple-checkout__choice"
                }
              >
                <input
                  type="radio"
                  name="payment_option"
                  checked={paymentChoice === "plan"}
                  onChange={() => selectPayment("plan")}
                />
                <span>
                  <strong>Payment Plan</strong>
                  <small>Pay a small deposit now and complete setup.</small>
                  <b>
                    {formatCurrency(course.paymentPlan.depositAmount)} deposit +
                    flexible payments
                  </b>
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="simple-checkout__panel">
          <span className="simple-checkout__step">2</span>
          <div>
            <h3>Enter your details</h3>
            <div className="simple-checkout__grid">
              <label>
                First Name *
                <input
                  value={formData.firstName}
                  onChange={(event) =>
                    updateField("firstName", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                Last Name *
                <input
                  value={formData.lastName}
                  onChange={(event) =>
                    updateField("lastName", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                Email *
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                />
              </label>
              <label>
                Phone *
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(event) =>
                    updateField("mobile", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                Date of birth *
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(event) =>
                    updateField("dateOfBirth", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                State *
                <select
                  value={formData.state}
                  onChange={(event) => updateField("state", event.target.value)}
                  required
                >
                  <option value="">Select</option>
                  <option>NSW</option>
                  <option>VIC</option>
                  <option>QLD</option>
                  <option>SA</option>
                  <option>WA</option>
                  <option>TAS</option>
                  <option>ACT</option>
                  <option>NT</option>
                </select>
              </label>
              <label className="simple-checkout__full">
                Street Address *
                <input
                  value={formData.addressLine1}
                  onChange={(event) =>
                    updateField("addressLine1", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                Suburb *
                <input
                  value={formData.suburb}
                  onChange={(event) =>
                    updateField("suburb", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                Postcode *
                <input
                  value={formData.postcode}
                  onChange={(event) =>
                    updateField("postcode", event.target.value)
                  }
                  required
                />
              </label>
            </div>
          </div>
        </section>

        <section className="simple-checkout__panel">
          <span className="simple-checkout__step">3</span>
          <div>
            <h3>
              {paymentChoice === "plan"
                ? `Card details: ${formatCurrency(
                    course.paymentPlan.depositAmount,
                  )} deposit`
                : "Card details: full payment"}
            </h3>
            <p className="simple-checkout__muted">
              Card fields are for demo UX only in this sandbox. Card data is not
              tokenised or stored. Payment plan enrolments continue to StudentPay
              direct-debit setup after deposit simulation.
            </p>
            <div className="simple-checkout__grid">
              {paymentChoice === "plan" ? (
                <label className="simple-checkout__full">
                  First payment date *
                  <input
                    type="date"
                    value={formData.firstPaymentDate}
                    onChange={(event) =>
                      updateField("firstPaymentDate", event.target.value)
                    }
                    required
                  />
                </label>
              ) : null}
              <label className="simple-checkout__full">
                Cardholder name *
                <input
                  value={cardDetails.cardholderName}
                  onChange={(event) =>
                    setCardDetails((current) => ({
                      ...current,
                      cardholderName: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="simple-checkout__full">
                Card number *
                <input
                  value={cardDetails.cardNumber}
                  onChange={(event) =>
                    setCardDetails((current) => ({
                      ...current,
                      cardNumber: event.target.value,
                    }))
                  }
                  placeholder="•••• •••• •••• ••••"
                  required
                />
              </label>
              <label>
                Expiry *
                <input
                  value={cardDetails.expiry}
                  onChange={(event) =>
                    setCardDetails((current) => ({
                      ...current,
                      expiry: event.target.value,
                    }))
                  }
                  placeholder="MM / YY"
                  required
                />
              </label>
              <label>
                CVC *
                <input
                  value={cardDetails.cvc}
                  onChange={(event) =>
                    setCardDetails((current) => ({
                      ...current,
                      cvc: event.target.value,
                    }))
                  }
                  placeholder="123"
                  required
                />
              </label>
            </div>
            <div className="simple-checkout__summary">
              <span>
                {paymentChoice === "plan"
                  ? "Deposit payable today"
                  : "Amount payable today"}
              </span>
              <strong>{formatCurrency(amountToday)}</strong>
            </div>
            {paymentChoice === "plan" ? (
              <p className="simple-checkout__muted">
                Then about {formatCurrency(course.paymentPlan.repaymentAmount)}{" "}
                per {paymentFrequency}.
              </p>
            ) : null}
          </div>
        </section>

        <section className="simple-checkout__panel">
          <span className="simple-checkout__step">4</span>
          <div>
            <h3>Terms &amp; Conditions</h3>
            <p className="simple-checkout__muted">
              Before confirming your enrolment, please confirm:
            </p>
            <label className="simple-checkout__check">
              <input
                type="checkbox"
                checked={formData.paymentTermsAccepted}
                onChange={(event) => {
                  const checked = event.target.checked;
                  updateField("paymentTermsAccepted", checked);
                  updateField("informationConfirmed", checked);
                  updateField("privacyAccepted", checked);
                }}
              />
              <span>
                I have read, understood, and agree to the StudentPay terms and
                conditions as well as the provider course terms and conditions.
              </span>
            </label>
            <label className="simple-checkout__check">
              <input
                type="checkbox"
                checked={formData.marketingConsent}
                onChange={(event) =>
                  updateField("marketingConsent", event.target.checked)
                }
              />
              <span>
                I would like to receive news and exclusive offers from the
                education provider.
              </span>
            </label>

            <button
              type="submit"
              className="button button--course-primary simple-checkout__submit"
              disabled={submitting || openingDda}
            >
              {submitting || openingDda ? "Processing…" : "Get Started"}
            </button>

            {statusError ? (
              <div className="simple-checkout__result is-error" role="alert">
                {statusError}
              </div>
            ) : null}
            {statusMessage ? (
              <div className="simple-checkout__result is-success">
                {statusMessage}
              </div>
            ) : null}
          </div>
        </section>
      </form>
    </aside>
  );
}
