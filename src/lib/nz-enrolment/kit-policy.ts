export const KIT_NOT_INCLUDED_DISCLOSURE =
  "Payment plan covers course tuition only. Kit not included in this payment plan.";

export function kitDisclosureForPolicy(
  policy: string | null | undefined,
): string | null {
  if (policy === "KIT_NOT_INCLUDED") return KIT_NOT_INCLUDED_DISCLOSURE;
  return null;
}
