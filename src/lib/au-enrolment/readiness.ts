/**
 * Live Academy Australia enrolment stays closed.
 *
 * These checks are source facts. An environment variable cannot clear them.
 * Submission can be considered only after the blockers are removed in code
 * and a separate approval is recorded.
 */
export const AU_ENROLMENT_SUBMISSIONS_ENABLED = false;

export const ACADEMYAU_AGREEMENT_DRAFT_VERSION = "ACADEMYAU-DRAFT-2026-11-16-v1";

export const academyAuEnrolmentBlockers = [
  {
    code: "agreement_not_approved",
    summary:
      "The agreement stored for Academy Australia is the demo wording ACADEMYAU-DEMO-2026-08-22-v3. Replacement draft ACADEMYAU-DRAFT-2026-11-16-v1 is inactive and cannot be accepted.",
  },
  {
    code: "settlement_not_verified",
    summary:
      "Pinch production settlement for ACADEMYAU has not been confirmed for this offering.",
  },
  {
    code: "provider_not_allowlisted",
    summary:
      "Public Australian enrolment accepts BELA and CAREERS. ACADEMYAU is not on that allowlist.",
  },
  {
    code: "submission_not_approved",
    summary:
      "Live submission stays off until the agreement, settlement and allowlist gates pass and a separate approval is recorded.",
  },
] as const;

export type AcademyAuEnrolmentBlocker =
  (typeof academyAuEnrolmentBlockers)[number]["code"];

export function academyAuEnrolmentReady(): boolean {
  return AU_ENROLMENT_SUBMISSIONS_ENABLED;
}
