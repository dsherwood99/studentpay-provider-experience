/**
 * Live Academy Australia enrolment stays closed.
 *
 * These checks are source facts. An environment variable cannot clear them.
 * Submission can be considered only after the blockers are removed in code
 * and a separate approval is recorded.
 */
export const AU_ENROLMENT_SUBMISSIONS_ENABLED = false;

export const ACADEMYAU_AGREEMENT_PRODUCTION_VERSION = "ACADEMYAU-AU-2026-11-16-v1";

export const academyAuEnrolmentBlockers = [
  {
    code: "agreement_not_activated",
    summary:
      "Academy Australia Student Agreement ACADEMYAU-AU-2026-11-16-v1 is prepared from the approved terms. It is not activated, and the stored demo agreement cannot be accepted.",
  },
  {
    code: "provider_config_not_linked",
    summary:
      "Academy Australia account 001Mp00000tiKOOIA2 is linked. Provider Integration Config a2BMp000002RFRdMAO remains inactive.",
  },
  {
    code: "provider_not_allowlisted",
    summary:
      "Public Australian enrolment accepts BELA and CAREERS. ACADEMYAU is not on that allowlist.",
  },
  {
    code: "submission_not_approved",
    summary:
      "Live submission stays off until the prepared agreement is activated and a separate submission approval is recorded.",
  },
] as const;

export type AcademyAuEnrolmentBlocker =
  (typeof academyAuEnrolmentBlockers)[number]["code"];

export function academyAuEnrolmentReady(): boolean {
  return AU_ENROLMENT_SUBMISSIONS_ENABLED;
}
