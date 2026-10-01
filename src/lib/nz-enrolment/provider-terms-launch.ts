import { createHash } from "node:crypto";
import {
  KIT_NOT_INCLUDED_COPY,
  automaticExternalReferral,
  isLastCalendarDayOfMonth,
  planMathsHold,
  specifiedLateFeeApplies,
  type ProviderTermsInput,
} from "./provider-terms.ts";

/**
 * Immutable student-facing launch version.
 * The v2 skeleton composer is unchanged and stays Draft.
 * This document is the version that can be activated.
 */
export const LAUNCH_AGREEMENT_VERSION = "nz-provider-student-2026-10-01-v3" as const;

export const LAUNCH_AGREEMENT_EFFECTIVE_DATE = "2026-10-01" as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type LaunchClauseId =
  | "provider_identity"
  | "cooling_off_3_day"
  | "post_cooling_off_fee_liability"
  | "course_access_2_years"
  | "provider_controlled_suspension"
  | "kit_not_included"
  | "dynamic_course_economics"
  | "failed_payment_fee_2_50"
  | "end_of_plan_failed_fee_collection"
  | "late_fee_15"
  | "threshold_over_60_days"
  | "last_calendar_day_assessment"
  | "external_collections_authority"
  | "responsibility_split"
  | "cancellation_refund_provider_decision"
  | "studentpay_payment_privacy_terms"
  | "provider_commercial_fees_excluded";

export type LaunchAgreement = {
  status: "ACTIVE";
  activationPermitted: true;
  availableForStudentAcceptance: true;
  version: typeof LAUNCH_AGREEMENT_VERSION;
  agreementKey: string;
  title: string;
  html: string;
  text: string;
  contentHash: string;
  effectiveDate: typeof LAUNCH_AGREEMENT_EFFECTIVE_DATE;
  kitPolicy: "KIT_NOT_INCLUDED";
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function money(cents: number): string {
  const abs = Math.abs(cents);
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

function partyLine(input: ProviderTermsInput): string {
  if (input.legalName && input.legalName !== input.tradingName) {
    return `${input.legalName} trading as ${input.tradingName}`;
  }
  if (input.legalName) return input.legalName;
  return input.tradingName;
}

function formatEffectiveDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sanitiser-safe HTML. No document wrapper, no attributes, no draft banners.
 * The API republishes sha256(sanitise(html)); this string is already in that form.
 */
export function composeLaunchProviderStudentAgreement(
  input: ProviderTermsInput,
): LaunchAgreement {
  if (input.effectiveDate !== LAUNCH_AGREEMENT_EFFECTIVE_DATE) {
    throw new Error("LAUNCH_EFFECTIVE_DATE_REQUIRED");
  }
  if (input.enrolment.kit !== "KIT_NOT_INCLUDED") {
    throw new Error("LAUNCH_KIT_POLICY_REQUIRED");
  }
  if (input.payer.failedPaymentFeeCollection !== "end_of_plan") {
    throw new Error("LAUNCH_FAILED_FEE_COLLECTION_REQUIRED");
  }
  if (!input.payer.failedPaymentFeeEnabled || input.payer.failedPaymentFeeAmountCents === null) {
    throw new Error("LAUNCH_FAILED_FEE_REQUIRED");
  }
  if (!input.payer.lateFeeEnabled || input.payer.lateFeeAmountCents === null) {
    throw new Error("LAUNCH_LATE_FEE_REQUIRED");
  }
  if (input.payer.lateFeeTriggerDays === null || input.payer.lateFeeAssessment !== "last_day_of_month") {
    throw new Error("LAUNCH_LATE_FEE_ASSESSMENT_REQUIRED");
  }
  if (input.commercial.chargingAuthorised !== false) {
    throw new Error("LAUNCH_COMMERCIAL_CHARGING_FORBIDDEN");
  }

  const party = partyLine(input);
  const title = `${input.tradingName} — Provider Student Payment Plan Terms`;
  const agreementKey = `${input.providerCode}|Production|Provider_Student_Agreement|${LAUNCH_AGREEMENT_VERSION}`;
  const failedAmount = money(input.payer.failedPaymentFeeAmountCents);
  const lateAmount = money(input.payer.lateFeeAmountCents);
  const lateDays = input.payer.lateFeeTriggerDays;
  const supportEmail = input.supportEmail ?? "";
  const supportPhone = input.supportPhone ?? "";
  const privacyUrl = input.privacyUrl ?? "";

  const html = [
    "<div>",
    `<h1>${escapeHtml(title)}</h1>`,
    `<p>Version ${LAUNCH_AGREEMENT_VERSION}. Agreement key ${escapeHtml(agreementKey)}. Provider code ${escapeHtml(input.providerCode)}. Jurisdiction ${escapeHtml(input.jurisdiction)}.</p>`,
    `<p>Parties: ${escapeHtml(party)}.</p>`,
    `<p>Effective from: ${formatEffectiveDate(input.effectiveDate)} (${escapeHtml(input.effectiveDate)}).</p>`,
    `<p>Support: ${escapeHtml(supportEmail)} / ${escapeHtml(supportPhone)}.</p>`,
    `<p>Provider privacy: ${escapeHtml(privacyUrl)}.</p>`,
    "<h2>Enrolment</h2>",
    "<ul>",
    `<li><strong>Provider:</strong> ${escapeHtml(party)}</li>`,
    `<li><strong>Cooling-off:</strong> ${input.enrolment.coolingOffDays}-day cooling-off period</li>`,
    "<li><strong>After cooling-off:</strong> The remaining course fee continues to be payable, subject to the provider's approved cancellation and refund terms and applicable law.</li>",
    "<li><strong>Course access:</strong> 2 years</li>",
    "<li><strong>Course-access suspension:</strong> Provider-controlled. Suspension of course access is a Bela action. StudentPay does not automatically suspend course access.</li>",
    `<li><strong>Kit policy:</strong> KIT_NOT_INCLUDED. ${escapeHtml(KIT_NOT_INCLUDED_COPY)}</li>`,
    "</ul>",
    "<h2>Payment plan</h2>",
    "<p>The StudentPay payment plan covers the authoritative course tuition fee from the selected price version. The course fee, upfront amount, financed amount, frequency, and instalments are filled from that Active Salesforce price version when the student accepts, then sealed on that acceptance. This provider agreement does not fix a course fee.</p>",
    "<h2>Payer fees</h2>",
    "<ul>",
    `<li><strong>Failed-payment fee:</strong> ${failedAmount} per qualifying failed payment. The failed-payment fee is added as a separate payer fee. It is not Course Fee principal. It is collected at the end of the Payment Plan.</li>`,
    `<li><strong>Late fee:</strong> ${lateAmount} where the account is more than ${lateDays} days in arrears. Exactly ${lateDays} days in arrears is not eligible. The late fee is assessed on the last calendar day of each month.</li>`,
    "<li><strong>External collections:</strong> The provider authorises StudentPay to administer collections and to facilitate external collection where the provider terms and applicable law permit it. This does not automatically refer an account. It does not transfer the debt.</li>",
    "</ul>",
    "<p>A failed amount remains owing. StudentPay may administer payment processing and arrears according to the applicable payment terms and the provider's authority.</p>",
    "<p>Provider-to-StudentPay commercial fees are omitted from this student-facing agreement. They are not payer charges. Establishment fees and monthly account fees are not shown here.</p>",
    "<h2>Roles</h2>",
    "<ul>",
    `<li>The education provider is ${escapeHtml(party)}. StudentPay does not provide the course, set the provider's course fee, purchase the provider's debt, or prepay the provider.</li>`,
    "<li>StudentPay administers the payment plan and collections on the provider's behalf. That covers payment processing, payment methods, payment status, and authorised arrears administration.</li>",
    "<li>The provider decides course delivery, enrolment, withdrawal, cancellation, refund or credit, whether the course fee remains payable, and course access, including any suspension. Course cancellation and refund decisions remain provider decisions. StudentPay does not automatically suspend course access because a payment fails.</li>",
    "<li>The payer keeps a valid payment method for the schedule taken from the selected price version.</li>",
    "<li>A payment the provider receives directly is notified to StudentPay so the payment plan can be updated.</li>",
    "<li>Where the provider's course or cancellation terms and this payment-plan document differ on whether a course fee remains payable, the provider's approved terms govern, subject to applicable law.</li>",
    "</ul>",
    "<h2>Separate StudentPay documents</h2>",
    "<p>The StudentPay Payment Plan Agreement, Direct Debit Service Agreement, and StudentPay privacy terms are separate documents. They are accepted separately from this provider student agreement.</p>",
    "</div>",
  ].join("\n");

  const contentHash = createHash("sha256").update(html, "utf8").digest("hex");
  return {
    status: "ACTIVE",
    activationPermitted: true,
    availableForStudentAcceptance: true,
    version: LAUNCH_AGREEMENT_VERSION,
    agreementKey,
    title,
    html,
    text: plainText(html),
    contentHash,
    effectiveDate: LAUNCH_AGREEMENT_EFFECTIVE_DATE,
    kitPolicy: "KIT_NOT_INCLUDED",
  };
}

export function auditLaunchClauseRuntime(
  agreement: LaunchAgreement,
  input: ProviderTermsInput,
): Record<LaunchClauseId, "PASS" | "FAIL"> {
  const html = agreement.html;
  const checks: Record<LaunchClauseId, boolean> = {
    provider_identity: /Jessica Buff trading as Bela Beauty College/.test(html),
    cooling_off_3_day: /3-day cooling-off period/.test(html),
    post_cooling_off_fee_liability:
      /remaining course fee continues to be payable, subject to the provider's approved cancellation and refund terms and applicable law/.test(
        html,
      ),
    course_access_2_years: /Course access:<\/strong> 2 years/.test(html),
    provider_controlled_suspension:
      /Provider-controlled/.test(html) &&
      /Suspension of course access is a Bela action/.test(html) &&
      /StudentPay does not automatically suspend course access/.test(html),
    kit_not_included:
      html.includes("KIT_NOT_INCLUDED") &&
      html.includes(KIT_NOT_INCLUDED_COPY) &&
      !/kits are financed/i.test(html) &&
      !/finances the kit/i.test(html),
    dynamic_course_economics:
      /does not fix a course fee/.test(html) &&
      /selected price version/.test(html) &&
      !/\$2,?800/.test(html) &&
      !html.includes(money(input.course.courseFeeCents)),
    failed_payment_fee_2_50: /\$2\.50 per qualifying failed payment/.test(html),
    end_of_plan_failed_fee_collection:
      /separate payer fee/.test(html) &&
      /not Course Fee principal/.test(html) &&
      /collected at the end of the Payment Plan/.test(html),
    late_fee_15: /\$15\.00 where the account is more than 60 days in arrears/.test(html),
    threshold_over_60_days:
      /more than 60 days in arrears/.test(html) &&
      /Exactly 60 days in arrears is not eligible/.test(html) &&
      !/60 days or more/.test(html),
    last_calendar_day_assessment:
      /last calendar day of each month/.test(html) &&
      !/last business day/i.test(html),
    external_collections_authority:
      /authorises StudentPay to administer collections/.test(html) &&
      /facilitate external collection/.test(html) &&
      /does not automatically refer an account/.test(html) &&
      automaticExternalReferral() === false,
    responsibility_split:
      /StudentPay does not provide the course, set the provider's course fee, purchase the provider's debt, or prepay the provider/.test(
        html,
      ) && /StudentPay administers the payment plan/.test(html),
    cancellation_refund_provider_decision:
      /Course cancellation and refund decisions remain provider decisions/.test(html),
    studentpay_payment_privacy_terms:
      /StudentPay Payment Plan Agreement, Direct Debit Service Agreement, and StudentPay privacy terms are separate documents/.test(
        html,
      ),
    provider_commercial_fees_excluded:
      /commercial fees are omitted from this student-facing agreement/.test(html) &&
      /They are not payer charges/.test(html) &&
      !/\$60\.00/.test(html) &&
      !/\$5\.00/.test(html) &&
      !/2\.9%/.test(html) &&
      !/\$0\.40/.test(html),
  };

  const runtimeHolds =
    planMathsHold(input.course) &&
    specifiedLateFeeApplies({
      enabled: true,
      overdueDays: 60,
      triggerDays: 60,
      overdueBalanceCents: 1500,
      alreadyAssessedThisPeriod: false,
      planOpen: true,
      assessment: "last_day_of_month",
      assessmentDate: "2026-10-31",
    }) === false &&
    specifiedLateFeeApplies({
      enabled: true,
      overdueDays: 61,
      triggerDays: 60,
      overdueBalanceCents: 1500,
      alreadyAssessedThisPeriod: false,
      planOpen: true,
      assessment: "last_day_of_month",
      assessmentDate: "2026-10-31",
    }) === true &&
    isLastCalendarDayOfMonth("2026-10-31") === true &&
    isLastCalendarDayOfMonth("2026-10-30") === false &&
    specifiedLateFeeApplies({
      enabled: true,
      overdueDays: 61,
      triggerDays: 60,
      overdueBalanceCents: 1500,
      alreadyAssessedThisPeriod: false,
      planOpen: true,
      assessment: "last_day_of_month",
      assessmentDate: "2026-10-30",
    }) === false;

  const forbidden =
    /4-day retry|after 4 days|automatic catch-up|arrears automatically|add unresolved arrears|last business day|kits are financed|not available for student acceptance|DRAFT|NOT ACTIVE/i.test(
      html,
    );

  const results = {} as Record<LaunchClauseId, "PASS" | "FAIL">;
  for (const [id, ok] of Object.entries(checks) as [LaunchClauseId, boolean][]) {
    results[id] = ok && runtimeHolds && !forbidden ? "PASS" : "FAIL";
  }
  return results;
}

export function launchAuditPassed(
  results: Record<LaunchClauseId, "PASS" | "FAIL">,
): boolean {
  return Object.values(results).every((result) => result === "PASS");
}
