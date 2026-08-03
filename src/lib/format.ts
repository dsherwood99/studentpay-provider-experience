export function formatCurrency(
  value: number,
  maximumFractionDigits = 0,
): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits,
  }).format(value);
}

export function formatPaymentFrequency(
  frequency: "weekly" | "fortnightly" | "monthly",
): string {
  if (frequency === "weekly") {
    return "week";
  }

  if (frequency === "fortnightly") {
    return "fortnight";
  }

  return "month";
}
