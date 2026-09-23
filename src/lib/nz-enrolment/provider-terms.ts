import { createHash } from "node:crypto";

/**
 * Generic provider-terms skeleton.
 *
 * This module does not render checkout, does not call Salesforce, and cannot
 * activate an agreement. Provider-specific checkout behaviour must not branch
 * on provider code here.
 */

export const AGREEMENT_ACTIVATION_PERMITTED = false as const;

export type JurisdictionCode = "AU" | "NZ";

/** Values already present in Salesforce. "arrears_added_to_end" is not a stored picklist. */
export type CatchUpChoice =
  | "unset"
  | "catch_up_collection"
  | "arrears_added_to_end";

export type PayerTreatmentSettings = {
  retryEnabled: boolean | null;
  retryDelayDays: number | null;
  catchUpTreatment: CatchUpChoice;
  failedPaymentFeeEnabled: boolean;
  failedPaymentFeeAmountCents: number | null;
  lateFeeEnabled: boolean;
  lateFeeAmountCents: number | null;
  lateFeeTriggerDays: number | null;
  collectionsAuthority: "unset" | "authorised" | "not_authorised";
  courseAccessSuspensionInArrears: "unset" | "yes" | "no";
};

export type ProviderCommercialSchedule = {
  establishmentFeeCents: number | null;
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
  payer: PayerTreatmentSettings;
  commercial: ProviderCommercialSchedule;
  /** Hosted checkout does not enforce payer treatment from these settings. */
  runtimeWired: false;
};

export type DraftAgreement = {
  status: "DRAFT_NOT_ACTIVE";
  activationPermitted: false;
  availableForStudentAcceptance: false;
  salesforceStatus: "DoNotCreate";
  jurisdiction: JurisdictionCode;
  providerCode: string;
  version: "skeleton-2026-09-23";
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
  providerCode: string;
  sealedAt: string;
};

export function inactivePayerTreatment(): PayerTreatmentSettings {
  return {
    retryEnabled: null,
    retryDelayDays: null,
    catchUpTreatment: "unset",
    failedPaymentFeeEnabled: false,
    failedPaymentFeeAmountCents: null,
    lateFeeEnabled: false,
    lateFeeAmountCents: null,
    lateFeeTriggerDays: null,
    collectionsAuthority: "unset",
    courseAccessSuspensionInArrears: "unset",
  };
}

export function inactiveCommercialSchedule(): ProviderCommercialSchedule {
  return {
    establishmentFeeCents: null,
    transactionFixedCents: null,
    transactionPercent: null,
    chargingAuthorised: false,
  };
}

export function payerFeeClauses(
  payer: PayerTreatmentSettings,
): readonly string[] {
  const clauses: string[] = [];
  if (payer.failedPaymentFeeEnabled) {
    clauses.push("FAILED_PAYMENT_FEE");
  }
  if (payer.lateFeeEnabled) {
    clauses.push("LATE_FEE");
  }
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

function settingLine(label: string, value: string, safe: boolean): string {
  const gate = safe
    ? "RECORDED_ONLY"
    : "AGREEMENT_ONLY_CONFIGURATION_NOT_SAFE";
  return `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)} — ${gate}</li>`;
}

function unresolvedFor(input: ProviderTermsInput): string[] {
  const items = [
    "NZ_LEGAL_REVIEW",
    "PROVIDER_APPROVAL",
    "PART_A_ENROLMENT_TERMS",
  ];
  if (!input.legalName) items.push("LEGAL_NAME");
  if (!input.providerTermsUrl) items.push("PROVIDER_TERMS_URL");
  if (!input.effectiveDate) items.push("EFFECTIVE_DATE");
  if (input.payer.retryEnabled === null) items.push("RETRY_TREATMENT");
  if (input.payer.catchUpTreatment === "unset") items.push("CATCH_UP_TREATMENT");
  if (!input.payer.failedPaymentFeeEnabled) items.push("FAILED_PAYMENT_FEE");
  if (!input.payer.lateFeeEnabled) items.push("LATE_FEE");
  if (input.payer.collectionsAuthority === "unset") {
    items.push("COLLECTIONS_AUTHORITY");
  }
  if (input.payer.courseAccessSuspensionInArrears === "unset") {
    items.push("COURSE_ACCESS_SUSPENSION");
  }
  if (input.payer.catchUpTreatment === "arrears_added_to_end") {
    items.push("CATCH_UP_VALUE_NOT_IN_SALESFORCE_PICKLIST");
  }
  if (!input.runtimeWired && payerFeeClauses(input.payer).length > 0) {
    items.push("RUNTIME_NOT_WIRED");
  }
  if (!planMathsHold(input.course)) items.push("PLAN_MATHS_INVALID");
  if (input.jurisdiction === "NZ") items.push("AU_DRAFT_NOT_APPROVED_FOR_NZ");
  return items;
}

function payerManifest(payer: PayerTreatmentSettings): string {
  const retry =
    payer.retryEnabled === null
      ? "UNSET"
      : payer.retryEnabled
        ? `CONFIGURED_YES delay_days=${payer.retryDelayDays ?? "UNSET"}`
        : "CONFIGURED_NO";
  const failed = payer.failedPaymentFeeEnabled
    ? `CONFIGURED amount=${
        payer.failedPaymentFeeAmountCents === null
          ? "UNSET"
          : money(payer.failedPaymentFeeAmountCents)
      }`
    : "OFF";
  const late = payer.lateFeeEnabled
    ? `CONFIGURED amount=${
        payer.lateFeeAmountCents === null
          ? "UNSET"
          : money(payer.lateFeeAmountCents)
      } trigger_days=${payer.lateFeeTriggerDays ?? "UNSET"}`
    : "OFF";
  return [
    settingLine("Retry", retry, false),
    settingLine("Catch-up", payer.catchUpTreatment, false),
    settingLine("Payer failed-payment fee", failed, false),
    settingLine("Payer late fee", late, false),
    settingLine("Collections authority", payer.collectionsAuthority, false),
    settingLine(
      "Course-access suspension in arrears",
      payer.courseAccessSuspensionInArrears,
      false,
    ),
  ].join("\n");
}

export function composeProviderTermsSkeleton(
  input: ProviderTermsInput,
): DraftAgreement {
  const unresolved = unresolvedFor(input);
  const fees = payerFeeClauses(input.payer);
  const course = input.course;
  const title = `${input.tradingName} — Provider Student Payment Plan Terms (skeleton)`;
  const legalName = input.legalName ?? "{{UNRESOLVED:LEGAL_NAME}}";
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
<article data-agreement-status="DRAFT_NOT_ACTIVE" data-student-acceptance="false">
<h1>${escapeHtml(title)}</h1>
<p><strong>DRAFT. NOT ACTIVE. REQUIRES PROVIDER / LEGAL APPROVAL.</strong></p>
<p>This skeleton is not legal advice, not an approved agreement, and is not available for student acceptance. Australian draft wording is not copied into this document.</p>
<p>Provider code ${escapeHtml(input.providerCode)}. Jurisdiction ${escapeHtml(input.jurisdiction)}. Version skeleton-2026-09-23.</p>
<h2>Part A — Provider enrolment and course terms</h2>
<p>{{UNRESOLVED:PART_A_ENROLMENT_TERMS}}</p>
<p>Cooling-off, cancellation, withdrawal, refund, course access, kit treatment, and self-enrolment rules stay with the provider. Conflicting published statements are not resolved here.</p>
<h2>Part B — Provider student payment-plan terms</h2>
<p>Trading name: ${escapeHtml(input.tradingName)}. Legal name: ${escapeHtml(legalName)}.</p>
<p>Effective date: ${escapeHtml(input.effectiveDate ?? "{{UNRESOLVED:EFFECTIVE_DATE}}")}.</p>
<p>Provider terms URL: ${escapeHtml(input.providerTermsUrl ?? "{{UNRESOLVED:PROVIDER_TERMS_URL}}")}.</p>
<p>Support: ${escapeHtml(input.supportEmail ?? "{{UNRESOLVED:SUPPORT_EMAIL}}")} / ${escapeHtml(input.supportPhone ?? "{{UNRESOLVED:SUPPORT_PHONE}}")}.</p>
<p>Privacy URL: ${escapeHtml(input.privacyUrl ?? "{{UNRESOLVED:PRIVACY_URL}}")}.</p>
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
<h3>Payer treatment — not activated</h3>
<ul>
${payerManifest(input.payer)}
</ul>
<p>Provider-to-StudentPay commercial fees are omitted from this student-facing skeleton. They are not payer charges.</p>
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
    version: "skeleton-2026-09-23",
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
    providerCode: draft.providerCode,
    sealedAt,
  };
}

/** Historical reads return the sealed snapshot. Current settings are ignored. */
export function viewHistoricalAgreement(
  stored: SealedAgreementSnapshot,
  current: ProviderTermsInput,
): SealedAgreementSnapshot {
  // Current settings are accepted so callers can show they were ignored.
  void current.providerCode;
  return stored;
}
