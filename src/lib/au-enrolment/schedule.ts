export type AuScheduleFailure =
  | "non_integer_cents"
  | "non_positive_price"
  | "non_positive_weekly"
  | "no_weekly_instalments"
  | "upfront_out_of_range"
  | "final_out_of_range"
  | "remainder_unknown"
  | "total_mismatch";

export type AuScheduleRemainder = "upfront" | "final";

export type AuWeeklySchedule = {
  coursePriceCents: number;
  weeklyAmountCents: number;
  numberOfInstallments: number;
  upfrontPaymentCents: number;
  finalPaymentCents: number;
  currency: "AUD";
  paymentFrequency: "Weekly";
  upfrontCollection: "within-24-hours-of-signup" | "none";
};

export type AuScheduleResult =
  | { ok: true; schedule: AuWeeklySchedule }
  | { ok: false; reason: AuScheduleFailure };

function isWholeCents(value: number): boolean {
  return Number.isSafeInteger(value);
}

/**
 * Equal weekly instalments. The default remainder is the upfront payment,
 * collected within 24 hours of signup. `remainder: "final"` keeps that
 * upfront at zero and places the remainder on the last instalment.
 *
 * This is the same rule as studentpay-api `calculateWeeklySchedule`.
 */
export function calculateAuWeeklySchedule({
  coursePriceCents,
  weeklyAmountCents,
  remainder = "upfront",
  selectedUpfrontCents = null,
}: {
  coursePriceCents: number;
  weeklyAmountCents: number;
  remainder?: AuScheduleRemainder;
  selectedUpfrontCents?: number | null;
}): AuScheduleResult {
  if (remainder !== "upfront" && remainder !== "final") {
    return { ok: false, reason: "remainder_unknown" };
  }
  if (!isWholeCents(coursePriceCents) || !isWholeCents(weeklyAmountCents)) {
    return { ok: false, reason: "non_integer_cents" };
  }
  if (coursePriceCents <= 0) return { ok: false, reason: "non_positive_price" };
  if (weeklyAmountCents <= 0) return { ok: false, reason: "non_positive_weekly" };

  if (selectedUpfrontCents !== null && selectedUpfrontCents !== undefined) {
    if (
      !isWholeCents(selectedUpfrontCents) ||
      selectedUpfrontCents <= 0 ||
      selectedUpfrontCents >= coursePriceCents
    ) {
      return { ok: false, reason: "upfront_out_of_range" };
    }
    const remainingCents = coursePriceCents - selectedUpfrontCents;
    if (remainingCents % weeklyAmountCents !== 0) {
      return { ok: false, reason: "total_mismatch" };
    }
    const selectedCount = remainingCents / weeklyAmountCents;
    if (selectedCount < 1) return { ok: false, reason: "no_weekly_instalments" };
    return {
      ok: true,
      schedule: {
        coursePriceCents,
        weeklyAmountCents,
        numberOfInstallments: selectedCount,
        upfrontPaymentCents: selectedUpfrontCents,
        finalPaymentCents: 0,
        currency: "AUD",
        paymentFrequency: "Weekly",
        upfrontCollection: "within-24-hours-of-signup",
      },
    };
  }

  const numberOfInstallments = Math.floor(coursePriceCents / weeklyAmountCents);
  if (numberOfInstallments < 1) {
    return { ok: false, reason: "no_weekly_instalments" };
  }

  const instalmentTotal = numberOfInstallments * weeklyAmountCents;
  const remainderCents = coursePriceCents - instalmentTotal;
  if (remainderCents < 0 || remainderCents >= weeklyAmountCents) {
    return {
      ok: false,
      reason: remainder === "final" ? "final_out_of_range" : "upfront_out_of_range",
    };
  }

  const upfrontPaymentCents = remainder === "final" ? 0 : remainderCents;
  const finalPaymentCents = remainder === "final" ? remainderCents : 0;
  if (
    upfrontPaymentCents + instalmentTotal + finalPaymentCents !==
    coursePriceCents
  ) {
    return { ok: false, reason: "total_mismatch" };
  }

  return {
    ok: true,
    schedule: {
      coursePriceCents,
      weeklyAmountCents,
      numberOfInstallments,
      upfrontPaymentCents,
      finalPaymentCents,
      currency: "AUD",
      paymentFrequency: "Weekly",
      upfrontCollection:
        upfrontPaymentCents === 0 ? "none" : "within-24-hours-of-signup",
    },
  };
}
