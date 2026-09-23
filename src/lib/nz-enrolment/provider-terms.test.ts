import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { belaNzSkeletonInput } from "./provider-terms-bela-fixture.ts";
import {
  composeProviderTermsSkeleton,
  inactiveCommercialSchedule,
  inactivePayerTreatment,
  payerFeeClauses,
  planMathsHold,
  sealDraftSnapshot,
  viewHistoricalAgreement,
  type ProviderTermsInput,
} from "./provider-terms.ts";

const ARTEFACT =
  "docs/provider-terms-architecture/artefacts/BELA_NZ_agreement_skeleton.html";

function withPayer(
  base: ProviderTermsInput,
  payer: ProviderTermsInput["payer"],
): ProviderTermsInput {
  return { ...base, payer };
}

test("inactive payer treatment adds no payer fee clauses", () => {
  const payer = inactivePayerTreatment();
  assert.deepEqual(payerFeeClauses(payer), []);
  assert.equal(payer.failedPaymentFeeEnabled, false);
  assert.equal(payer.lateFeeEnabled, false);
  assert.equal(payer.retryEnabled, null);
  assert.equal(payer.catchUpTreatment, "unset");
  assert.equal(inactiveCommercialSchedule().chargingAuthorised, false);
});

test("Bela skeleton stays inactive and omits unapproved payer charges", () => {
  const draft = composeProviderTermsSkeleton(belaNzSkeletonInput());
  assert.equal(draft.status, "DRAFT_NOT_ACTIVE");
  assert.equal(draft.activationPermitted, false);
  assert.equal(draft.availableForStudentAcceptance, false);
  assert.equal(draft.salesforceStatus, "DoNotCreate");
  assert.equal(draft.auStatutoryWordingIncluded, false);
  assert.equal(draft.jurisdiction, "NZ");
  assert.deepEqual(draft.payerFeeClauses, []);
  assert.equal(planMathsHold(belaNzSkeletonInput().course), true);
  assert.match(draft.html, /DRAFT\. NOT ACTIVE\. REQUIRES PROVIDER \/ LEGAL APPROVAL/);
  assert.match(draft.html, /\$2800\.00/);
  assert.match(draft.html, /\$10\.00/);
  assert.match(draft.html, /\$2790\.00/);
  assert.match(draft.html, /\$15\.00/);
  assert.doesNotMatch(draft.html, /\$2\.50/);
  assert.doesNotMatch(draft.html, /2\.9%/);
  assert.doesNotMatch(draft.html, /\$0\.40/);
  assert.doesNotMatch(draft.html, /National Credit/);
  assert.doesNotMatch(draft.html, /Australian Consumer Law/);
  assert.ok(draft.unresolved.includes("RETRY_TREATMENT"));
  assert.ok(draft.unresolved.includes("CATCH_UP_TREATMENT"));
  assert.ok(draft.unresolved.includes("FAILED_PAYMENT_FEE"));
  assert.ok(draft.unresolved.includes("LATE_FEE"));
  assert.ok(draft.unresolved.includes("AU_DRAFT_NOT_APPROVED_FOR_NZ"));
  assert.equal(draft.contentHash.length, 64);
});

test("committed Bela skeleton matches the composer", () => {
  const draft = composeProviderTermsSkeleton(belaNzSkeletonInput());
  const committed = readFileSync(ARTEFACT, "utf8");
  assert.equal(committed, draft.html);
});

test("a later settings change does not rewrite a sealed snapshot", () => {
  const original = composeProviderTermsSkeleton(belaNzSkeletonInput());
  const sealed = sealDraftSnapshot(original, "2026-09-23T00:00:00.000Z");
  const changed = withPayer(belaNzSkeletonInput(), {
    ...inactivePayerTreatment(),
    retryEnabled: true,
    retryDelayDays: 4,
    failedPaymentFeeEnabled: true,
    failedPaymentFeeAmountCents: 250,
    lateFeeEnabled: true,
    lateFeeAmountCents: 1000,
  });
  const regenerated = composeProviderTermsSkeleton(changed);
  const viewed = viewHistoricalAgreement(sealed, changed);
  assert.notEqual(regenerated.html, sealed.html);
  assert.notEqual(regenerated.contentHash, sealed.contentHash);
  assert.equal(viewed.html, sealed.html);
  assert.equal(viewed.contentHash, sealed.contentHash);
  assert.equal(regenerated.activationPermitted, false);
  assert.ok(regenerated.payerFeeClauses.includes("FAILED_PAYMENT_FEE"));
  assert.ok(regenerated.payerFeeClauses.includes("LATE_FEE"));
  assert.ok(regenerated.unresolved.includes("RUNTIME_NOT_WIRED"));
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

test("an existing-provider default does not gain a payer fee from commercial amounts", () => {
  const oliLike = belaNzSkeletonInput();
  const input: ProviderTermsInput = {
    ...oliLike,
    providerCode: "OLI_NZ",
    tradingName: "Online Learning Institute",
    commercial: {
      establishmentFeeCents: 1500,
      transactionFixedCents: 40,
      transactionPercent: 2.9,
      chargingAuthorised: false,
    },
    payer: inactivePayerTreatment(),
  };
  const draft = composeProviderTermsSkeleton(input);
  assert.deepEqual(draft.payerFeeClauses, []);
  assert.doesNotMatch(draft.html, /\$15\.00 establishment|2\.9%|\$0\.40/);
  assert.match(draft.html, /omitted from this student-facing skeleton/);
});
