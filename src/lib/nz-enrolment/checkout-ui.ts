import { formatNzdFromCents } from "./plan-math.ts";
import type { NzPaymentFrequency, NzPlanPreview, NzStudentDetails } from "./types.ts";
import { validateStudentDetails } from "./validation.ts";

export const NZ_CHECKOUT_SECTIONS = [
  { id: "plan", number: 1, title: "Your payment plan" },
  { id: "student", number: 2, title: "Your details" },
  { id: "dda", number: 3, title: "Direct debit" },
  { id: "review", number: 4, title: "Review & confirm" },
] as const;

export type NzCheckoutSectionId = (typeof NZ_CHECKOUT_SECTIONS)[number]["id"];

export type NzSectionStatus = "not_started" | "ready" | "action_required" | "complete";

export const NZ_STUDENT_DETAILS_COPY = {
  heading: "Your details",
  lead: "We'll use these details to set up your enrolment and StudentPay payment plan.",
} as const;

export const NZ_PAYMENT_PLAN_COPY = {
  heading: "Your payment plan",
  intro: "This course is already selected. The weekly plan is calculated from the course fee.",
} as const;

export const NZ_DIRECT_DEBIT_COPY = {
  heading: "Direct debit",
  authorisedTitle: "Direct Debit authorised",
  authorisedBody: "Your bank account has been securely authorised for scheduled payments.",
} as const;

export const NZ_REVIEW_COPY = {
  heading: "Review & confirm",
} as const;

export const NZ_CONFIRMATION_COPY = {
  heading: "Enrolment confirmed",
} as const;

export const NZ_CONFIRM_CTA = "Confirm enrolment & activate payment plan";
export const NZ_DIRECT_DEBIT_CTA = "Set up Direct Debit";

/** Visual stepper labels from the previous wizard. Must not appear as tabs. */
export const NZ_REMOVED_STEPPER_LABELS = [
  "Payment option",
  "Your plan",
  "Agreement",
  "Complete",
] as const;

export function studentDetailsAreValid(student: Partial<NzStudentDetails>): boolean {
  return Object.keys(validateStudentDetails(student)).length === 0;
}

export function studentDetailsStarted(student: Partial<NzStudentDetails>): boolean {
  return Boolean(
    student.firstName?.trim() ||
      student.lastName?.trim() ||
      student.email?.trim() ||
      student.mobile?.trim() ||
      student.dateOfBirth?.trim() ||
      student.streetAddress?.trim() ||
      student.suburb?.trim() ||
      student.city?.trim() ||
      student.postcode?.trim() ||
      student.region?.trim() ||
      (student.country?.trim() && student.country.trim() !== "New Zealand"),
  );
}

export function declarationsAccepted(declarations: {
  payment_plan_accepted: boolean;
  information_confirmed: boolean;
  privacy_consent_accepted: boolean;
}): boolean {
  return (
    declarations.payment_plan_accepted &&
    declarations.information_confirmed &&
    declarations.privacy_consent_accepted
  );
}

export function shouldCreateCheckout(input: {
  studentValid: boolean;
  alreadyCreated: boolean;
  userClickedDirectDebit: boolean;
  busy: boolean;
}): boolean {
  return (
    input.studentValid &&
    !input.alreadyCreated &&
    input.userClickedDirectDebit &&
    !input.busy
  );
}

export function shouldConfirmCheckout(input: {
  studentValid: boolean;
  setupComplete: boolean;
  declarationsAccepted: boolean;
  userClickedConfirm: boolean;
  busy: boolean;
  alreadyConfirmed: boolean;
}): boolean {
  return (
    input.studentValid &&
    input.setupComplete &&
    input.declarationsAccepted &&
    input.userClickedConfirm &&
    !input.busy &&
    !input.alreadyConfirmed
  );
}

export function shouldPollDirectDebitStatus(input: {
  hasCheckoutSession: boolean;
  ddaReturn?: "return" | "cancelled" | null;
}): boolean {
  return Boolean(input.hasCheckoutSession || input.ddaReturn);
}

export function confirmEnabled(input: {
  studentValid: boolean;
  setupComplete: boolean;
  declarationsAccepted: boolean;
  busy: boolean;
  alreadyConfirmed?: boolean;
}): boolean {
  return (
    input.studentValid &&
    input.setupComplete &&
    input.declarationsAccepted &&
    !input.busy &&
    !input.alreadyConfirmed
  );
}

export function sectionStatus(input: {
  section: NzCheckoutSectionId;
  planReady: boolean;
  studentValid: boolean;
  studentStarted: boolean;
  studentErrors: boolean;
  hasCheckoutSession: boolean;
  setupComplete: boolean;
  ddaCancelled: boolean;
  confirmed: boolean;
}): NzSectionStatus {
  if (input.section === "plan") {
    return input.planReady ? "complete" : "action_required";
  }
  if (input.section === "student") {
    if (input.studentValid) return "complete";
    if (input.studentErrors) return "action_required";
    if (input.studentStarted) return "ready";
    return "not_started";
  }
  if (input.section === "dda") {
    if (input.setupComplete) return "complete";
    if (input.ddaCancelled) return "action_required";
    if (input.hasCheckoutSession || input.studentValid) return "ready";
    return "not_started";
  }
  if (input.confirmed) return "complete";
  if (input.setupComplete) return "ready";
  return "not_started";
}

export function sectionStatusLabel(status: NzSectionStatus): string {
  if (status === "complete") return "Complete";
  if (status === "ready") return "Ready";
  if (status === "action_required") return "Action required";
  return "Not started";
}

export function isConfirmedCheckoutStatus(status: string | undefined): boolean {
  const value = status?.trim().toLowerCase() || "";
  return value === "confirmed" || value === "complete" || value === "completed";
}

function periodLabel(frequency: NzPaymentFrequency): string {
  if (frequency === "Weekly") return "week";
  if (frequency === "Fortnightly") return "fortnight";
  return "month";
}

function frequencyAdjective(frequency: NzPaymentFrequency): string {
  return frequency.toLowerCase();
}

export type NzPlanDisplay = {
  regularLabel: string;
  upfrontLabel: string;
  regularCountLabel: string;
  finalPaymentLabel: string | null;
  totalLabel: string;
  rows: { label: string; value: string }[];
};

export function planDisplay(preview: NzPlanPreview): NzPlanDisplay {
  const amount = formatNzdFromCents(preview.regularInstalmentAmountCents);
  const period = periodLabel(preview.frequency);
  const adjective = frequencyAdjective(preview.frequency);
  const finalPaymentLabel =
    preview.hasResidualFinal && preview.finalInstalmentAmountCents != null
      ? `Final payment of ${formatNzdFromCents(preview.finalInstalmentAmountCents)}`
      : null;

  const regularCountLabel = preview.hasResidualFinal
    ? `${preview.fullRegularInstalmentCount} ${adjective} payments of ${amount}`
    : `${preview.numberOfInstalments} ${adjective} payments of ${amount}`;

  const rows: { label: string; value: string }[] = [
    { label: "Course fee", value: formatNzdFromCents(preview.coursePriceCents) },
    { label: "Upfront", value: formatNzdFromCents(preview.upfrontAmountCents) },
    {
      label: "Regular payment",
      value: `${amount} ${preview.frequency.toLowerCase()}`,
    },
  ];

  if (finalPaymentLabel && preview.finalInstalmentAmountCents != null) {
    rows.push({
      label: "Weekly payments",
      value: `${preview.fullRegularInstalmentCount} × ${amount}`,
    });
    rows.push({
      label: "Final payment",
      value: formatNzdFromCents(preview.finalInstalmentAmountCents),
    });
  } else {
    rows.push({
      label: "Weekly payments",
      value: `${preview.numberOfInstalments} × ${amount}`,
    });
  }

  rows.push({
    label: "Total payments",
    value: String(preview.numberOfInstalments),
  });
  rows.push({
    label: "First payment date",
    value: preview.firstPaymentDate,
  });
  rows.push({
    label: "Total",
    value: formatNzdFromCents(preview.totalPayableCents),
  });

  return {
    regularLabel: `${amount} per ${period}`,
    upfrontLabel: `${formatNzdFromCents(preview.upfrontAmountCents)} upfront`,
    regularCountLabel,
    finalPaymentLabel,
    totalLabel: formatNzdFromCents(preview.totalPayableCents),
    rows,
  };
}

export function planDisplayRows(preview: NzPlanPreview): { label: string; value: string }[] {
  return planDisplay(preview).rows;
}
