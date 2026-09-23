import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { belaNzSkeletonInput } from "./provider-terms-bela-fixture.ts";
import {
  composeProviderTermsSkeleton,
  inactiveCommercialSchedule,
  inactiveEnrolmentPolicy,
  inactivePayerTreatment,
  payerFeeClauses,
  planMathsHold,
  sealDraftSnapshot,
  specifiedCatchUpCreatesAutomaticCollection,
  specifiedFailedPaymentFeeKeys,
  specifiedLateFeeApplies,
  specifiedRetryDate,
  viewHistoricalAgreement,
  type ProviderTermsInput,
} from "./provider-terms.ts";

const ARTEFACT =
  "docs/provider-terms-architecture/artefacts/BELA_NZ_agreement_skeleton.html";

test("absent payer policy adds no payer fee clauses", () => {
  const payer = inactivePayerTreatment();
  assert.deepEqual(payerFeeClauses(payer), []);
  assert.equal(payer.failedPaymentFeeEnabled, false);
  assert.equal(payer.lateFeeEnabled, false);
  assert.equal(payer.retryEnabled, null);
  assert.equal(specifiedRetryDate({
    retryEnabled: payer.retryEnabled,
    retryDelayDays: payer.retryDelayDays,
    failedOnIsoDate: "2026-09-01",
  }), null);
  assert.equal(specifiedLateFeeApplies({
    enabled: false,
    overdueDays: 90,
    triggerDays: 60,
    overdueBalanceCents: 1500,
    alreadyAssessedThisPeriod: false,
    planOpen: true,
  }), false);
  assert.equal(inactiveCommercialSchedule().chargingAuthorised, false);
  assert.equal(inactiveEnrolmentPolicy().coolingOffDays, null);
});

test("Bela skeleton records decided policy and stays inactive", () => {
  const input = belaNzSkeletonInput();
  const draft = composeProviderTermsSkeleton(input);
  assert.equal(draft.status, "DRAFT_NOT_ACTIVE");
  assert.equal(draft.activationPermitted, false);
  assert.equal(draft.availableForStudentAcceptance, false);
  assert.equal(draft.salesforceStatus, "DoNotCreate");
  assert.equal(draft.auStatutoryWordingIncluded, false);
  assert.equal(draft.version, "nz-skeleton-2026-09-23-v2");
  assert.equal(planMathsHold(input.course), true);
  assert.match(draft.html, /Jessica Buff trading as Bela Beauty College/);
  assert.match(draft.html, /Cooling-off:<\/strong> 3 days/);
  assert.match(draft.html, /Course access:<\/strong> 2 years/);
  assert.match(draft.html, /after 4 days/);
  assert.match(draft.html, /Add unresolved arrears to the end/);
  assert.match(draft.html, /\$2\.50 per failed payment, collected at the end/);
  assert.match(draft.html, /\$15\.00 when the account is more than 60 days/);
  assert.match(draft.html, /last business day of the month/);
  assert.match(draft.html, /does not refer an account by itself/);
  assert.match(draft.html, /StudentPay does not automatically suspend course access/);
  assert.match(draft.html, /\{\{UNRESOLVED:KIT\}\}/);
  assert.match(draft.html, /NZ LEGAL \/ PROVIDER APPROVAL REQUIRED/);
  assert.match(draft.html, /\$2800\.00/);
  assert.match(draft.html, /\$10\.00/);
  assert.match(draft.html, /\$2790\.00/);
  assert.doesNotMatch(draft.html, /\$60\.00/);
  assert.doesNotMatch(draft.html, /\$5\.00/);
  assert.doesNotMatch(draft.html, /2\.9%/);
  assert.doesNotMatch(draft.html, /\$0\.40/);
  assert.doesNotMatch(draft.html, /cancel anytime/i);
  assert.doesNotMatch(draft.html, /no lock-in/i);
  assert.doesNotMatch(draft.html, /lifetime access/i);
  assert.doesNotMatch(draft.html, /self-enrolments cannot/i);
  assert.doesNotMatch(draft.html, /National Credit/);
  assert.ok(draft.unresolved.includes("KIT"));
  assert.ok(draft.unresolved.includes("EFFECTIVE_DATE"));
  assert.ok(draft.unresolved.includes("RUNTIME_NOT_WIRED"));
  assert.ok(draft.unresolved.includes("NZ_LEGAL_REVIEW"));
  assert.ok(!draft.unresolved.includes("RETRY_TREATMENT"));
  assert.ok(!draft.unresolved.includes("LEGAL_NAME"));
  assert.deepEqual(draft.payerFeeClauses, ["FAILED_PAYMENT_FEE", "LATE_FEE"]);
});

test("committed Bela skeleton matches the composer", () => {
  const draft = composeProviderTermsSkeleton(belaNzSkeletonInput());
  assert.equal(readFileSync(ARTEFACT, "utf8"), draft.html);
});

test("a later policy change does not rewrite a sealed snapshot", () => {
  const original = composeProviderTermsSkeleton(belaNzSkeletonInput());
  const sealed = sealDraftSnapshot(original, "2026-09-23T00:00:00.000Z");
  const changed: ProviderTermsInput = {
    ...belaNzSkeletonInput(),
    payer: {
      ...belaNzSkeletonInput().payer,
      lateFeeAmountCents: 9_999,
      retryDelayDays: 9,
    },
  };
  const regenerated = composeProviderTermsSkeleton(changed);
  const viewed = viewHistoricalAgreement(sealed, changed);
  assert.notEqual(regenerated.contentHash, sealed.contentHash);
  assert.equal(viewed.html, sealed.html);
  assert.equal(viewed.contentHash, sealed.contentHash);
  assert.equal(regenerated.activationPermitted, false);
});

test("checkout does not compose agreements from payer-treatment settings", () => {
  const confirm = readFileSync(
    "src/app/api/enrolment-checkout/confirm/route.ts",
    "utf8",
  );
  const page = readFileSync(
    "src/app/enrol/[providerSlug]/[courseSlug]/page.tsx",
    "utf8",
  );
  assert.equal(confirm.includes("provider-terms"), false);
  assert.equal(page.includes("provider-terms"), false);
});

test("provider commercial amounts do not become payer clauses", () => {
  const input: ProviderTermsInput = {
    ...belaNzSkeletonInput(),
    providerCode: "OLI_NZ",
    tradingName: "Online Learning Institute",
    legalName: null,
    enrolment: inactiveEnrolmentPolicy(),
    payer: inactivePayerTreatment(),
    commercial: {
      establishmentFeeCents: 6_000,
      establishmentBasis: "per_activated_payment_plan",
      monthlyAccountFeeCents: 500,
      monthlyAccountBasis: "per_activated_account_month",
      transactionFixedCents: 40,
      transactionPercent: 2.9,
      chargingAuthorised: false,
    },
  };
  const draft = composeProviderTermsSkeleton(input);
  assert.deepEqual(draft.payerFeeClauses, []);
  assert.doesNotMatch(draft.html, /\$60\.00|\$5\.00|2\.9%|\$0\.40/);
  assert.match(draft.html, /omitted from this student-facing skeleton/);
  assert.equal(input.commercial.chargingAuthorised, false);
});

test("retry specification is four days only when enabled", () => {
  assert.equal(specifiedRetryDate({
    retryEnabled: true,
    retryDelayDays: 4,
    failedOnIsoDate: "2026-09-01",
  }), "2026-09-05");
  assert.equal(specifiedRetryDate({
    retryEnabled: false,
    retryDelayDays: 4,
    failedOnIsoDate: "2026-09-01",
  }), null);
  assert.equal(specifiedRetryDate({
    retryEnabled: null,
    retryDelayDays: null,
    failedOnIsoDate: "2026-09-01",
  }), null);
});

test("failed-payment fee specification is one key per qualifying failure", () => {
  const keys = specifiedFailedPaymentFeeKeys([
    { failureId: "fail-1", qualifyingFailure: true },
    { failureId: "fail-1", qualifyingFailure: true },
    { failureId: "attempt-only", qualifyingFailure: false },
    { failureId: "fail-2", qualifyingFailure: true },
  ]);
  assert.deepEqual(keys, [
    "failed-payment-fee:fail-1",
    "failed-payment-fee:fail-2",
  ]);
  assert.deepEqual(specifiedFailedPaymentFeeKeys([]), []);
});

test("late-fee specification uses more than 60 days and is idempotent", () => {
  const base = {
    enabled: true,
    triggerDays: 60,
    overdueBalanceCents: 1500,
    alreadyAssessedThisPeriod: false,
    planOpen: true,
  };
  assert.equal(specifiedLateFeeApplies({ ...base, overdueDays: 60 }), false);
  assert.equal(specifiedLateFeeApplies({ ...base, overdueDays: 61 }), true);
  assert.equal(specifiedLateFeeApplies({
    ...base,
    overdueDays: 90,
    overdueBalanceCents: 0,
  }), false);
  assert.equal(specifiedLateFeeApplies({
    ...base,
    overdueDays: 90,
    alreadyAssessedThisPeriod: true,
  }), false);
  assert.equal(specifiedLateFeeApplies({
    ...base,
    overdueDays: 90,
    planOpen: false,
  }), false);
  assert.equal(specifiedLateFeeApplies({
    ...base,
    enabled: false,
    overdueDays: 90,
  }), false);
});

test("add-to-end does not create an automatic catch-up collection", () => {
  assert.equal(
    specifiedCatchUpCreatesAutomaticCollection("arrears_added_to_end"),
    false,
  );
  assert.equal(
    specifiedCatchUpCreatesAutomaticCollection("catch_up_collection"),
    true,
  );
  assert.equal(specifiedCatchUpCreatesAutomaticCollection("unset"), false);
});
