"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { DdaSetupEmbed } from "@/components/enrolment/DdaSetupEmbed";
import {
  TermsModal,
  type TermsModalType,
} from "@/components/enrolment/TermsModal";
import {
  formatApiError,
  toEmbeddedSetupUrl,
} from "@/lib/provider-experience/checkout";
import { createPinchCardToken } from "@/lib/provider-experience/pinch-capture";
import {
  createId,
  formatCurrency,
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
  legalApiBaseUrl?: string;
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
  legalApiBaseUrl = "https://sandbox-api.studentpay.com.au",
}: SimpleEnrolmentCheckoutProps) {
  const apiProviderCode = studentPayProviderCode || provider.code;
  const termsProviderName = course.deliveryProvider || provider.name;

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
  const [pinchPublishableKey, setPinchPublishableKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openingDda, setOpeningDda] = useState(false);
  const [showEmbeddedDda, setShowEmbeddedDda] = useState(false);
  const [directDebitAuthorised, setDirectDebitAuthorised] = useState(false);
  const [checkoutSession, setCheckoutSession] =
    useState<CheckoutSession | null>(null);
  const [enrolmentConfirmed, setEnrolmentConfirmed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [termsModal, setTermsModal] = useState<TermsModalType | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPinchConfig() {
      try {
        const response = await fetch("/api/studentpay/provider-checkouts", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          pinch_publishable_key?: string | null;
        };

        if (!cancelled && data.pinch_publishable_key) {
          setPinchPublishableKey(data.pinch_publishable_key);
        }
      } catch {
        // Submit will surface a clearer error if the key is still missing.
      }
    }

    void loadPinchConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const cardDetailsComplete =
    Boolean(cardDetails.cardholderName.trim()) &&
    Boolean(cardDetails.cardNumber.trim()) &&
    Boolean(cardDetails.expiry.trim()) &&
    Boolean(cardDetails.cvc.trim());

  const confirmBlocked =
    !formData.paymentTermsAccepted ||
    !formData.informationConfirmed ||
    !formData.privacyAccepted ||
    (paymentChoice === "plan" && !directDebitAuthorised) ||
    (paymentChoice === "full" && !cardDetailsComplete) ||
    submitting ||
    openingDda ||
    enrolmentConfirmed;

  const directDebitSetupBlocked =
    paymentChoice !== "plan" ||
    !formData.firstName.trim() ||
    !formData.lastName.trim() ||
    !formData.email.trim() ||
    !formData.mobile.trim() ||
    !formData.addressLine1.trim() ||
    openingDda ||
    directDebitAuthorised;

  function updateField<K extends keyof EnrolmentFormData>(
    key: K,
    value: EnrolmentFormData[K],
  ) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function selectPayment(choice: SimplePaymentChoice) {
    setPaymentChoice(choice);
    updateField("paymentOption", choice === "plan" ? "plan" : "full");
    updateField("paymentTermsAccepted", false);
    updateField("informationConfirmed", false);
    updateField("privacyAccepted", false);
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

  async function submitPayNowCardPayment() {
    const publishableKey = pinchPublishableKey;

    if (!publishableKey) {
      throw new Error(
        "Pinch publishable key is not available. Set PINCH_PUBLISHABLE_KEY on this app, or ensure sandbox-api /v1/environment returns pinch_publishable_key.",
      );
    }

    const token = await createPinchCardToken({
      publishableKey,
      cardholderName: cardDetails.cardholderName,
      cardNumber: cardDetails.cardNumber,
      expiry: cardDetails.expiry,
      cvc: cardDetails.cvc,
    });

    const amountToCharge = course.paymentPlan.totalFee;
    const providerOrderId = createId(`AA-${course.code}`);

    const response = await fetch("/api/studentpay/provider-checkouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerSlug: provider.slug,
        courseSlug: course.slug,
        formData: {
          ...formData,
          paymentOption: "full",
          sscPassed: true,
          depositConfirmed: true,
          paymentTermsAccepted: true,
          informationConfirmed: true,
          privacyAccepted: true,
        },
        providerOrderId,
        cardPayment: {
          token,
          amount_to_charge_now: amountToCharge,
          payment_purpose: "card",
        },
      }),
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: { message?: string } | string;
      opportunity_id?: string;
      checkout_id?: string;
      card_payment?: {
        success?: boolean;
        payment_id?: string | null;
        amount?: number | null;
      };
    };

    if (!response.ok || data.success === false) {
      throw new Error(
        (typeof data.error === "object" ? data.error?.message : data.error) ||
          formatApiError(data, "Unable to process card payment."),
      );
    }

    if (data.card_payment && data.card_payment.success === false) {
      throw new Error("Card payment was not successful.");
    }

    setEnrolmentConfirmed(true);
    setStatusMessage(
      `Payment of ${formatCurrency(
        data.card_payment?.amount ?? amountToCharge,
      )} submitted via StudentPay / Pinch${
        data.opportunity_id ? ` (Opportunity ${data.opportunity_id})` : ""
      }.`,
    );
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
            payment_plan_accepted: formData.paymentTermsAccepted,
            information_confirmed: formData.informationConfirmed,
            privacy_consent_accepted: formData.privacyAccepted,
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

  async function openDirectDebitSetup() {
    if (directDebitSetupBlocked) {
      return;
    }

    setStatusError(null);
    setStatusMessage(null);
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
        "Complete the secure direct debit setup to continue enrolment.",
      );
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : "Unable to start StudentPay direct debit setup.",
      );
    } finally {
      setOpeningDda(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatusError(null);
    setStatusMessage(null);

    if (!formData.paymentTermsAccepted || !formData.informationConfirmed) {
      setStatusError(
        "Please accept the terms and confirm your information to continue.",
      );
      return;
    }

    if (paymentChoice === "full" && !cardDetailsComplete) {
      setStatusError("Please complete the card payment fields.");
      return;
    }

    if (paymentChoice === "full") {
      setSubmitting(true);
      try {
        await submitPayNowCardPayment();
      } catch (error) {
        setStatusError(
          error instanceof Error
            ? error.message
            : "Unable to process card payment.",
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!directDebitAuthorised || !checkoutSession) {
      setStatusError(
        "Please complete direct debit authority before confirming enrolment.",
      );
      return;
    }

    setSubmitting(true);
    try {
      await confirmEnrolment(checkoutSession);
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : "Unable to confirm enrolment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (showEmbeddedDda && checkoutSession) {
    return (
      <div className="simple-checkout">
        <DdaSetupEmbed
          setupUrl={checkoutSession.redirectUrl}
          studentFirstName={formData.firstName}
          courseTitle={course.title}
          onAuthorised={() => {
            setDirectDebitAuthorised(true);
            setShowEmbeddedDda(false);
            setStatusMessage(
              "Direct debit authorised. Accept the terms below to confirm enrolment.",
            );
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
          <p className="aa-script">You&apos;re in</p>
          <h2>Enrolment complete</h2>
          <p>
            Thanks, {formData.firstName}. Your {course.title} enrolment is
            ready
            {paymentChoice === "plan"
              ? " with a StudentPay payment plan"
              : " with full card payment"}
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
              setFormData(
                createFormData(paymentChoice === "plan" ? "plan" : "full"),
              );
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

        {paymentChoice === "full" ? (
          <section className="simple-checkout__panel">
            <span className="simple-checkout__step">3</span>
            <div>
              <h3>Card details: full payment</h3>
              <p className="simple-checkout__muted">
                Card details are tokenised in-browser with Pinch Capture.js.
                Only the token is sent to StudentPay — the card number never
                touches our servers.
              </p>
              <div className="simple-checkout__grid">
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
                    autoComplete="cc-name"
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
                    inputMode="numeric"
                    autoComplete="cc-number"
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
                    inputMode="numeric"
                    autoComplete="cc-exp"
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
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    required
                  />
                </label>
              </div>
              <div className="simple-checkout__amount-due">
                <span>Amount payable today</span>
                <strong>{formatCurrency(course.paymentPlan.totalFee)}</strong>
              </div>
            </div>
          </section>
        ) : null}

        {paymentChoice === "plan" ? (
          <section className="simple-checkout__panel">
            <span className="simple-checkout__step">3</span>
            <div>
              <h3>Direct debit authority</h3>
              <p className="simple-checkout__muted">
                Authorise StudentPay to collect scheduled payment-plan
                instalments from your nominated bank account.
              </p>

              <label className="simple-checkout__plan-date">
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

              {directDebitAuthorised ? (
                <div className="simple-checkout__dda-authorised">
                  <div className="simple-checkout__dda-icon" aria-hidden="true">
                    ✓
                  </div>
                  <div>
                    <strong>Direct Debit Authorised</strong>
                    <p>
                      Your bank account has been successfully authorised for
                      your StudentPay payment plan.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="simple-checkout__dda-setup">
                  <p>
                    Your payment plan is almost ready. The final step is to
                    securely authorise your nominated bank account for your
                    scheduled payments.
                  </p>
                  <button
                    type="button"
                    className="button button--primary simple-checkout__action"
                    disabled={directDebitSetupBlocked}
                    onClick={openDirectDebitSetup}
                  >
                    {openingDda
                      ? "Preparing StudentPay…"
                      : "Set Up Direct Debit"}
                  </button>
                </div>
              )}
            </div>
          </section>
        ) : null}

        <section className="simple-checkout__panel">
          <span className="simple-checkout__step">4</span>
          <div>
            <h3>Review &amp; Confirm</h3>
            <p className="simple-checkout__muted">
              You&apos;re almost done. Review your payment arrangement and accept
              the terms below to confirm your enrolment.
            </p>

            <div className="simple-checkout__declarations">
              <label className="simple-checkout__check">
                <input
                  type="checkbox"
                  checked={formData.paymentTermsAccepted}
                  onChange={(event) =>
                    updateField("paymentTermsAccepted", event.target.checked)
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
                    {`${termsProviderName} Terms & Conditions`}
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

              <label className="simple-checkout__check">
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
                  I confirm that the information I have supplied is true and
                  complete, and I authorise {termsProviderName} and StudentPay to
                  use my information to establish and administer my payment
                  plan.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="button button--primary simple-checkout__submit simple-checkout__action"
              disabled={confirmBlocked}
            >
              {enrolmentConfirmed
                ? "✓ Enrolment Confirmed"
                : submitting || openingDda
                  ? paymentChoice === "full"
                    ? "Processing card payment…"
                    : "Confirming enrolment…"
                  : paymentChoice === "plan"
                    ? "Confirm Enrolment & Activate Payment Plan"
                    : `Pay ${formatCurrency(course.paymentPlan.totalFee)} & Enrol`}
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

      {termsModal ? (
        <TermsModal
          type={termsModal}
          checkoutToken={checkoutSession?.checkoutToken || ""}
          providerName={termsProviderName}
          providerCode={apiProviderCode}
          legalApiBaseUrl={legalApiBaseUrl}
          onClose={() => setTermsModal(null)}
        />
      ) : null}
    </aside>
  );
}
