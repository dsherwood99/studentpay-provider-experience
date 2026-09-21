import {
  NZ_CONFIRM_CTA,
  NZ_DIRECT_DEBIT_CTA,
  NZ_PAYMENT_CHOICE_LEAD,
  NZ_PAYMENT_PLAN_COPY,
  NZ_PAY_IN_FULL_COPY,
  NZ_STUDENT_DETAILS_COPY,
  POWERED_BY_LABEL,
} from "./checkout-ui.ts";
import { formatNzdFromCents } from "./plan-math.ts";
import type { NzPaymentOptionId } from "./types.ts";

export const PIF_ONLY_JOURNEY_ATTRIBUTION = "Payments powered by StudentPay NZ";
export const PIF_ONLY_STUDENT_LEAD =
  "We'll use these details to process your enrolment.";
export const PIF_ONLY_PAYMENT_HEADING = "Your payment";
export const PIF_ONLY_CONTINUE_CTA = "Review & pay";

export type HostedPaymentMode =
  | "plan_only"
  | "both_available"
  | "pif_only"
  | "neither";

export type HostedCheckoutRenderFlags = {
  showPaymentPlanChoice: boolean;
  showPayInFullChoice: boolean;
  showPaymentMethodRadios: boolean;
  showPlanSchedule: boolean;
  showFirstPaymentDate: boolean;
  showDdaSection: boolean;
  showPpaLink: boolean;
  showDdsaLink: boolean;
  showPaymentPlanAccepted: boolean;
  showPayInFullSummary: boolean;
  allowCheckoutCreate: boolean;
  allowPlanPreview: boolean;
};

export type HostedCheckoutCopy = {
  paymentSectionTitle: string;
  paymentSectionLead: string;
  studentLead: string;
  continueCta: string;
  confirmCta: string;
  journeyAttribution: string;
};

export type HostedCheckoutCreatePlan =
  | { paymentOption: "pay_in_full" }
  | {
      paymentOption: "interest_free_payment_plan";
      upfrontAmountCents: number;
      frequency: string;
      numberOfInstalments: number;
      firstPaymentDate: string;
    };

export type HostedCheckoutConfirmDeclarations =
  | {
      information_confirmed: boolean;
      privacy_consent_accepted: boolean;
      provider_student_agreement_accepted?: boolean;
      agreements?: {
        provider_student?: {
          version: string;
          key: string;
          content_hash: string;
        };
      };
    }
  | {
      payment_plan_accepted: boolean;
      information_confirmed: boolean;
      privacy_consent_accepted: boolean;
      provider_student_agreement_accepted?: boolean;
      agreements?: {
        provider_student?: {
          version: string;
          key: string;
          content_hash: string;
        };
      };
    };

/**
 * Canonical Hosted payment-mode matrix:
 * A plan_only — tenant plan enabled and course includes payment_plan; PIF unavailable
 * B both_available — tenant plan enabled and course includes both; PIF eligible
 * C pif_only — tenant plan disabled and course includes pay_in_full only; PIF eligible
 * D neither — no eligible option; fail closed
 */
export function resolveHostedPaymentMode(input: {
  paymentPlanAvailable: boolean;
  payInFullAvailable: boolean;
}): HostedPaymentMode {
  if (input.paymentPlanAvailable && input.payInFullAvailable) {
    return "both_available";
  }
  if (input.paymentPlanAvailable) {
    return "plan_only";
  }
  if (input.payInFullAvailable) {
    return "pif_only";
  }
  return "neither";
}

export function initialHostedPaymentOption(
  mode: HostedPaymentMode,
): NzPaymentOptionId | null {
  if (mode === "plan_only" || mode === "both_available") {
    return "interest_free_payment_plan";
  }
  if (mode === "pif_only") {
    return "pay_in_full";
  }
  return null;
}

export function resolveHostedPaymentOption(input: {
  mode: HostedPaymentMode;
  selected: NzPaymentOptionId | null;
  paymentChoiceTouched: boolean;
  storedDraftOption?: NzPaymentOptionId | null;
}): NzPaymentOptionId | null {
  if (input.mode === "neither") {
    return null;
  }
  if (input.mode === "pif_only") {
    return "pay_in_full";
  }
  if (input.mode === "plan_only") {
    return "interest_free_payment_plan";
  }

  if (input.paymentChoiceTouched) {
    return input.selected === "pay_in_full"
      ? "pay_in_full"
      : "interest_free_payment_plan";
  }
  if (input.storedDraftOption === "pay_in_full") {
    return "pay_in_full";
  }
  if (input.storedDraftOption === "interest_free_payment_plan") {
    return "interest_free_payment_plan";
  }
  return initialHostedPaymentOption(input.mode);
}

export function hostedCheckoutRenderFlags(input: {
  mode: HostedPaymentMode;
  selectedOption: NzPaymentOptionId | null;
}): HostedCheckoutRenderFlags {
  const selectedPif = input.selectedOption === "pay_in_full";
  const selectedPlan = input.selectedOption === "interest_free_payment_plan";
  const both = input.mode === "both_available";
  const planJourney =
    input.mode === "plan_only" || (both && selectedPlan);
  const pifJourney = input.mode === "pif_only" || (both && selectedPif);

  return {
    showPaymentMethodRadios: both,
    showPaymentPlanChoice: both,
    showPayInFullChoice: both,
    showPlanSchedule: planJourney,
    showFirstPaymentDate: planJourney,
    showDdaSection: planJourney,
    showPpaLink: planJourney,
    showDdsaLink: planJourney,
    showPaymentPlanAccepted: planJourney,
    showPayInFullSummary: pifJourney,
    allowCheckoutCreate: input.mode !== "neither" && Boolean(input.selectedOption),
    allowPlanPreview: planJourney,
  };
}

export function hostedCheckoutCopy(input: {
  mode: HostedPaymentMode;
  selectedOption: NzPaymentOptionId | null;
  amountCents?: number;
  tenantAttribution: string;
}): HostedCheckoutCopy {
  const amountLabel =
    input.amountCents != null ? formatNzdFromCents(input.amountCents) : null;

  if (input.mode === "pif_only") {
    return {
      paymentSectionTitle: PIF_ONLY_PAYMENT_HEADING,
      paymentSectionLead: NZ_PAY_IN_FULL_COPY.choiceLead,
      studentLead: PIF_ONLY_STUDENT_LEAD,
      continueCta: PIF_ONLY_CONTINUE_CTA,
      confirmCta: amountLabel ? `Pay ${amountLabel}` : PIF_ONLY_CONTINUE_CTA,
      journeyAttribution: POWERED_BY_LABEL,
    };
  }

  if (input.mode === "both_available") {
    return {
      paymentSectionTitle: "How would you like to pay?",
      paymentSectionLead: NZ_PAYMENT_CHOICE_LEAD,
      studentLead:
        input.selectedOption === "pay_in_full"
          ? NZ_PAY_IN_FULL_COPY.studentLead
          : NZ_STUDENT_DETAILS_COPY.lead,
      continueCta:
        input.selectedOption === "pay_in_full"
          ? NZ_PAY_IN_FULL_COPY.continueCta
          : NZ_DIRECT_DEBIT_CTA,
      confirmCta:
        input.selectedOption === "pay_in_full"
          ? NZ_PAY_IN_FULL_COPY.confirmCta
          : NZ_CONFIRM_CTA,
      journeyAttribution: POWERED_BY_LABEL,
    };
  }

  if (input.selectedOption === "pay_in_full") {
    return {
      paymentSectionTitle: NZ_PAY_IN_FULL_COPY.heading,
      paymentSectionLead: NZ_PAY_IN_FULL_COPY.choiceLead,
      studentLead: NZ_PAY_IN_FULL_COPY.studentLead,
      continueCta: NZ_PAY_IN_FULL_COPY.continueCta,
      confirmCta: NZ_PAY_IN_FULL_COPY.confirmCta,
      journeyAttribution: POWERED_BY_LABEL,
    };
  }

  return {
    paymentSectionTitle: NZ_PAYMENT_PLAN_COPY.heading,
    paymentSectionLead: NZ_PAYMENT_PLAN_COPY.intro,
    studentLead: NZ_STUDENT_DETAILS_COPY.lead,
    continueCta: NZ_DIRECT_DEBIT_CTA,
    confirmCta: NZ_CONFIRM_CTA,
    journeyAttribution: POWERED_BY_LABEL,
  };
}

export function hostedCheckoutCreatePlan(input: {
  mode: HostedPaymentMode;
  selectedOption: NzPaymentOptionId | null;
  plan?: {
    upfrontAmountCents: number;
    frequency: string;
    numberOfInstalments: number;
    firstPaymentDate: string;
  };
}): HostedCheckoutCreatePlan | null {
  if (input.mode === "neither" || !input.selectedOption) {
    return null;
  }
  if (input.selectedOption === "pay_in_full") {
    return { paymentOption: "pay_in_full" };
  }
  if (!input.plan) {
    return null;
  }
  return {
    paymentOption: "interest_free_payment_plan",
    upfrontAmountCents: input.plan.upfrontAmountCents,
    frequency: input.plan.frequency,
    numberOfInstalments: input.plan.numberOfInstalments,
    firstPaymentDate: input.plan.firstPaymentDate,
  };
}

export function hostedCheckoutConfirmDeclarations(input: {
  selectedOption: NzPaymentOptionId | null;
  declarations: {
    payment_plan_accepted: boolean;
    information_confirmed: boolean;
    privacy_consent_accepted: boolean;
    provider_student_agreement_accepted?: boolean;
  };
  providerStudentAgreement?: {
    version: string;
    key: string;
    content_hash: string;
  } | null;
}): HostedCheckoutConfirmDeclarations | null {
  if (!input.selectedOption) {
    return null;
  }
  const psa = input.providerStudentAgreement
    ? {
        provider_student_agreement_accepted:
          input.declarations.provider_student_agreement_accepted === true,
        agreements: {
          provider_student: {
            version: input.providerStudentAgreement.version,
            key: input.providerStudentAgreement.key,
            content_hash: input.providerStudentAgreement.content_hash,
          },
        },
      }
    : {};
  if (input.selectedOption === "pay_in_full") {
    return {
      information_confirmed: input.declarations.information_confirmed,
      privacy_consent_accepted: input.declarations.privacy_consent_accepted,
      ...psa,
    };
  }
  return {
    payment_plan_accepted: input.declarations.payment_plan_accepted,
    information_confirmed: input.declarations.information_confirmed,
    privacy_consent_accepted: input.declarations.privacy_consent_accepted,
    ...psa,
  };
}

/**
 * Lock point: after a financial checkout exists (checkout_id / setup URL /
 * PaymentIntent client secret), switching methods is unsafe.
 * Before that point, the student may change cards and incompatible UI state
 * must be cleared rather than leaked.
 */
export function paymentMethodSwitchLocked(input: {
  checkoutCreated: boolean;
}): boolean {
  return input.checkoutCreated;
}

export function clearedStateForPaymentSwitch(): {
  setupUrl: string;
  setupComplete: boolean;
  clientSecret: string;
  publishableKey: string;
  ledgerPosted: boolean;
  stripeSucceeded: boolean;
  stripeStatus: null;
  serverErrorAfterPayment: boolean;
  confirmCode: null;
  declarations: {
    payment_plan_accepted: boolean;
    information_confirmed: boolean;
    privacy_consent_accepted: boolean;
    provider_student_agreement_accepted: boolean;
  };
} {
  return {
    setupUrl: "",
    setupComplete: false,
    clientSecret: "",
    publishableKey: "",
    ledgerPosted: false,
    stripeSucceeded: false,
    stripeStatus: null,
    serverErrorAfterPayment: false,
    confirmCode: null,
    declarations: {
      payment_plan_accepted: false,
      information_confirmed: false,
      privacy_consent_accepted: false,
      provider_student_agreement_accepted: false,
    },
  };
}

const PIF_ONLY_FORBIDDEN_COPY = [
  "Your payment plan",
  "Payment plan powered by StudentPay NZ",
  PIF_ONLY_JOURNEY_ATTRIBUTION,
  "We'll use these details to set up your enrolment and StudentPay payment plan.",
  "Confirm enrolment & activate payment plan",
  "Set up Direct Debit",
  "Direct debit",
  "Payment Plan Agreement",
  "Direct Debit Service Agreement",
  "activate payment plan",
  "per week",
  "weekly payments",
] as const;

export type HostedCheckoutViewModel = {
  mode: HostedPaymentMode;
  selectedOption: NzPaymentOptionId | null;
  flags: HostedCheckoutRenderFlags;
  copy: HostedCheckoutCopy;
  createPlan: HostedCheckoutCreatePlan | null;
  confirmDeclarations: HostedCheckoutConfirmDeclarations | null;
  visibleCopy: string[];
  absentCopy: string[];
  presentTestIds: string[];
  absentTestIds: string[];
};

export function hostedCheckoutViewModel(input: {
  paymentPlanAvailable: boolean;
  payInFullAvailable: boolean;
  selected?: NzPaymentOptionId | null;
  paymentChoiceTouched?: boolean;
  storedDraftOption?: NzPaymentOptionId | null;
  amountCents?: number;
  tenantAttribution?: string;
  declarations?: {
    payment_plan_accepted: boolean;
    information_confirmed: boolean;
    privacy_consent_accepted: boolean;
  };
  plan?: {
    upfrontAmountCents: number;
    frequency: string;
    numberOfInstalments: number;
    firstPaymentDate: string;
  };
}): HostedCheckoutViewModel {
  const mode = resolveHostedPaymentMode(input);
  const selectedOption = resolveHostedPaymentOption({
    mode,
    selected: input.selected ?? initialHostedPaymentOption(mode),
    paymentChoiceTouched: Boolean(input.paymentChoiceTouched),
    storedDraftOption: input.storedDraftOption,
  });
  const flags = hostedCheckoutRenderFlags({ mode, selectedOption });
  const copy = hostedCheckoutCopy({
    mode,
    selectedOption,
    amountCents: input.amountCents,
    tenantAttribution:
      input.tenantAttribution || "Payment plan powered by StudentPay NZ",
  });
  const createPlan = hostedCheckoutCreatePlan({
    mode,
    selectedOption,
    plan: input.plan,
  });
  const confirmDeclarations = hostedCheckoutConfirmDeclarations({
    selectedOption,
    declarations: input.declarations || {
      payment_plan_accepted: false,
      information_confirmed: true,
      privacy_consent_accepted: true,
    },
  });

  const presentTestIds = ["nz-section-student", "nz-section-review"];
  const absentTestIds: string[] = [];
  if (flags.showPaymentPlanChoice) {
    presentTestIds.push("nz-payment-plan-choice");
  } else {
    absentTestIds.push("nz-payment-plan-choice");
  }
  if (flags.showPayInFullChoice) {
    presentTestIds.push("nz-pay-in-full-choice");
  }
  if (flags.showDdaSection) {
    presentTestIds.push("nz-section-dda");
  } else {
    absentTestIds.push("nz-section-dda");
  }
  if (flags.showPayInFullSummary) {
    presentTestIds.push("nz-section-card");
    presentTestIds.push("nz-pay-in-full-today");
    presentTestIds.push("nz-authoritative-price");
  }

  const visibleCopy = [
    copy.paymentSectionTitle,
    copy.studentLead,
    copy.continueCta,
    copy.confirmCta,
    copy.journeyAttribution,
  ];
  if (flags.showPayInFullSummary) {
    visibleCopy.push("Pay now");
  }

  const absentCopy: string[] = [];
  if (mode === "pif_only") {
    absentCopy.push(...PIF_ONLY_FORBIDDEN_COPY);
  }
  if (!flags.showPaymentPlanChoice) {
    absentCopy.push("nz-payment-plan-choice");
  }
  if (!flags.showDdaSection) {
    absentCopy.push("nz-section-dda", "Set up Direct Debit", "first-payment-date");
  }
  if (!flags.showPpaLink) {
    absentCopy.push("Payment Plan Agreement");
  }
  if (!flags.showDdsaLink) {
    absentCopy.push("Direct Debit Service Agreement");
  }

  return {
    mode,
    selectedOption,
    flags,
    copy,
    createPlan,
    confirmDeclarations,
    visibleCopy,
    absentCopy,
    presentTestIds,
    absentTestIds,
  };
}
