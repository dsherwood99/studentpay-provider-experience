import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogueConfirmBlockedInThisPhase,
  catalogueDdaBindingAllowsProvider,
  catalogueDdaStepAvailable,
  isCatalogueDdaReady,
  sanitiseCatalogueDdaError,
  validateCatalogueDdaAccess
} from "./catalogue-dda.ts";

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

describe("catalogue DDA access", () => {
  it("keeps the DDA step unavailable until both agreements are accepted", () => {
    assert.equal(
      catalogueDdaStepAvailable({
        provider_student_agreement_accepted: true,
        payment_plan_agreement_accepted: false
      }),
      false
    );
    assert.equal(catalogueDdaStepAvailable(bothAccepted), true);
  });

  it("does not let another provider use a Bela checkout", () => {
    const result = validateCatalogueDdaAccess({
      shown,
      submitted: bothAccepted,
      checkoutProviderCode: "BELA_BEAUTY_SANDBOX",
      requestProviderCode: "ONFIT"
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });

  it("does not let a Bela request attach another provider's DDA", () => {
    const result = validateCatalogueDdaAccess({
      shown,
      submitted: bothAccepted,
      checkoutProviderCode: "ONFIT",
      requestProviderCode: "BELA_BEAUTY_SANDBOX"
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });

  it("does not bind Academy to catalogue DDA credentials", () => {
    assert.equal(catalogueDdaBindingAllowsProvider("ACADEMYAU"), false);
    assert.equal(catalogueDdaBindingAllowsProvider("BELA"), true);
  });

  it("allows production BELA DDA on the generic catalogue path", () => {
    const result = validateCatalogueDdaAccess({
      shown,
      submitted: bothAccepted,
      checkoutProviderCode: "BELA",
      requestProviderCode: "BELA"
    });
    assert.equal(result.ok, true);
    assert.equal(catalogueDdaBindingAllowsProvider("BELA"), true);
    assert.equal(catalogueDdaBindingAllowsProvider("OCA"), false);
  });
});

describe("catalogue DDA ready state", () => {
  it("requires payer and mandate identifiers from the server", () => {
    assert.equal(
      isCatalogueDdaReady({
        ready: true,
        processor_payer_id: null,
        processor_mandate_id: "src"
      }),
      false
    );
    assert.equal(
      isCatalogueDdaReady({
        processor: "Pinch",
        processor_payer_id: "payer",
        processor_mandate_id: "src",
        consent_accepted: true
      }),
      true
    );
  });

  it("unblocks the explicit confirm step after DDA is ready", () => {
    assert.equal(catalogueConfirmBlockedInThisPhase(), false);
  });

  it("treats an already-ready DDA as reusable", () => {
    const ready = {
      dda_id: "a2AREADY",
      processor: "Pinch",
      processor_payer_id: "pchr_payer",
      processor_mandate_id: "pchr_src",
      consent_accepted: true,
      ready: true
    };
    assert.equal(isCatalogueDdaReady(ready), true);
    assert.equal(isCatalogueDdaReady({ ...ready }), true);
  });
});

describe("catalogue DDA failure copy", () => {
  it("sanitises a 10-digit account rejection", () => {
    assert.match(
      sanitiseCatalogueDdaError("account number 10 digits invalid"),
      /3 and 9 digits/
    );
  });
});
