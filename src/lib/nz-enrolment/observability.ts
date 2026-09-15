type NzEnrolmentEvent =
  | "checkout_started"
  | "student_details_completed"
  | "plan_selected"
  | "checkout_created"
  | "dda_started"
  | "dda_completed"
  | "confirm_started"
  | "checkout_confirmed"
  | "checkout_failed"
  | "pay_in_full_selected"
  | "pay_in_full_payment_started"
  | "pay_in_full_payment_processing"
  | "pay_in_full_payment_failed"
  | "pay_in_full_confirmed";

const REDACTED_KEYS = new Set([
  "client_secret",
  "clientSecret",
  "cvc",
  "card_number",
  "cardNumber",
  "pan",
  "number",
]);

function redactDetails(details: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (REDACTED_KEYS.has(key)) {
      continue;
    }
    if (typeof value === "string" && /_secret_|pk_live_|sk_live_|sk_test_/.test(value)) {
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

export function logNzEnrolmentEvent(
  event: NzEnrolmentEvent,
  details: Record<string, unknown> = {},
): void {
  const safe = {
    event,
    product: "enrolment_checkout",
    market: "NZ",
    ...redactDetails(details),
  };
  console.info(JSON.stringify(safe));
}
