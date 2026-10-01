import { formatNzdFromCents } from "./plan-math.ts";
import type { NzTaxPresentation } from "./types.ts";

export const NZ_GST_RATE_BASIS_POINTS = 1500;

export type GstInclusiveBreakdown = {
  grossCents: number;
  exclusiveCents: number;
  gstCents: number;
};

export function isGstInclusiveBreakdown(
  tax: NzTaxPresentation | undefined | null,
): tax is NzTaxPresentation {
  return tax?.mode === "gst_inclusive_breakdown";
}

/**
 * Derive an ex-GST / GST split from an authoritative GST-inclusive amount.
 * Gross remains the source of truth. exclusiveCents + gstCents === grossCents.
 */
export function gstInclusiveBreakdown(
  grossCents: number,
  rateBasisPoints: number = NZ_GST_RATE_BASIS_POINTS,
): GstInclusiveBreakdown {
  if (!Number.isInteger(grossCents) || grossCents < 0) {
    throw new Error("GST-inclusive amount must be integer cents greater than or equal to zero.");
  }
  if (!Number.isInteger(rateBasisPoints) || rateBasisPoints <= 0) {
    throw new Error("GST rate must be integer basis points greater than zero.");
  }

  const gstCents = Math.round(
    (grossCents * rateBasisPoints) / (10_000 + rateBasisPoints),
  );
  const exclusiveCents = grossCents - gstCents;
  return { grossCents, exclusiveCents, gstCents };
}

export function gstInclusiveDisplayRows(
  grossCents: number,
  tax: NzTaxPresentation | undefined | null,
): { label: string; value: string }[] | null {
  if (!isGstInclusiveBreakdown(tax)) {
    return null;
  }
  const breakdown = gstInclusiveBreakdown(grossCents, tax.rateBasisPoints);
  return [
    {
      label: `Course fee excl. ${tax.label}`,
      value: formatNzdFromCents(breakdown.exclusiveCents),
    },
    {
      label: tax.label,
      value: formatNzdFromCents(breakdown.gstCents),
    },
    {
      label: `Total incl. ${tax.label}`,
      value: formatNzdFromCents(breakdown.grossCents),
    },
  ];
}
