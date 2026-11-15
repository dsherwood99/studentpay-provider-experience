/**
 * Live Academy Australia enrolment stays closed.
 *
 * These checks are source facts. An environment variable cannot clear them.
 * Submission can be considered only after the blockers are removed in code
 * and a separate approval is recorded.
 */
export const AU_ENROLMENT_SUBMISSIONS_ENABLED = false;

export const academyAuEnrolmentBlockers = [
  {
    code: "agreement_not_approved",
    summary:
      "The Academy Australia student agreement is the demo wording ACADEMYAU-DEMO-2026-08-22-v3. It is not approved for a binding enrolment.",
  },
  {
    code: "course_belongs_to_bela",
    summary:
      "Bridal Freelancer Bundle is a verified Bela production course. It is not an Academy Australia course.",
  },
  {
    code: "provider_not_allowlisted",
    summary:
      "Public Australian enrolment accepts BELA and CAREERS. ACADEMYAU is not on that allowlist.",
  },
  {
    code: "submission_not_approved",
    summary:
      "Live submission stays off until the checks above pass and a separate approval is recorded.",
  },
] as const;

export type AcademyAuEnrolmentBlocker =
  (typeof academyAuEnrolmentBlockers)[number]["code"];

export function academyAuEnrolmentReady(): boolean {
  return AU_ENROLMENT_SUBMISSIONS_ENABLED;
}
