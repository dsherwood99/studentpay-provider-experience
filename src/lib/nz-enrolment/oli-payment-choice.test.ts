import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  buildPayInFullCreatePayload,
  buildCanonicalCreatePayload,
} from "./canonical.ts";
import {
  clearedStateForPaymentSwitch,
  hostedCheckoutCreatePlan,
  hostedCheckoutViewModel,
  paymentMethodSwitchLocked,
} from "./checkout-payment-mode.ts";
import { getNzCourse, toPublicCourse } from "./courses.ts";
import { getNzTenantBySlug, toPublicTenant } from "./tenants.ts";
import {
  isPayInFullChoiceVisible,
} from "./checkout-ui.ts";
import {
  resolveHostedPayInFullEligibility,
} from "./pay-in-full.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));
const managed = [
  "HOSTED_PRODUCT_MODE",
  "STUDENTPAY_ENV",
  "NZ_STUDENTPAY_API_BASE_URL",
  "NZ_ENROLMENT_SESSION_SECRET",
  "E13_SANDBOX_PAY_IN_FULL_HOSTED_PREVIEW",
  "E13_INTERNAL_CANARY_HOSTED_ENABLED",
];
const previous: Record<string, string | undefined> = {};

function snapshotEnv() {
  for (const name of managed) {
    previous[name] = process.env[name];
    delete process.env[name];
  }
  process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
  process.env.STUDENTPAY_ENV = "sandbox";
  process.env.NZ_STUDENTPAY_API_BASE_URL = "https://sandbox-api.studentpay.co.nz";
  process.env.NZ_ENROLMENT_SESSION_SECRET = "unit-test-session-secret-key";
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

const student = {
  firstName: "Alex",
  lastName: "Student",
  email: "alex@example.co.nz",
  mobile: "0210000000",
  dateOfBirth: "1990-01-01",
  streetAddress: "1 Test Street",
  suburb: "Auckland",
  city: "Auckland",
  postcode: "1010",
  region: "Auckland",
  country: "New Zealand",
};

describe("OLI payment choice + footer", () => {
  it("exposes two cards only when Pay in Full is genuinely available", () => {
    const tenant = getNzTenantBySlug("oli")!;
    const course = getNzCourse("oli", "certificate-in-business-administration")!;
    const closed = resolveHostedPayInFullEligibility({ tenant, course });
    assert.equal(tenant.checkout.paymentOptions.pay_in_full.enabled, false);
    assert.equal(tenant.checkout.paymentOptions.pay_in_full.comingSoon, true);
    assert.equal(isPayInFullChoiceVisible(tenant.checkout.paymentOptions.pay_in_full), false);
    assert.equal(closed.payInFullAvailable, false);
    assert.equal(
      hostedCheckoutViewModel({
        paymentPlanAvailable: closed.paymentPlanAvailable,
        payInFullAvailable: closed.payInFullAvailable,
      }).flags.showPaymentMethodRadios,
      false,
    );

    process.env.E13_SANDBOX_PAY_IN_FULL_HOSTED_PREVIEW = "true";
    const preview = resolveHostedPayInFullEligibility({ tenant, course });
    assert.equal(preview.payInFullAvailable, true);
    const view = hostedCheckoutViewModel({
      paymentPlanAvailable: preview.paymentPlanAvailable,
      payInFullAvailable: preview.payInFullAvailable,
    });
    assert.equal(view.flags.showPaymentMethodRadios, true);
    assert.equal(view.flags.showPayInFullChoice, true);
    assert.equal(view.flags.showPaymentPlanChoice, true);
    assert.equal(view.selectedOption, "interest_free_payment_plan");
  });

  it("uses live catalogue Pay Now and Payment Plan amounts", () => {
    const course = getNzCourse("oli", "certificate-in-business-administration")!;
    const pub = toPublicCourse(course);
    assert.equal(pub.paymentInFullCourseFeeCents, 160425);
    assert.equal(pub.paymentPlanCourseFeeCents, 183425);
    assert.ok(pub.enrolmentPaymentOptions.includes("pay_in_full"));
    assert.ok(pub.enrolmentPaymentOptions.includes("payment_plan"));
  });

  it("Payment Plan selection renders DDA/PPA and Pay Now does not", () => {
    const plan = hostedCheckoutViewModel({
      paymentPlanAvailable: true,
      payInFullAvailable: true,
      selected: "interest_free_payment_plan",
      paymentChoiceTouched: true,
    });
    assert.equal(plan.flags.showDdaSection, true);
    assert.equal(plan.flags.showPpaLink, true);
    assert.equal(plan.flags.showPayInFullSummary, false);
    assert.ok(plan.presentTestIds.includes("nz-section-dda"));

    const payNow = hostedCheckoutViewModel({
      paymentPlanAvailable: true,
      payInFullAvailable: true,
      selected: "pay_in_full",
      paymentChoiceTouched: true,
    });
    assert.equal(payNow.flags.showDdaSection, false);
    assert.equal(payNow.flags.showPpaLink, false);
    assert.equal(payNow.flags.showPayInFullSummary, true);
    assert.ok(payNow.presentTestIds.includes("nz-section-card"));
    assert.ok(payNow.absentCopy.includes("Payment Plan Agreement"));
    assert.ok(payNow.absentTestIds.includes("nz-section-dda"));
  });

  it("switching before checkout creation is safe and locks after create", () => {
    assert.equal(paymentMethodSwitchLocked({ checkoutCreated: false }), false);
    assert.equal(paymentMethodSwitchLocked({ checkoutCreated: true }), true);
    const cleared = clearedStateForPaymentSwitch("pay_in_full");
    assert.equal(cleared.setupUrl, "");
    assert.equal(cleared.clientSecret, "");
    assert.equal(cleared.declarations.payment_plan_accepted, false);
    assert.equal(cleared.stripeSucceeded, false);
  });

  it("create/confirm payload contains the selected payment_option and no client amount", () => {
    const tenant = getNzTenantBySlug("oli")!;
    const course = getNzCourse("oli", "certificate-in-business-administration")!;
    const pif = hostedCheckoutCreatePlan({
      mode: "both_available",
      selectedOption: "pay_in_full",
    });
    assert.deepEqual(pif, { paymentOption: "pay_in_full" });
    const payload = buildPayInFullCreatePayload({
      tenant,
      course,
      student,
      providerOrderId: "HOSTED-TEST-1",
      successUrl: "https://enrol.studentpay.co.nz/enrol/oli/certificate-in-business-administration",
      cancelUrl: "https://enrol.studentpay.co.nz/enrol/oli/certificate-in-business-administration",
    });
    assert.equal(payload.payment_option, "pay_in_full");
    assert.equal("course_price" in payload, false);
    assert.equal("amount" in payload, false);

    const planPayload = buildCanonicalCreatePayload({
      tenant,
      course,
      student,
      plan: {
        paymentOption: "interest_free_payment_plan",
        upfrontAmountCents: 0,
        frequency: "Weekly",
        firstPaymentDate: "2026-09-23",
      },
      providerOrderId: "HOSTED-TEST-2",
      successUrl: "https://enrol.studentpay.co.nz/enrol/oli/certificate-in-business-administration?dda=return",
      cancelUrl: "https://enrol.studentpay.co.nz/enrol/oli/certificate-in-business-administration?dda=cancelled",
    });
    assert.equal(planPayload.plan.payment_type, "interest_free_payment_plan");
  });

  it("keeps current OLI footer contact values and no payment-card logos", () => {
    const pub = toPublicTenant(getNzTenantBySlug("oli")!);
    assert.deepEqual([...(pub.presentation.footerAddressLines || [])], [
      "Ground Floor",
      "26A Hobson Street",
      "Auckland Central 1010",
    ]);
    assert.deepEqual(
      pub.presentation.footerPhones?.map((item) => item.display),
      ["+64 9 870 8980", "0800 454 872"],
    );
    assert.equal(pub.supportEmail, "info@onlinelearninginstitute.co.nz");
    const footer = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/ProviderNativeFooter.tsx"),
      "utf8",
    );
    const chrome = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/provider-chrome.module.css"),
      "utf8",
    );
    for (const text of [footer, chrome]) {
      assert.doesNotMatch(text, /Afterpay/);
      assert.doesNotMatch(text, /Mastercard/);
      assert.doesNotMatch(text, /Visa/);
      assert.doesNotMatch(text, /American Express/);
    }
    assert.match(footer, /Payment services powered by StudentPay NZ/);
  });

  it("does not enable OLI Production Pay Now from the sandbox preview flag", () => {
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://api.studentpay.co.nz";
    process.env.E13_SANDBOX_PAY_IN_FULL_HOSTED_PREVIEW = "true";
    const tenant = getNzTenantBySlug("oli")!;
    const course = getNzCourse("oli", "certificate-in-business-administration")!;
    assert.equal(
      resolveHostedPayInFullEligibility({ tenant, course }).payInFullAvailable,
      false,
    );
  });
});
