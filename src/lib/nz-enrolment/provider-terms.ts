import { createHash } from "node:crypto";

/**
 * Generic provider-terms skeleton.
 *
 * Versioned placeholders only. This module does not write legal prose, does
 * not render checkout, and does not run payment jobs. `runtimeWired` stays
 * false until the NZ Salesforce package consumes the same settings.
 */

export const AGREEMENT_ACTIVATION_PERMITTED = false as const;
export const CLAUSE_TEMPLATE_VERSION = "nz-skeleton-2026-09-23-v2" as const;

export type JurisdictionCode = "AU" | "NZ";

/** "arrears_added_to_end" is not yet a Salesforce attempt-type picklist value. */
export type CatchUpChoice =
  | "unset"
  | "catch_up_collection"
  | "arrears_added_to_end";

export type FailedPaymentFeeCollection = "unset" | "end_of_plan";
export type LateFeeAssessment = "unset" | "last_business_day_of_month";

export type PayerTreatmentSettings = {
  retryEnabled: boolean | null;
  retryDelayDays: number | null;
  catchUpTreatment: CatchUpChoice;
  failedPaymentFeeEnabled: boolean;
  failedPaymentFeeAmountCents: number | null;
  failedPaymentFeeCollection: FailedPaymentFeeCollection;
  lateFeeEnabled: boolean;
  lateFeeAmountCents: number | null;
  /** Eligibility is strictly greater than this many days. 60 means 61 qualifies. */
  lateFeeTriggerDays: number | null;
  lateFeeAssessment: LateFeeAssessment;
  collectionsAuthority: "unset" | "authorised" | "not_authorised";
  courseAccessSuspension: "unset" | "provider_controlled";
};

export type EnrolmentPolicy = {
  coolingOffDays: number | null;
  afterCoolingOff:
    | "unset"
    | "remaining_fee_payable_subject_to_provider_terms_and_law";
  courseAccess: "unset" | "two_years";
  kit: "unresolved";
};

export type ProviderCommercialSchedule = {
  establishmentFeeCents: number | null;
  establishmentBasis: "none" | "per_activated_payment_plan";
  monthlyAccountFeeCents: number | null;
  monthlyAccountBasis: "none" | "per_activated_account_month";
  transactionFixedCents: number | null;
  transactionPercent: number | null;
  chargingAuthorised: false;
};

export type CoursePriceAuthority = {
  courseCode: string;
  courseName: string;
  courseFeeCents: number;
  upfrontCents: number;
  financedCents: number;
  frequency: string;
  regularInstalmentCents: number;
  instalmentCount: number;
  residualCents: number | null;
  payInFullEnabled: boolean;
};

export type ProviderTermsInput = {
  providerCode: string;
  jurisdiction: JurisdictionCode;
  tradingName: string;
  legalName: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  privacyUrl: string | null;
  providerTermsUrl: string | null;
  effectiveDate: string | null;
  course: CoursePriceAuthority;
  enrolment: EnrolmentPolicy;
  payer: PayerTreatmentSettings;
  commercial: ProviderCommercialSchedule;
  /** This repository does not enforce payer treatment. */
  runtimeWired: false;
};

export type DraftAgreement = {
  status: "DRAFT_NOT_ACTIVE";
  activationPermitted: false;
  availableForStudentAcceptance: false;
  salesforceStatus: "DoNotCreate";
  jurisdiction: JurisdictionCode;
  providerCode: string;
  version: typeof CLAUSE_TEMPLATE_VERSION;
  clauseTemplateVersion: typeof CLAUSE_TEMPLATE_VERSION;
  agreementKey: string;
  title: string;
  html: string;
  contentHash: string;
  unresolved: string[];
  payerFeeClauses: readonly string[];
  auStatutoryWordingIncluded: false;
};

export type SealedAgreementSnapshot = {
  contentHash: string;
  html: string;
  version: string;
  agreementKey: string;
  providerCode: string;
  sealedAt: string;
};

export function inactiveEnrolmentPolicy(): EnrolmentPolicy {
  return {
    coolingOffDays: null,
    afterCoolingOff: "unset",
    courseAccess: "unset",
    kit: "unresolved",
  };
}

export function inactivePayerTreatment(): PayerTreatmentSettings {
  return {
    retryEnabled: null,
    retryDelayDays: null,
    catchUpTreatment: "unset",
    failedPaymentFeeEnabled: false,
    failedPaymentFeeAmountCents: null,
    failedPaymentFeeCollection: "unset",
    lateFeeEnabled: false,
    lateFeeAmountCents: null,
    lateFeeTriggerDays: null,
    lateFeeAssessment: "unset",
    collectionsAuthority: "unset",
    courseAccessSuspension: "unset",
  };
}

export function inactiveCommercialSchedule(): ProviderCommercialSchedule {
  return {
    establishmentFeeCents: null,
    establishmentBasis: "none",
    monthlyAccountFeeCents: null,
    monthlyAccountBasis: "none",
    transactionFixedCents: null,
    transactionPercent: null,
    chargingAuthorised: false,
  };
}

export function payerFeeClauses(
  payer: PayerTreatmentSettings,
): readonly string[] {
  const clauses: string[] = [];
  if (payer.failedPaymentFeeEnabled) clauses.push("FAILED_PAYMENT_FEE");
  if (payer.lateFeeEnabled) clauses.push("LATE_FEE");
  return clauses;
}

export function planMathsHold(course: CoursePriceAuthority): boolean {
  const residual = course.residualCents ?? 0;
  return (
    course.upfrontCents +
      course.instalmentCount * course.regularInstalmentCents +
      residual ===
      course.courseFeeCents &&
    course.financedCents === course.courseFeeCents - course.upfrontCents
  );
}

/**
 * Specification only. Not called by checkout, confirm, or a scheduler.
 * A provider with retry disabled or no delay does not receive a retry date.
 */
export function specifiedRetryDate(input: {
  retryEnabled: boolean | null;
  retryDelayDays: number | null;
  failedOnIsoDate: string;
}): string | null {
  if (input.retryEnabled !== true || input.retryDelayDays === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.failedOnIsoDate)) return null;
  const [year, month, day] = input.failedOnIsoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + input.retryDelayDays);
  return date.toISOString().slice(0, 10);
}

/** One ledger key per qualifying failure id. Replays collapse. */
export function specifiedFailedPaymentFeeKeys(
  events: readonly { failureId: string; qualifyingFailure: boolean }[],
): string[] {
  const keys = new Set<string>();
  for (const event of events) {
    if (!event.qualifyingFailure || !event.failureId) continue;
    keys.add(`failed-payment-fee:${event.failureId}`);
  }
  return [...keys];
}

/**
 * Specification only. Threshold is exclusive: overdueDays must be greater
 * than lateFeeTriggerDays. This is not the monthly Salesforce job.
 */
export function specifiedLateFeeApplies(input: {
  enabled: boolean;
  overdueDays: number;
  triggerDays: number;
  overdueBalanceCents: number;
  alreadyAssessedThisPeriod: boolean;
  planOpen: boolean;
}): boolean {
  if (!input.enabled || !input.planOpen) return false;
  if (input.alreadyAssessedThisPeriod) return false;
  if (input.overdueBalanceCents <= 0) return false;
  return input.overdueDays > input.triggerDays;
}

export function specifiedCatchUpCreatesAutomaticCollection(
  choice: CatchUpChoice,
): boolean {
  return choice === "catch_up_collection";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function money(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

function partyLine(input: ProviderTermsInput): string {
  if (input.legalName && input.legalName !== input.tradingName) {
    return `${input.legalName} trading as ${input.tradingName}`;
  }
  if (input.legalName) return input.legalName;
  return input.tradingName;
}

function unresolvedFor(input: ProviderTermsInput): string[] {
  const items = [
    "NZ_LEGAL_REVIEW",
    "PROVIDER_APPROVAL",
    "PART_A_LEGAL_WORDING",
  ];
  if (!input.legalName) items.push("LEGAL_NAME");
  if (!input.effectiveDate) items.push("EFFECTIVE_DATE");
  if (input.enrolment.kit === "unresolved") items.push("KIT");
  if (input.enrolment.coolingOffDays === null) items.push("COOLING_OFF");
  if (input.enrolment.afterCoolingOff === "unset") items.push("AFTER_COOLING_OFF");
  if (input.enrolment.courseAccess === "unset") items.push("COURSE_ACCESS");
  if (input.payer.retryEnabled === null) items.push("RETRY_TREATMENT");
  if (input.payer.catchUpTreatment === "unset") items.push("CATCH_UP_TREATMENT");
  if (input.payer.catchUpTreatment === "arrears_added_to_end") {
    items.push("CATCH_UP_VALUE_NOT_IN_SALESFORCE_PICKLIST");
  }
  if (!input.payer.failedPaymentFeeEnabled) items.push("FAILED_PAYMENT_FEE");
  if (!input.payer.lateFeeEnabled) items.push("LATE_FEE");
  if (input.payer.collectionsAuthority === "unset") items.push("COLLECTIONS_AUTHORITY");
  if (input.payer.courseAccessSuspension === "unset") {
    items.push("COURSE_ACCESS_SUSPENSION");
  }
  const operational =
    input.payer.retryEnabled === true ||
    input.payer.catchUpTreatment !== "unset" ||
    payerFeeClauses(input.payer).length > 0 ||
    input.payer.collectionsAuthority === "authorised";
  if (!input.runtimeWired && operational) items.push("RUNTIME_NOT_WIRED");
  if (!planMathsHold(input.course)) items.push("PLAN_MATHS_INVALID");
  if (input.jurisdiction === "NZ") items.push("AU_DRAFT_NOT_APPROVED_FOR_NZ");
  return items;
}

function enrolmentLines(enrolment: EnrolmentPolicy): string {
  const cooling =
    enrolment.coolingOffDays === null
      ? "UNSET"
      : `${enrolment.coolingOffDays} days`;
  const after =
    enrolment.afterCoolingOff === "unset"
      ? "UNSET"
      : "Remaining course fee continues to be payable, subject to the provider's approved cancellation and refund terms and applicable law";
  const access = enrolment.courseAccess === "two_years" ? "2 years" : "UNSET";
  return [
    `<li><strong>Cooling-off:</strong> ${escapeHtml(cooling)}</li>`,
    `<li><strong>After cooling-off:</strong> ${escapeHtml(after)}</li>`,
    `<li><strong>Course access:</strong> ${escapeHtml(access)}</li>`,
    `<li><strong>Kit:</strong> {{UNRESOLVED:KIT}}</li>`,
  ].join("\n");
}

function payerLines(payer: PayerTreatmentSettings): string {
  const retry =
    payer.retryEnabled === null
      ? "UNSET"
      : payer.retryEnabled
        ? `Yes. Re-attempt an eligible failed payment after ${payer.retryDelayDays ?? "UNSET"} days`
        : "No";
  const catchUp =
    payer.catchUpTreatment === "arrears_added_to_end"
      ? "No automatic catch-up. Add unresolved arrears to the end of the payment plan. Principal stays payable and auditable"
      : payer.catchUpTreatment === "catch_up_collection"
        ? "Catch-up collection"
        : "UNSET";
  const failed = payer.failedPaymentFeeEnabled
    ? `${payer.failedPaymentFeeAmountCents === null ? "UNSET" : money(payer.failedPaymentFeeAmountCents)} per failed payment, collected at the end of the payment plan`
    : "Off";
  const late = payer.lateFeeEnabled
    ? `${payer.lateFeeAmountCents === null ? "UNSET" : money(payer.lateFeeAmountCents)} when the account is more than ${payer.lateFeeTriggerDays ?? "UNSET"} days in arrears, assessed on the last business day of the month`
    : "Off";
  const collections =
    payer.collectionsAuthority === "authorised"
      ? "StudentPay may facilitate external collection where the provider's enrolment terms and applicable law permit it. This does not transfer the debt and does not refer an account by itself"
      : payer.collectionsAuthority === "not_authorised"
        ? "Not authorised"
        : "UNSET";
  const suspension =
    payer.courseAccessSuspension === "provider_controlled"
      ? "Provider-controlled. StudentPay does not automatically suspend course access"
      : "UNSET";
  return [
    `<li><strong>Retry:</strong> ${escapeHtml(retry)} — AGREEMENT_ONLY_CONFIGURATION_NOT_SAFE</li>`,
    `<li><strong>Catch-up:</strong> ${escapeHtml(catchUp)} — AGREEMENT_ONLY_CONFIGURATION_NOT_SAFE</li>`,
    `<li><strong>Failed-payment fee:</strong> ${escapeHtml(failed)} — AGREEMENT_ONLY_CONFIGURATION_NOT_SAFE</li>`,
    `<li><strong>Late fee:</strong> ${escapeHtml(late)} — AGREEMENT_ONLY_CONFIGURATION_NOT_SAFE</li>`,
    `<li><strong>External collections:</strong> ${escapeHtml(collections)} — AGREEMENT_ONLY_CONFIGURATION_NOT_SAFE</li>`,
    `<li><strong>Course-access suspension:</strong> ${escapeHtml(suspension)} — AGREEMENT_ONLY_CONFIGURATION_NOT_SAFE</li>`,
  ].join("\n");
}

export function composeProviderTermsSkeleton(
  input: ProviderTermsInput,
): DraftAgreement {
  const unresolved = unresolvedFor(input);
  const fees = payerFeeClauses(input.payer);
  const course = input.course;
  const title = `${input.tradingName} — Provider Student Payment Plan Terms (skeleton)`;
  const agreementKey = `${input.providerCode}|${input.jurisdiction}|Provider_Student_Agreement|${CLAUSE_TEMPLATE_VERSION}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
<article data-agreement-status="DRAFT_NOT_ACTIVE" data-student-acceptance="false" data-clause-template="${CLAUSE_TEMPLATE_VERSION}">
<h1>${escapeHtml(title)}</h1>
<p><strong>DRAFT. NOT ACTIVE. REQUIRES PROVIDER / LEGAL APPROVAL.</strong></p>
<p>NZ LEGAL / PROVIDER APPROVAL REQUIRED. This document fills version ${CLAUSE_TEMPLATE_VERSION}. It is a structured decision record, not approved legal wording, not legal advice, and not available for student acceptance. Australian statutory wording is not included.</p>
<p>Agreement key ${escapeHtml(agreementKey)}. Provider code ${escapeHtml(input.providerCode)}. Jurisdiction ${escapeHtml(input.jurisdiction)}.</p>
<p>Parties: ${escapeHtml(partyLine(input))}.</p>
<p>Effective date: ${escapeHtml(input.effectiveDate ?? "{{UNRESOLVED:EFFECTIVE_DATE}}")}.</p>
<p>Support: ${escapeHtml(input.supportEmail ?? "{{UNRESOLVED:SUPPORT_EMAIL}}")} / ${escapeHtml(input.supportPhone ?? "{{UNRESOLVED:SUPPORT_PHONE}}")}.</p>
<p>Privacy URL: ${escapeHtml(input.privacyUrl ?? "{{UNRESOLVED:PRIVACY_URL}}")}.</p>
<h2>Part A — Enrolment policy pending legal wording</h2>
<p>NZ LEGAL / PROVIDER APPROVAL REQUIRED.</p>
<ul>
${enrolmentLines(input.enrolment)}
</ul>
<h2>Part B — Payment-plan policy pending legal wording and runtime wiring</h2>
<h3>Course price authority</h3>
<ul>
<li>Course: ${escapeHtml(course.courseName)} (${escapeHtml(course.courseCode)})</li>
<li>Course fee: ${money(course.courseFeeCents)}</li>
<li>Payment-plan upfront: ${money(course.upfrontCents)}</li>
<li>Amount financed: ${money(course.financedCents)}</li>
<li>Frequency: ${escapeHtml(course.frequency)}</li>
<li>Regular instalment: ${money(course.regularInstalmentCents)}</li>
<li>Recurring instalments: ${course.instalmentCount}</li>
<li>Residual: ${course.residualCents === null ? "None" : money(course.residualCents)}</li>
<li>Pay in Full enabled: ${course.payInFullEnabled ? "Yes" : "No"}</li>
</ul>
<p>These figures are course-price data. They are not an activated legal clause.</p>
<h3>Payer treatment — draft, not activated</h3>
<ul>
${payerLines(input.payer)}
</ul>
<p>Provider-to-StudentPay commercial fees are omitted from this student-facing skeleton. They are not payer charges. Establishment fees and monthly account fees are not shown here.</p>
<p>Unresolved: ${escapeHtml(unresolved.join(", "))}.</p>
<h2>Separate StudentPay documents</h2>
<p>Payment Plan Agreement, Direct Debit Service Agreement, and StudentPay privacy terms are separate documents. They are not generated by this skeleton.</p>
</article>
</body>
</html>
`;
  const contentHash = createHash("sha256").update(html).digest("hex");
  return {
    status: "DRAFT_NOT_ACTIVE",
    activationPermitted: AGREEMENT_ACTIVATION_PERMITTED,
    availableForStudentAcceptance: false,
    salesforceStatus: "DoNotCreate",
    jurisdiction: input.jurisdiction,
    providerCode: input.providerCode,
    version: CLAUSE_TEMPLATE_VERSION,
    clauseTemplateVersion: CLAUSE_TEMPLATE_VERSION,
    agreementKey,
    title,
    html,
    contentHash,
    unresolved,
    payerFeeClauses: fees,
    auStatutoryWordingIncluded: false,
  };
}

export function sealDraftSnapshot(
  draft: DraftAgreement,
  sealedAt: string,
): SealedAgreementSnapshot {
  if (draft.status !== "DRAFT_NOT_ACTIVE" || draft.activationPermitted) {
    throw new Error("DRAFT_NOT_ACCEPTABLE");
  }
  return {
    contentHash: draft.contentHash,
    html: draft.html,
    version: draft.version,
    agreementKey: draft.agreementKey,
    providerCode: draft.providerCode,
    sealedAt,
  };
}

/** Historical reads return the sealed snapshot. Current settings are ignored. */
export function viewHistoricalAgreement(
  stored: SealedAgreementSnapshot,
  current: ProviderTermsInput,
): SealedAgreementSnapshot {
  void current.providerCode;
  return stored;
}
