import type { PaymentFrequency } from "@/types/course";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatPaymentFrequency(
  frequency: PaymentFrequency,
): string {
  if (frequency === "fortnightly") {
    return "fortnight";
  }

  if (frequency === "monthly") {
    return "month";
  }

  return "week";
}

export function futureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function createId(prefix = "PX"): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ageFromDob(dob: string): number | null {
  if (!dob) {
    return null;
  }

  const birth = new Date(`${dob}T00:00:00.000Z`);

  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const passed =
    now.getUTCMonth() > birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() &&
      now.getUTCDate() >= birth.getUTCDate());

  if (!passed) {
    age -= 1;
  }

  return age;
}
