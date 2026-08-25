import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BRIDAL_AUTHORITATIVE_SNAPSHOT,
  CLASSIC_AUTHORITATIVE_SNAPSHOT,
} from "./catalogue-checkout.ts";
import {
  ignoreBrowserCommercialTamper,
  isConcreteAgreementVersion,
  paymentPlanFactsFromSnapshot,
  repeatAcceptanceIsIdempotent,
  validateSeparateAgreementAcceptance,
} from "./catalogue-agreements.ts";

const bridalSnapshot = {
  course_code: BRIDAL_AUTHORITATIVE_SNAPSHOT.course_code,
  course_name: "Bridal Freelancer Bundle",
  course_price: BRIDAL_AUTHORITATIVE_SNAPSHOT.course_price,
  upfront: BRIDAL_AUTHORITATIVE_SNAPSHOT.upfront,
  recurring: BRIDAL_AUTHORITATIVE_SNAPSHOT.recurring,
  count: BRIDAL_AUTHORITATIVE_SNAPSHOT.count,
  amount_to_finance: BRIDAL_AUTHORITATIVE_SNAPSHOT.amount_to_finance,
  kit_disclosure: "Kit not included",
};

const classicSnapshot = {
  course_code: CLASSIC_AUTHORITATIVE_SNAPSHOT.course_code,
  course_name: "Classic Lash",
  course_price: CLASSIC_AUTHORITATIVE_SNAPSHOT.course_price,
  upfront: CLASSIC_AUTHORITATIVE_SNAPSHOT.upfront,
  recurring: CLASSIC_AUTHORITATIVE_SNAPSHOT.recurring,
  count: CLASSIC_AUTHORITATIVE_SNAPSHOT.count,
  amount_to_finance: CLASSIC_AUTHORITATIVE_SNAPSHOT.amount_to_finance,
  kit_disclosure: "Kit not included",
};

const shown = {
  provider_student: "BELA-AU-DRAFT-2026-08-21",
  payment_plan: "2026-08-02",
};

describe("catalogue agreement facts", () => {
  it("renders Bridal commercial facts from the checkout snapshot", () => {
    const facts = paymentPlanFactsFromSnapshot(bridalSnapshot);
    assert.equal(facts.course_price_copy, "$3,500");
    assert.equal(facts.plan_copy, "$4 upfront then 152 weekly payments of $23");
    assert.equal(bridalSnapshot.kit_disclosure, "Kit not included");
    assert.equal(facts.uses_account_validation_wording, false);
  });

  it("renders Classic without $0 upfront or a synthetic $1", () => {
    const facts = paymentPlanFactsFromSnapshot(classicSnapshot);
    assert.equal(facts.course_price_copy, "$1,800");
    assert.equal(facts.plan_copy, "75 weekly payments of $24");
    assert.equal(facts.shows_zero_upfront, false);
    assert.doesNotMatch(facts.plan_copy, /\$0/);
    assert.doesNotMatch(facts.plan_copy, /\$1/);
    assert.equal(facts.uses_account_validation_wording, false);
  });

  it("ignores browser query commercial values", () => {
    const result = ignoreBrowserCommercialTamper(bridalSnapshot, {
      price: "1",
      upfront: "1",
      weekly: "1",
      count: "1",
      course: "Hacked Course",
    });
    assert.equal(result.course_price, 3500);
    assert.equal(result.upfront, 4);
    assert.equal(result.recurring, 23);
    assert.equal(result.count, 152);
    assert.equal(result.course_name, "Bridal Freelancer Bundle");
  });
});

describe("separate agreement acceptance", () => {
  it("does not let provider agreement acceptance imply payment plan acceptance", () => {
    const result = validateSeparateAgreementAcceptance({
      shown,
      submitted: {
        provider_student_agreement_accepted: true,
        payment_plan_agreement_accepted: false,
        agreements: {
          provider_student: { version: shown.provider_student },
        },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.provider_student_agreement_accepted, true);
    assert.equal(result.payment_plan_agreement_accepted, false);
    assert.equal(result.can_continue, false);
  });

  it("does not let payment plan acceptance imply provider agreement acceptance", () => {
    const result = validateSeparateAgreementAcceptance({
      shown,
      submitted: {
        provider_student_agreement_accepted: false,
        payment_plan_agreement_accepted: true,
        agreements: {
          payment_plan: { version: shown.payment_plan },
        },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.provider_student_agreement_accepted, false);
    assert.equal(result.payment_plan_agreement_accepted, true);
    assert.equal(result.can_continue, false);
  });

  it("requires both agreements before continue", () => {
    const result = validateSeparateAgreementAcceptance({
      shown,
      submitted: {
        provider_student_agreement_accepted: true,
        payment_plan_agreement_accepted: true,
        agreements: {
          provider_student: { version: shown.provider_student },
          payment_plan: { version: shown.payment_plan },
        },
      },
    });

    assert.equal(result.can_continue, true);
    assert.equal(isConcreteAgreementVersion(shown.provider_student), true);
    assert.equal(isConcreteAgreementVersion("current"), false);
    assert.equal(isConcreteAgreementVersion("latest"), false);
  });

  it("fails closed when the shown provider agreement version changes", () => {
    const result = validateSeparateAgreementAcceptance({
      shown,
      submitted: {
        provider_student_agreement_accepted: true,
        payment_plan_agreement_accepted: true,
        agreements: {
          provider_student: { version: "BELA-AU-OLD-VERSION" },
          payment_plan: { version: shown.payment_plan },
        },
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 409);
    assert.equal(result.can_continue, false);
  });

  it("treats repeat acceptance as idempotent", () => {
    const payload = {
      provider_student_agreement_accepted: true,
      payment_plan_agreement_accepted: true,
      agreements: {
        provider_student: { version: shown.provider_student },
        payment_plan: { version: shown.payment_plan },
      },
    };
    const first = validateSeparateAgreementAcceptance({ shown, submitted: payload });
    const second = validateSeparateAgreementAcceptance({ shown, submitted: payload });
    assert.equal(repeatAcceptanceIsIdempotent(first, second), true);
  });
});
