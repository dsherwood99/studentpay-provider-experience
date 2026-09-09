import type { NzPaymentFrequency, NzPlanPreview } from "./types.ts";

export function dollarsToCents(amount: number): number {
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

export function previewPlan(input: {
  coursePriceCents: number;
  upfrontAmountCents: number;
  frequency: NzPaymentFrequency;
  numberOfInstalments: number;
  firstPaymentDate: string;
}): NzPlanPreview {
  const coursePriceCents = requireNonNegativeCents(
    input.coursePriceCents,
    "course price",
  );
  const upfrontAmountCents = requireNonNegativeCents(
    input.upfrontAmountCents,
    "upfront payment",
  );

  if (upfrontAmountCents > coursePriceCents) {
    throw new Error("Upfront payment cannot exceed course price.");
  }

  const amountToFinanceCents = coursePriceCents - upfrontAmountCents;
  if (amountToFinanceCents <= 0) {
    throw new Error("Amount to finance must be greater than zero.");
  }

  const numberOfInstalments = input.numberOfInstalments;
  if (!Number.isInteger(numberOfInstalments) || numberOfInstalments <= 0) {
    throw new Error("Number of instalments must be a positive integer.");
  }

  if (amountToFinanceCents % numberOfInstalments !== 0) {
    throw new Error(
      "Amount to finance must divide equally across the number of instalments.",
    );
  }

  const instalmentAmountCents = amountToFinanceCents / numberOfInstalments;

  return {
    coursePriceCents,
    upfrontAmountCents,
    amountToFinanceCents,
    frequency: input.frequency,
    numberOfInstalments,
    instalmentAmountCents,
    firstPaymentDate: input.firstPaymentDate,
    totalPayableCents: coursePriceCents,
  };
}

export function assertCanonicalInvariants(preview: NzPlanPreview): void {
  const financed = preview.coursePriceCents - preview.upfrontAmountCents;
  if (financed !== preview.amountToFinanceCents) {
    throw new Error("amount_to_finance must equal course_price - upfront_payment.");
  }
  if (
    preview.numberOfInstalments * preview.instalmentAmountCents !==
    preview.amountToFinanceCents
  ) {
    throw new Error(
      "amount_to_finance must equal number_of_instalments × instalment_amount.",
    );
  }
}

function requireNonNegativeCents(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be integer cents greater than or equal to zero.`);
  }
  return value;
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
