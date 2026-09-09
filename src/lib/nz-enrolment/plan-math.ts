import { GENERIC_MAX_RECURRING_INSTALMENTS } from "./environment.ts";
import type { NzPaymentFrequency, NzPlanPreview } from "./types.ts";

export function dollarsToCents(amount: number | string): number {
  if (typeof amount === "string") {
    const trimmed = amount.trim();
    if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
      throw new Error("Amount must be a cent-precision decimal string.");
    }
    const sign = trimmed.startsWith("-") ? -1 : 1;
    const [wholeRaw, fraction = ""] = trimmed.replace("-", "").split(".");
    const fractionCents = Number((fraction + "00").slice(0, 2));
    return sign * (Number(wholeRaw) * 100 + fractionCents);
  }
  if (!Number.isFinite(amount)) {
    throw new Error("Amount must be a finite number.");
  }
  return Math.round(amount * 100);
}

export function centsToApiAmount(cents: number): number {
  if (!Number.isInteger(cents)) {
    throw new Error("Cents must be an integer.");
  }
  return cents / 100;
}

function requireNonNegativeCents(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be integer cents greater than or equal to zero.`);
  }
  return value;
}

function requirePositiveCents(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be integer cents greater than zero.`);
  }
  return value;
}

function buildPreview(input: {
  coursePriceCents: number;
  upfrontAmountCents: number;
  amountToFinanceCents: number;
  frequency: NzPaymentFrequency;
  numberOfInstalments: number;
  regularInstalmentAmountCents: number;
  finalInstalmentAmountCents: number | null;
  fullRegularInstalmentCount: number;
  firstPaymentDate: string;
}): NzPlanPreview {
  return {
    coursePriceCents: input.coursePriceCents,
    upfrontAmountCents: input.upfrontAmountCents,
    amountToFinanceCents: input.amountToFinanceCents,
    frequency: input.frequency,
    numberOfInstalments: input.numberOfInstalments,
    instalmentAmountCents: input.regularInstalmentAmountCents,
    regularInstalmentAmountCents: input.regularInstalmentAmountCents,
    finalInstalmentAmountCents: input.finalInstalmentAmountCents,
    fullRegularInstalmentCount: input.fullRegularInstalmentCount,
    hasResidualFinal: input.finalInstalmentAmountCents != null,
    firstPaymentDate: input.firstPaymentDate,
    totalPayableCents: input.coursePriceCents,
  };
}

export function derivePlanFromRegularInstalment(input: {
  coursePriceCents: number;
  upfrontAmountCents: number;
  regularInstalmentCents: number;
  frequency: NzPaymentFrequency;
  firstPaymentDate: string;
}): NzPlanPreview {
  const coursePriceCents = requirePositiveCents(input.coursePriceCents, "course price");
  const upfrontAmountCents = requireNonNegativeCents(
    input.upfrontAmountCents,
    "payment-plan upfront",
  );
  const regularInstalmentCents = requirePositiveCents(
    input.regularInstalmentCents,
    "regular instalment",
  );

  if (upfrontAmountCents >= coursePriceCents) {
    throw new Error("Payment-plan upfront must be less than course price.");
  }

  const amountToFinanceCents = coursePriceCents - upfrontAmountCents;
  if (regularInstalmentCents > amountToFinanceCents) {
    throw new Error("Regular instalment cannot exceed amount to finance.");
  }

  const fullRegularInstalmentCount = Math.floor(
    amountToFinanceCents / regularInstalmentCents,
  );
  const residualCents = amountToFinanceCents % regularInstalmentCents;

  let numberOfInstalments: number;
  let finalInstalmentAmountCents: number | null;

  if (residualCents === 0) {
    numberOfInstalments = fullRegularInstalmentCount;
    finalInstalmentAmountCents = null;
  } else {
    numberOfInstalments = fullRegularInstalmentCount + 1;
    finalInstalmentAmountCents = residualCents;
  }

  if (numberOfInstalments < 1) {
    throw new Error("Number of instalments must be a positive integer.");
  }
  if (numberOfInstalments > GENERIC_MAX_RECURRING_INSTALMENTS) {
    throw new Error(
      `Number of instalments cannot exceed ${GENERIC_MAX_RECURRING_INSTALMENTS}.`,
    );
  }

  const preview = buildPreview({
    coursePriceCents,
    upfrontAmountCents,
    amountToFinanceCents,
    frequency: input.frequency,
    numberOfInstalments,
    regularInstalmentAmountCents: regularInstalmentCents,
    finalInstalmentAmountCents,
    fullRegularInstalmentCount,
    firstPaymentDate: input.firstPaymentDate,
  });
  assertCanonicalInvariants(preview);
  return preview;
}

export function previewEqualInstalmentPlan(input: {
  coursePriceCents: number;
  upfrontAmountCents: number;
  frequency: NzPaymentFrequency;
  numberOfInstalments: number;
  firstPaymentDate: string;
}): NzPlanPreview {
  const coursePriceCents = requirePositiveCents(input.coursePriceCents, "course price");
  const upfrontAmountCents = requireNonNegativeCents(
    input.upfrontAmountCents,
    "payment-plan upfront",
  );

  if (upfrontAmountCents >= coursePriceCents) {
    throw new Error("Payment-plan upfront must be less than course price.");
  }

  const amountToFinanceCents = coursePriceCents - upfrontAmountCents;
  const numberOfInstalments = input.numberOfInstalments;
  if (!Number.isInteger(numberOfInstalments) || numberOfInstalments <= 0) {
    throw new Error("Number of instalments must be a positive integer.");
  }
  if (numberOfInstalments > GENERIC_MAX_RECURRING_INSTALMENTS) {
    throw new Error(
      `Number of instalments cannot exceed ${GENERIC_MAX_RECURRING_INSTALMENTS}.`,
    );
  }

  if (amountToFinanceCents % numberOfInstalments !== 0) {
    throw new Error(
      "Amount to finance must divide equally across the number of instalments.",
    );
  }

  const instalmentAmountCents = amountToFinanceCents / numberOfInstalments;
  const preview = buildPreview({
    coursePriceCents,
    upfrontAmountCents,
    amountToFinanceCents,
    frequency: input.frequency,
    numberOfInstalments,
    regularInstalmentAmountCents: instalmentAmountCents,
    finalInstalmentAmountCents: null,
    fullRegularInstalmentCount: numberOfInstalments,
    firstPaymentDate: input.firstPaymentDate,
  });
  assertCanonicalInvariants(preview);
  return preview;
}

export function previewPlan(input: {
  coursePriceCents: number;
  upfrontAmountCents: number;
  frequency: NzPaymentFrequency;
  firstPaymentDate: string;
  numberOfInstalments?: number;
  regularInstalmentCents?: number;
}): NzPlanPreview {
  if (input.regularInstalmentCents != null) {
    return derivePlanFromRegularInstalment({
      coursePriceCents: input.coursePriceCents,
      upfrontAmountCents: input.upfrontAmountCents,
      regularInstalmentCents: input.regularInstalmentCents,
      frequency: input.frequency,
      firstPaymentDate: input.firstPaymentDate,
    });
  }

  if (input.numberOfInstalments == null) {
    throw new Error("A regular instalment amount or instalment count is required.");
  }

  return previewEqualInstalmentPlan({
    coursePriceCents: input.coursePriceCents,
    upfrontAmountCents: input.upfrontAmountCents,
    frequency: input.frequency,
    numberOfInstalments: input.numberOfInstalments,
    firstPaymentDate: input.firstPaymentDate,
  });
}

export function assertCanonicalInvariants(preview: NzPlanPreview): void {
  const financed = preview.coursePriceCents - preview.upfrontAmountCents;
  if (financed !== preview.amountToFinanceCents) {
    throw new Error("amount_to_finance must equal course_price - upfront_payment.");
  }

  const residual = preview.finalInstalmentAmountCents;
  if (residual == null) {
    if (
      preview.numberOfInstalments * preview.regularInstalmentAmountCents !==
      preview.amountToFinanceCents
    ) {
      throw new Error(
        "Equal plans must satisfy amount_to_finance = number_of_instalments × instalment_amount.",
      );
    }
    return;
  }

  if (residual <= 0) {
    throw new Error("Residual final instalment must be greater than zero when declared.");
  }
  if (residual >= preview.regularInstalmentAmountCents) {
    throw new Error("Residual final instalment must be less than the regular instalment.");
  }
  if (preview.fullRegularInstalmentCount + 1 !== preview.numberOfInstalments) {
    throw new Error("Residual plans must add exactly one final instalment.");
  }

  const scheduled =
    preview.fullRegularInstalmentCount * preview.regularInstalmentAmountCents +
    residual;
  if (scheduled !== preview.amountToFinanceCents) {
    throw new Error("SUM(recurring instalments) must equal amount_to_finance exactly.");
  }
}

export function formatNzdFromCents(cents: number): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
  }).format(centsToApiAmount(cents));
}

export function aucklandToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function defaultFirstPaymentDate(): string {
  return addCalendarDays(aucklandToday(), 7);
}
