/**
 * Academy Australia enrolment is open on the Academy host.
 * The catalogue checkout remains closed. An environment variable cannot
 * move this checkout onto another provider host.
 */
export const AU_ENROLMENT_SUBMISSIONS_ENABLED = true;

export const ACADEMYAU_AGREEMENT_PRODUCTION_VERSION = "ACADEMYAU-AU-2026-11-16-v1";

export const academyAuEnrolmentBlockers: readonly {
  code: string;
  summary: string;
}[] = [];

export type AcademyAuEnrolmentBlocker = string;

export function academyAuEnrolmentReady(): boolean {
  return AU_ENROLMENT_SUBMISSIONS_ENABLED;
}
