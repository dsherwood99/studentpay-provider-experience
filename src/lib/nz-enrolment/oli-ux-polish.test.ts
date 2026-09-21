import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  PIF_ONLY_JOURNEY_ATTRIBUTION,
  hostedCheckoutConfirmDeclarations,
  hostedCheckoutViewModel,
} from "./checkout-payment-mode.ts";
import {
  POWERED_BY_LABEL,
  STANDALONE_DETAILS_CONFIRMATION_COPY,
  STUDENTPAY_POWERED_BY_LOGO_ALT,
  STUDENTPAY_POWERED_BY_LOGO_SRC,
  combinedDetailsPrivacyAccepted,
  combinedDetailsPrivacyCopy,
  confirmEnabled,
  declarationsAccepted,
  setCombinedDetailsPrivacyDeclaration,
} from "./checkout-ui.ts";
import {
  paymentPlanAgreementAccepted,
  providerStudentAgreementAccepted,
} from "./hosted-agreement.ts";
import { payInFullDeclarationsAccepted } from "./pay-in-full-flow.ts";
import { getNzCourse } from "./courses.ts";
import { getNzTenantBySlug } from "./tenants.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const checkoutSource = fs.readFileSync(
  path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
  "utf8",
);
const attributionSource = fs.readFileSync(
  path.join(srcRoot, "components/nz-enrolment/StudentPayAttribution.tsx"),
  "utf8",
);
const confirmRoute = fs.readFileSync(
  path.join(srcRoot, "app/api/enrolment-checkout/confirm/route.ts"),
  "utf8",
);
const cssSource = fs.readFileSync(
  path.join(srcRoot, "components/nz-enrolment/enrolment-checkout.module.css"),
  "utf8",
);

const OLD_ATTRIBUTION_STRINGS = [
  "Payment plan powered by StudentPay NZ",
  "Payments powered by StudentPay NZ",
  "Questions about this enrolment can be sent",
] as const;

const managed = [
  "HOSTED_PRODUCT_MODE",
  "STUDENTPAY_ENV",
  "NZ_STUDENTPAY_API_BASE_URL",
];
const previous: Record<string, string | undefined> = {};

function snapshotEnv() {
  for (const name of managed) {
    previous[name] = process.env[name];
    delete process.env[name];
  }
  process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
  process.env.STUDENTPAY_ENV = "production";
  process.env.NZ_STUDENTPAY_API_BASE_URL = "https://api.studentpay.co.nz";
}

function restoreEnv() {
  for (const name of managed) {
    if (previous[name] === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous[name];
    }
  }
}

beforeEach(snapshotEnv);
afterEach(restoreEnv);

describe("OLI Hosted checkout UX polish", () => {
  it("keeps old textual attribution out of checkout and confirmation markup", () => {
    for (const text of [checkoutSource, attributionSource]) {
      for (const forbidden of OLD_ATTRIBUTION_STRINGS) {
        assert.doesNotMatch(
          text,
          new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        );
      }
    }
    assert.doesNotMatch(checkoutSource, /copy\.journeyAttribution/);
    assert.doesNotMatch(checkoutSource, /supportNote/);
    assert.equal(
      PIF_ONLY_JOURNEY_ATTRIBUTION,
      "Payments powered by StudentPay NZ",
    );
  });

  it("renders the compact StudentPay logo attribution on checkout and confirmation", () => {
    const logoPath = path.join(
      repoRoot,
      "public",
      STUDENTPAY_POWERED_BY_LOGO_SRC.replace(/^\//, ""),
    );
    assert.equal(fs.existsSync(logoPath), true);
    assert.match(attributionSource, /data-testid="nz-studentpay-attribution"/);
    assert.equal(POWERED_BY_LABEL, "Powered by");
    assert.equal(STUDENTPAY_POWERED_BY_LOGO_SRC, "/nz-enrolment/studentpay-powered-by.png");
    assert.equal(STUDENTPAY_POWERED_BY_LOGO_ALT, "StudentPay");
    assert.match(attributionSource, /POWERED_BY_LABEL/);
    assert.match(attributionSource, /src=\{STUDENTPAY_POWERED_BY_LOGO_SRC\}/);
    assert.match(attributionSource, /alt=\{STUDENTPAY_POWERED_BY_LOGO_ALT\}/);
    assert.equal(
      [...checkoutSource.matchAll(/<StudentPayAttribution \/>/g)].length,
      2,
    );
    assert.match(checkoutSource, /nz-enrolment-confirmed[\s\S]*StudentPayAttribution/);
    assert.match(cssSource, /width: 148px/);
    assert.match(cssSource, /width: 118px/);
  });

  it("removes the standalone details checkbox and shows one combined declaration", () => {
    assert.doesNotMatch(checkoutSource, new RegExp(STANDALONE_DETAILS_CONFIRMATION_COPY));
    assert.doesNotMatch(
      checkoutSource,
      /and consent to this enrolment being processed/,
    );
    assert.equal(
      [...checkoutSource.matchAll(/data-testid="nz-combined-details-privacy"/g)].length,
      1,
    );
    assert.match(
      checkoutSource,
      /I confirm my details are true and complete, have read the/,
    );
    assert.match(checkoutSource, /privacy information/);
    assert.match(checkoutSource, /tenant\.privacyUrl/);
    assert.match(
      checkoutSource,
      /consent to \{tenant\.legalName\} and StudentPay NZ using my details to/,
    );
    const oli = getNzTenantBySlug("oli")!;
    assert.equal(
      combinedDetailsPrivacyCopy(oli.legalName),
      "I confirm my details are true and complete, have read the privacy information, and consent to Online Learning Institute and StudentPay NZ using my details to process this enrolment.",
    );
  });

  it("checking the combined declaration sets both API flags, unchecking clears both", () => {
    assert.deepEqual(setCombinedDetailsPrivacyDeclaration(true), {
      information_confirmed: true,
      privacy_consent_accepted: true,
    });
    assert.deepEqual(setCombinedDetailsPrivacyDeclaration(false), {
      information_confirmed: false,
      privacy_consent_accepted: false,
    });
    assert.equal(
      combinedDetailsPrivacyAccepted({
        information_confirmed: true,
        privacy_consent_accepted: true,
      }),
      true,
    );
    assert.equal(
      combinedDetailsPrivacyAccepted({
        information_confirmed: true,
        privacy_consent_accepted: false,
      }),
      false,
    );
    assert.match(checkoutSource, /setCombinedDetailsPrivacyDeclaration\(event\.target\.checked\)/);
    assert.match(checkoutSource, /combinedDetailsPrivacyAccepted\(declarations\)/);

    const checked = hostedCheckoutConfirmDeclarations({
      selectedOption: "interest_free_payment_plan",
      declarations: {
        payment_plan_accepted: true,
        ...setCombinedDetailsPrivacyDeclaration(true),
      },
    });
    assert.equal(checked?.information_confirmed, true);
    assert.equal(checked?.privacy_consent_accepted, true);

    const unchecked = hostedCheckoutConfirmDeclarations({
      selectedOption: "pay_in_full",
      declarations: {
        payment_plan_accepted: false,
        ...setCombinedDetailsPrivacyDeclaration(false),
      },
    });
    assert.equal(unchecked?.information_confirmed, false);
    assert.equal(unchecked?.privacy_consent_accepted, false);
    assert.match(confirmRoute, /information_confirmed: Boolean\(body\.declarations\?\.information_confirmed\)/);
    assert.match(
      confirmRoute,
      /privacy_consent_accepted: Boolean\(body\.declarations\?\.privacy_consent_accepted\)/,
    );
  });

  it("keeps Payment Plan confirm blocked until PSA, PPA/DDA, combined declaration, and DDA ready", () => {
    const combined = setCombinedDetailsPrivacyDeclaration(true);
    assert.equal(
      providerStudentAgreementAccepted({ required: true, accepted: false }),
      false,
    );
    assert.equal(
      paymentPlanAgreementAccepted({ required: true, accepted: false }),
      false,
    );
    assert.equal(
      declarationsAccepted({
        payment_plan_accepted: true,
        information_confirmed: false,
        privacy_consent_accepted: false,
      }),
      false,
    );
    assert.equal(
      declarationsAccepted({
        payment_plan_accepted: false,
        ...combined,
      }),
      false,
    );
    assert.equal(
      confirmEnabled({
        studentValid: true,
        setupComplete: false,
        declarationsAccepted: true,
        busy: false,
      }),
      false,
    );
    assert.equal(
      providerStudentAgreementAccepted({ required: true, accepted: true }) &&
        paymentPlanAgreementAccepted({ required: true, accepted: true }) &&
        declarationsAccepted({
          payment_plan_accepted: true,
          ...combined,
        }) &&
        confirmEnabled({
          studentValid: true,
          setupComplete: true,
          declarationsAccepted: true,
          busy: false,
        }),
      true,
    );
    assert.match(checkoutSource, /provider_student_agreement_accepted/);
    assert.match(checkoutSource, /payment_plan_accepted/);
    assert.match(checkoutSource, /NZ_CONFIRM_CTA/);
  });

  it("keeps Pay Now confirm blocked until existing agreements plus the combined declaration", () => {
    assert.equal(
      payInFullDeclarationsAccepted({
        information_confirmed: false,
        privacy_consent_accepted: false,
      }),
      false,
    );
    assert.equal(
      payInFullDeclarationsAccepted(setCombinedDetailsPrivacyDeclaration(true)),
      true,
    );
    assert.equal(
      providerStudentAgreementAccepted({ required: true, accepted: false }),
      false,
    );
    const pif = hostedCheckoutViewModel({
      paymentPlanAvailable: true,
      payInFullAvailable: true,
      selected: "pay_in_full",
      paymentChoiceTouched: true,
      declarations: {
        payment_plan_accepted: false,
        ...setCombinedDetailsPrivacyDeclaration(true),
      },
    });
    assert.equal(pif.flags.showPayInFullSummary, true);
    assert.equal(pif.flags.showPaymentPlanAccepted, false);
    assert.equal(pif.confirmDeclarations?.information_confirmed, true);
    assert.equal(pif.confirmDeclarations?.privacy_consent_accepted, true);
    assert.equal(
      pif.confirmDeclarations && "payment_plan_accepted" in pif.confirmDeclarations,
      false,
    );
    assert.match(checkoutSource, /pifDeclarationsOk/);
    assert.match(checkoutSource, /!pifDeclarationsOk/);
  });

  it("does not change pricing or payment-option behaviour", () => {
    process.env.STUDENTPAY_ENV = "production";
    const course = getNzCourse("oli", "certificate-in-business-administration")!;
    assert.equal(course.paymentInFullCourseFeeCents, 160425);
    assert.equal(course.paymentPlanCourseFeeCents, 183425);
    const plan = hostedCheckoutViewModel({
      paymentPlanAvailable: true,
      payInFullAvailable: true,
      selected: "interest_free_payment_plan",
      paymentChoiceTouched: true,
    });
    const payNow = hostedCheckoutViewModel({
      paymentPlanAvailable: true,
      payInFullAvailable: true,
      selected: "pay_in_full",
      paymentChoiceTouched: true,
    });
    assert.equal(plan.flags.showDdaSection, true);
    assert.equal(plan.flags.showPpaLink, true);
    assert.equal(payNow.flags.showDdaSection, false);
    assert.equal(payNow.flags.showPpaLink, false);
    assert.equal(payNow.copy.journeyAttribution, POWERED_BY_LABEL);
    assert.equal(plan.copy.journeyAttribution, POWERED_BY_LABEL);
  });
});
