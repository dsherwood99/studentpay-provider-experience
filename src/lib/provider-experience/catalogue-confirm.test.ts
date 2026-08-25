import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BRIDAL_AUTHORITATIVE_SNAPSHOT,
  CLASSIC_AUTHORITATIVE_SNAPSHOT
} from "./catalogue-checkout.ts";
import {
  buildCatalogueReviewFacts,
  catalogueConfirmIsExplicitAction,
  catalogueConfirmSuccessCopy,
  commercialSnapshotFromServer
} from "./catalogue-agreements.ts";
import { validateCatalogueConfirmAccess } from "./catalogue-dda.ts";

const shown = {
  provider_student: "BELA-AU-DRAFT-2026-08-21",
  payment_plan: "2026-08-02"
};

const bothAccepted = {
  provider_student_agreement_accepted: true,
  payment_plan_agreement_accepted: true,
  agreements: {
    provider_student: { version: shown.provider_student },
    payment_plan: { version: shown.payment_plan }
  }
};

const readyDda = {
  processor: "Pinch",
  processor_payer_id: "payer",
  processor_mandate_id: "src",
  consent_accepted: true,
  ready: true
};

const bridalCourse = {
  code: BRIDAL_AUTHORITATIVE_SNAPSHOT.course_code,
  title: "Bridal Freelancer Bundle",
  coursePriceCents: 350000,
  upfrontCents: 400,
  recurringCents: 2300,
  recurringCount: 152,
  kitDisclosure: "Kit not included"
};

const classicCourse = {
  code: CLASSIC_AUTHORITATIVE_SNAPSHOT.course_code,
  title: "Classic Lash",
  coursePriceCents: 180000,
  upfrontCents: 0,
  recurringCents: 2400,
  recurringCount: 75,
  kitDisclosure: "Kit not included"
};

describe("catalogue confirm review facts", () => {
  it("renders Bridal from server-backed checkout data", () => {
    const snapshot = commercialSnapshotFromServer({
      commercial: {
        course_name: "Bridal Freelancer Bundle",
        course_code: "BRIDAL_FREELANCER_BUNDLE",
        course_price: 3500,
        upfront: 4,
        recurring: 23,
        count: 152
      },
      course: bridalCourse
    });
    const review = buildCatalogueReviewFacts({
      snapshot,
      psaAccepted: true,
      ppaAccepted: true,
      ddaReady: true
    });

    assert.equal(review.course, "Bridal Freelancer Bundle");
    assert.equal(review.course_price_copy, "$3,500");
    assert.equal(review.plan_copy, "$4 upfront then 152 weekly payments of $23");
    assert.equal(review.provider_student, "Accepted");
    assert.equal(review.payment_plan, "Accepted");
    assert.equal(review.direct_debit, "Set up");
    assert.equal(review.uses_account_validation_wording, false);
  });

  it("renders Classic without $0 upfront", () => {
    const snapshot = commercialSnapshotFromServer({
      commercial: {
        course_name: "Classic Lash",
        course_code: "CLASSIC_LASH",
        course_price: 1800,
        upfront: 0,
        recurring: 24,
        count: 75
      },
      course: classicCourse
    });
    const review = buildCatalogueReviewFacts({
      snapshot,
      psaAccepted: true,
      ppaAccepted: true,
      ddaReady: true
    });

    assert.equal(review.course_price_copy, "$1,800");
    assert.equal(review.plan_copy, "75 weekly payments of $24");
    assert.equal(review.shows_zero_upfront, false);
    assert.doesNotMatch(review.plan_copy, /\$0/);
    assert.doesNotMatch(review.plan_copy, /\$1/);
  });

  it("ignores browser-tampered commercial values in favour of checkout data", () => {
    const snapshot = commercialSnapshotFromServer({
      commercial: {
        course_name: "Bridal Freelancer Bundle",
        course_code: "BRIDAL_FREELANCER_BUNDLE",
        course_price: 3500,
        upfront: 4,
        recurring: 23,
        count: 152
      },
      course: {
        ...bridalCourse,
        title: "Hacked",
        coursePriceCents: 100
      }
    });

    assert.equal(snapshot.course_price, 3500);
    assert.equal(snapshot.course_name, "Bridal Freelancer Bundle");
  });
});

describe("catalogue confirm prerequisites", () => {
  it("rejects missing Provider Student Agreement acceptance", () => {
    const result = validateCatalogueConfirmAccess({
      shown,
      submitted: {
        ...bothAccepted,
        provider_student_agreement_accepted: false
      },
      checkoutProviderCode: "BELA_BEAUTY_SANDBOX",
      requestProviderCode: "BELA_BEAUTY_SANDBOX",
      dda: readyDda
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "AGREEMENTS_REQUIRED");
  });

  it("rejects missing Payment Plan Agreement acceptance", () => {
    const result = validateCatalogueConfirmAccess({
      shown,
      submitted: {
        ...bothAccepted,
        payment_plan_agreement_accepted: false
      },
      checkoutProviderCode: "BELA_BEAUTY_SANDBOX",
      requestProviderCode: "BELA_BEAUTY_SANDBOX",
      dda: readyDda
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "AGREEMENTS_REQUIRED");
  });

  it("rejects the wrong agreement version", () => {
    const result = validateCatalogueConfirmAccess({
      shown,
      submitted: {
        ...bothAccepted,
        agreements: {
          provider_student: { version: "BELA-AU-OLD" },
          payment_plan: { version: shown.payment_plan }
        }
      },
      checkoutProviderCode: "BELA_BEAUTY_SANDBOX",
      requestProviderCode: "BELA_BEAUTY_SANDBOX",
      dda: readyDda
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "AGREEMENT_VERSION_MISMATCH");
  });

  it("rejects confirm when DDA is not ready", () => {
    const result = validateCatalogueConfirmAccess({
      shown,
      submitted: bothAccepted,
      checkoutProviderCode: "BELA_BEAUTY_SANDBOX",
      requestProviderCode: "BELA_BEAUTY_SANDBOX",
      dda: { ready: false, processor_payer_id: null }
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "DDA_NOT_READY");
  });

  it("rejects a Bela checkout confirmed under another provider", () => {
    const result = validateCatalogueConfirmAccess({
      shown,
      submitted: bothAccepted,
      checkoutProviderCode: "BELA_BEAUTY_SANDBOX",
      requestProviderCode: "ONFIT",
      dda: readyDda
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });

  it("allows production BELA through the hosted confirm path", () => {
    const result = validateCatalogueConfirmAccess({
      shown,
      submitted: bothAccepted,
      checkoutProviderCode: "BELA",
      requestProviderCode: "BELA",
      dda: readyDda
    });
    assert.equal(result.ok, true);
    assert.equal(result.code, "CONFIRM_ALLOWED");
  });

  it("does not let production BELA confirm a sandbox checkout", () => {
    const result = validateCatalogueConfirmAccess({
      shown,
      submitted: bothAccepted,
      checkoutProviderCode: "BELA_BEAUTY_SANDBOX",
      requestProviderCode: "BELA",
      dda: readyDda
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
    assert.equal(result.code, "PROVIDER_MISMATCH");
  });
});

describe("catalogue confirm UX contract", () => {
  it("requires an explicit confirm action after DDA", () => {
    assert.equal(catalogueConfirmIsExplicitAction(), true);
  });

  it("does not say payments have been scheduled", () => {
    const copy = catalogueConfirmSuccessCopy("BELA_BEAUTY_SANDBOX-1");
    assert.equal(copy.heading, "Enrolment complete");
    assert.doesNotMatch(copy.body, /scheduled/i);
    assert.equal(copy.exposesSalesforceIds, false);
    assert.equal(copy.reference, "BELA_BEAUTY_SANDBOX-1");
  });
});
