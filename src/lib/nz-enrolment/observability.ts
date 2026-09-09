type NzEnrolmentEvent =
  | "checkout_started"
  | "student_details_completed"
  | "plan_selected"
  | "checkout_created"
  | "dda_started"
  | "dda_completed"
  | "confirm_started"
  | "checkout_confirmed"
  | "checkout_failed";

export function logNzEnrolmentEvent(
  event: NzEnrolmentEvent,
  details: Record<string, unknown> = {},
): void {
  const safe = {
    event,
    product: "enrolment_checkout",
    market: "NZ",
    ...details,
  };
  console.info(JSON.stringify(safe));
}
