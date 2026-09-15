import { isConfirmedCheckoutStatus } from "./checkout-ui.ts";
import type { NzPaymentOptionId } from "./types.ts";

export type PayInFullUiPhase =
  | "select"
  | "details"
  | "card"
  | "paying"
  | "processing"
  | "confirming_enrolment"
  | "failed"
  | "server_error_after_payment"
  | "confirmed";

export function isPayInFullOption(
  option: NzPaymentOptionId | string | null | undefined,
): boolean {
  return option === "pay_in_full";
}

export function shouldCreatePayInFullCheckout(input: {
  eligible: boolean;
  studentValid: boolean;
  alreadyCreated: boolean;
  userClickedContinue: boolean;
  busy: boolean;
}): boolean {
  return (
    input.eligible &&
    input.studentValid &&
    !input.alreadyCreated &&
    input.userClickedContinue &&
    !input.busy
  );
}

export function shouldConfirmPayInFullCheckout(input: {
  studentValid: boolean;
  ledgerPosted: boolean;
  declarationsAccepted: boolean;
  userClickedConfirm: boolean;
  busy: boolean;
  alreadyConfirmed: boolean;
}): boolean {
  return (
    input.studentValid &&
    input.ledgerPosted &&
    input.declarationsAccepted &&
    input.userClickedConfirm &&
    !input.busy &&
    !input.alreadyConfirmed
  );
}

export function payInFullDeclarationsAccepted(declarations: {
  information_confirmed: boolean;
  privacy_consent_accepted: boolean;
}): boolean {
  return (
    declarations.information_confirmed && declarations.privacy_consent_accepted
  );
}

export function shouldPollPayInFullStatus(input: {
  hasCheckoutSession: boolean;
  paymentOption: NzPaymentOptionId | string | null | undefined;
  alreadyConfirmed: boolean;
}): boolean {
  return (
    isPayInFullOption(input.paymentOption) &&
    input.hasCheckoutSession &&
    !input.alreadyConfirmed
  );
}

export function enrolmentCompleteFromBrowser(input: {
  stripeSucceeded: boolean;
  checkoutStatus?: string | null;
  ledgerPosted: boolean;
}): boolean {
  void input.stripeSucceeded;
  void input.ledgerPosted;
  return isConfirmedCheckoutStatus(input.checkoutStatus || undefined);
}

export function payInFullPhase(input: {
  confirmed: boolean;
  stripeSucceeded: boolean;
  ledgerPosted: boolean;
  stripeStatus?: string | null;
  paymentStatus?: string | null;
  confirmCode?: string | null;
  serverErrorAfterPayment: boolean;
  hasClientSecret: boolean;
}): PayInFullUiPhase {
  if (input.confirmed) {
    return "confirmed";
  }
  if (input.serverErrorAfterPayment) {
    return "server_error_after_payment";
  }
  if (input.confirmCode === "PAYMENT_FAILED" || input.stripeStatus === "requires_payment_method") {
    return "failed";
  }
  if (input.stripeSucceeded && !input.ledgerPosted) {
    return "confirming_enrolment";
  }
  if (input.ledgerPosted && !input.confirmed) {
    return "confirming_enrolment";
  }
  if (
    input.confirmCode === "PAYMENT_PROCESSING" ||
    input.stripeStatus === "processing" ||
    input.stripeStatus === "requires_action" ||
    input.paymentStatus === "processing"
  ) {
    return "processing";
  }
  if (input.hasClientSecret) {
    return "card";
  }
  return "details";
}

export function payInFullFailureCopy(phase: PayInFullUiPhase): {
  title: string;
  body: string;
  allowRetry: boolean;
  inviteAnotherPayment: boolean;
} {
  if (phase === "failed") {
    return {
      title: "Payment not completed",
      body: "Your card was not charged. You can try again with the same enrolment.",
      allowRetry: true,
      inviteAnotherPayment: false,
    };
  }
  if (phase === "processing") {
    return {
      title: "Payment is being processed",
      body: "Do not pay again. We will update this page when the payment finishes.",
      allowRetry: false,
      inviteAnotherPayment: false,
    };
  }
  if (phase === "confirming_enrolment") {
    return {
      title: "Payment received — confirming enrolment",
      body: "Your card payment was received. We are confirming your enrolment.",
      allowRetry: false,
      inviteAnotherPayment: false,
    };
  }
  if (phase === "server_error_after_payment") {
    return {
      title: "Payment received — enrolment still confirming",
      body: "Do not pay again. Keep this checkout reference and contact support if this page does not update.",
      allowRetry: false,
      inviteAnotherPayment: false,
    };
  }
  return {
    title: "",
    body: "",
    allowRetry: false,
    inviteAnotherPayment: false,
  };
}

export function payInFullSuccessCopy(input: {
  courseName: string;
  providerName: string;
  amountLabel: string;
  checkoutId?: string | null;
}): { heading: string; lead: string; rows: { label: string; value: string }[] } {
  const rows = [
    { label: "Course", value: input.courseName },
    { label: "Provider", value: input.providerName },
    { label: "Payment received", value: input.amountLabel },
    { label: "Payment method", value: "Card" },
  ];
  if (input.checkoutId) {
    rows.push({ label: "Reference", value: input.checkoutId });
  }
  return {
    heading: "Enrolment confirmed",
    lead: "Your enrolment is confirmed. Payment was received by card.",
    rows,
  };
}

export function payInFullSuccessContainsForbiddenCopy(text: string): boolean {
  return /direct debit|gocardless|payment plan agreement|instalment schedule|ppa\b/i.test(
    text,
  );
}

export function sameCheckoutResume(input: {
  previousCheckoutId?: string | null;
  nextCheckoutId?: string | null;
}): boolean {
  return Boolean(
    input.previousCheckoutId &&
      input.nextCheckoutId &&
      input.previousCheckoutId === input.nextCheckoutId,
  );
}

export function shouldReuseProviderOrderId(input: {
  sessionProviderSlug?: string | null;
  sessionCourseSlug?: string | null;
  providerSlug: string;
  courseSlug: string;
  sessionProviderOrderId?: string | null;
}): boolean {
  return Boolean(
    input.sessionProviderOrderId &&
      input.sessionProviderSlug === input.providerSlug &&
      input.sessionCourseSlug === input.courseSlug,
  );
}
