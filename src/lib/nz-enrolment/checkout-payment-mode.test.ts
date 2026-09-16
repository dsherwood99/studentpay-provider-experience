import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  PIF_ONLY_CONTINUE_CTA,
  PIF_ONLY_JOURNEY_ATTRIBUTION,
  PIF_ONLY_PAYMENT_HEADING,
  PIF_ONLY_STUDENT_LEAD,
  hostedCheckoutConfirmDeclarations,
  hostedCheckoutCreatePlan,
  hostedCheckoutViewModel,
  initialHostedPaymentOption,
  resolveHostedPaymentMode,
  resolveHostedPaymentOption,
} from "./checkout-payment-mode.ts";
import { getNzCourse } from "./courses.ts";
import { resolveHostedPayInFullEligibility } from "./pay-in-full.ts";
import { formatNzdFromCents } from "./plan-math.ts";
import { getNzTenantBySlug } from "./tenants.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));
const checkoutSource = fs.readFileSync(
  path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
  "utf8",
);
const pageSource = fs.readFileSync(
  path.join(srcRoot, "app/enrol/[providerSlug]/[courseSlug]/page.tsx"),
  "utf8",
);

const managed = [
  "HOSTED_PRODUCT_MODE",
  "STUDENTPAY_ENV",
  "NZ_STUDENTPAY_API_BASE_URL",
  "E13_INTERNAL_CANARY_HOSTED_ENABLED",
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

const pifDeclarations = {
  payment_plan_accepted: true,
  information_confirmed: true,
  privacy_consent_accepted: true,
};

function canaryView(overrides?: Parameters<typeof hostedCheckoutViewModel>[0]) {
  process.env.E13_INTERNAL_CANARY_HOSTED_ENABLED = "true";
  const tenant = getNzTenantBySlug("studentpay-internal-e13")!;
  const course = getNzCourse("studentpay-internal-e13", "e13-prod-canary-001")!;
  const eligibility = resolveHostedPayInFullEligibility({ tenant, course });
  return hostedCheckoutViewModel({
    paymentPlanAvailable: eligibility.paymentPlanAvailable,
    payInFullAvailable: eligibility.payInFullAvailable,
    amountCents: course.paymentInFullCourseFeeCents,
    tenantAttribution: tenant.presentation.attributionLabel,
    declarations: pifDeclarations,
    ...overrides,
  });
}

describe("Hosted payment-mode matrix", () => {
  it("A. PLAN ONLY defaults to payment_plan with DDA/PPA and no PIF control", () => {
    const view = hostedCheckoutViewModel({
      paymentPlanAvailable: true,
      payInFullAvailable: false,
      amountCents: 120_000,
      tenantAttribution: "Payment plan powered by StudentPay NZ",
      declarations: pifDeclarations,
      plan: {
        upfrontAmountCents: 0,
        frequency: "Weekly",
        numberOfInstalments: 48,
        firstPaymentDate: "2026-10-01",
      },
    });
    assert.equal(view.mode, "plan_only");
    assert.equal(view.selectedOption, "interest_free_payment_plan");
    assert.equal(view.flags.showPaymentMethodRadios, false);
    assert.equal(view.flags.showPaymentPlanChoice, false);
    assert.equal(view.flags.showPayInFullChoice, false);
    assert.equal(view.flags.showDdaSection, true);
    assert.equal(view.flags.showPpaLink, true);
    assert.equal(view.flags.showDdsaLink, true);
    assert.equal(view.flags.showFirstPaymentDate, true);
    assert.equal(view.copy.confirmCta, "Confirm enrolment & activate payment plan");
    assert.equal(view.copy.continueCta, "Set up Direct Debit");
    assert.equal(view.createPlan?.paymentOption, "interest_free_payment_plan");
    assert.equal(
      view.confirmDeclarations && "payment_plan_accepted" in view.confirmDeclarations,
      true,
    );
  });

  it("B. BOTH AVAILABLE keeps the payment_plan default and lets the student switch", () => {
    const initial = hostedCheckoutViewModel({
      paymentPlanAvailable: true,
      payInFullAvailable: true,
      amountCents: 280_000,
      tenantAttribution: "Payment plan powered by StudentPay NZ",
      declarations: pifDeclarations,
      plan: {
        upfrontAmountCents: 1000,
        frequency: "Weekly",
        numberOfInstalments: 0,
        firstPaymentDate: "2026-10-01",
      },
    });
    assert.equal(initial.mode, "both_available");
    assert.equal(initial.selectedOption, "interest_free_payment_plan");
    assert.equal(initial.flags.showPaymentPlanChoice, true);
    assert.equal(initial.flags.showPayInFullChoice, true);
    assert.equal(initial.flags.showDdaSection, true);
    assert.equal(initial.flags.showPayInFullSummary, false);

    const selectedPif = hostedCheckoutViewModel({
      paymentPlanAvailable: true,
      payInFullAvailable: true,
      selected: "pay_in_full",
      paymentChoiceTouched: true,
      amountCents: 280_000,
      tenantAttribution: "Payment plan powered by StudentPay NZ",
      declarations: pifDeclarations,
    });
    assert.equal(selectedPif.selectedOption, "pay_in_full");
    assert.equal(selectedPif.flags.showDdaSection, false);
    assert.equal(selectedPif.flags.showFirstPaymentDate, false);
    assert.equal(selectedPif.flags.showPpaLink, false);
    assert.equal(selectedPif.flags.showPaymentPlanAccepted, false);
    assert.equal(selectedPif.flags.showPayInFullSummary, true);
    assert.equal(selectedPif.createPlan?.paymentOption, "pay_in_full");
    assert.equal(
      selectedPif.confirmDeclarations &&
        "payment_plan_accepted" in selectedPif.confirmDeclarations,
      false,
    );

    const backToPlan = hostedCheckoutViewModel({
      paymentPlanAvailable: true,
      payInFullAvailable: true,
      selected: "interest_free_payment_plan",
      paymentChoiceTouched: true,
      amountCents: 280_000,
      plan: {
        upfrontAmountCents: 1000,
        frequency: "Weekly",
        numberOfInstalments: 0,
        firstPaymentDate: "2026-10-01",
      },
    });
    assert.equal(backToPlan.flags.showDdaSection, true);
    assert.equal(backToPlan.createPlan?.paymentOption, "interest_free_payment_plan");
  });

  it("C. PIF ONLY selects pay_in_full from the first render and hides the plan path", () => {
    const view = canaryView();
    assert.equal(view.mode, "pif_only");
    assert.equal(view.selectedOption, "pay_in_full");
    assert.equal(initialHostedPaymentOption("pif_only"), "pay_in_full");
    assert.equal(view.flags.showPaymentPlanChoice, false);
    assert.equal(view.flags.showPayInFullChoice, false);
    assert.equal(view.flags.showPlanSchedule, false);
    assert.equal(view.flags.showFirstPaymentDate, false);
    assert.equal(view.flags.showDdaSection, false);
    assert.equal(view.flags.showPpaLink, false);
    assert.equal(view.flags.showDdsaLink, false);
    assert.equal(view.flags.showPaymentPlanAccepted, false);
    assert.equal(view.flags.allowPlanPreview, false);
    assert.equal(view.copy.paymentSectionTitle, PIF_ONLY_PAYMENT_HEADING);
    assert.equal(view.copy.studentLead, PIF_ONLY_STUDENT_LEAD);
    assert.equal(view.copy.continueCta, PIF_ONLY_CONTINUE_CTA);
    assert.equal(view.copy.confirmCta, "Pay $1.00");
    assert.equal(view.copy.journeyAttribution, PIF_ONLY_JOURNEY_ATTRIBUTION);
    assert.ok(view.visibleCopy.includes("Pay now"));
    assert.ok(view.absentTestIds.includes("nz-payment-plan-choice"));
    assert.ok(view.absentTestIds.includes("nz-section-dda"));
    for (const forbidden of [
      "Your payment plan",
      "Set up Direct Debit",
      "Payment Plan Agreement",
      "Direct Debit Service Agreement",
      "activate payment plan",
    ]) {
      assert.ok(view.absentCopy.includes(forbidden), `expected absent: ${forbidden}`);
    }
  });

  it("D. NEITHER fails closed and cannot create checkout", () => {
    const view = hostedCheckoutViewModel({
      paymentPlanAvailable: false,
      payInFullAvailable: false,
    });
    assert.equal(view.mode, "neither");
    assert.equal(view.selectedOption, null);
    assert.equal(view.flags.allowCheckoutCreate, false);
    assert.equal(view.createPlan, null);
    assert.equal(view.confirmDeclarations, null);
  });
});

describe("PIF-only initial state from internal canary eligibility", () => {
  it("internal canary eligibility gives pay_in_full with payment plan unavailable", () => {
    process.env.E13_INTERNAL_CANARY_HOSTED_ENABLED = "true";
    const tenant = getNzTenantBySlug("studentpay-internal-e13")!;
    const course = getNzCourse("studentpay-internal-e13", "e13-prod-canary-001")!;
    const eligibility = resolveHostedPayInFullEligibility({ tenant, course });
    assert.equal(course.courseCode, "E13_PROD_CANARY_001");
    assert.equal(course.paymentInFullCourseFeeCents, 100);
    assert.deepEqual([...course.enrolmentPaymentOptions!], ["pay_in_full"]);
    assert.equal(eligibility.payInFullAvailable, true);
    assert.equal(eligibility.paymentPlanAvailable, false);
    assert.equal(
      resolveHostedPaymentMode(eligibility),
      "pif_only",
    );
    assert.equal(initialHostedPaymentOption("pif_only"), "pay_in_full");
  });

  it("does not restore a payment-plan draft in PIF-only mode", () => {
    const resolved = resolveHostedPaymentOption({
      mode: "pif_only",
      selected: "interest_free_payment_plan",
      paymentChoiceTouched: true,
      storedDraftOption: "interest_free_payment_plan",
    });
    assert.equal(resolved, "pay_in_full");
  });
});

describe("PIF-only render contract", () => {
  it("authoritative price is 100 cents / $1.00 and plan chrome is absent", () => {
    const view = canaryView();
    assert.equal(formatNzdFromCents(100), "$1.00");
    assert.equal(view.copy.confirmCta, "Pay $1.00");
    assert.ok(view.presentTestIds.includes("nz-authoritative-price"));
    assert.ok(view.presentTestIds.includes("nz-pay-in-full-today"));
    assert.equal(view.flags.showPaymentPlanChoice, false);
    assert.equal(view.flags.showDdaSection, false);
    assert.equal(view.flags.showFirstPaymentDate, false);
    assert.equal(view.flags.showPpaLink, false);
    assert.equal(view.flags.showDdsaLink, false);
    assert.ok(!view.visibleCopy.includes("Confirm enrolment & activate payment plan"));
  });
});

describe("PIF-only create/confirm contract", () => {
  it("create sends payment_option=pay_in_full with no client price or DDA fields", () => {
    const create = hostedCheckoutCreatePlan({
      mode: "pif_only",
      selectedOption: "pay_in_full",
      plan: {
        upfrontAmountCents: 0,
        frequency: "Weekly",
        numberOfInstalments: 1,
        firstPaymentDate: "2026-10-01",
      },
    });
    assert.deepEqual(create, { paymentOption: "pay_in_full" });
    assert.equal(create && "upfrontAmountCents" in create, false);
    assert.equal(create && "firstPaymentDate" in create, false);
    assert.equal(JSON.stringify(create).includes("course_price"), false);
    assert.doesNotMatch(JSON.stringify(create), /dda|gocardless|direct_debit/i);
  });

  it("confirm has no dda_id and no payment_plan_accepted", () => {
    const confirm = hostedCheckoutConfirmDeclarations({
      selectedOption: "pay_in_full",
      declarations: {
        payment_plan_accepted: true,
        information_confirmed: true,
        privacy_consent_accepted: true,
      },
    });
    assert.deepEqual(confirm, {
      information_confirmed: true,
      privacy_consent_accepted: true,
    });
    assert.equal(confirm && "payment_plan_accepted" in confirm, false);
    assert.doesNotMatch(JSON.stringify(confirm), /dda_id|payment_plan_accepted/);
  });
});

describe("PLAN-ONLY OLI regression", () => {
  it("OLI remains payment_plan selected with DDA and PPA present", () => {
    process.env.STUDENTPAY_ENV = "sandbox";
    const tenant = getNzTenantBySlug("oli")!;
    const course = getNzCourse("oli", "certification-course")!;
    const eligibility = resolveHostedPayInFullEligibility({ tenant, course });
    const view = hostedCheckoutViewModel({
      paymentPlanAvailable: eligibility.paymentPlanAvailable,
      payInFullAvailable: eligibility.payInFullAvailable,
      amountCents: course.paymentPlanCourseFeeCents,
      tenantAttribution: tenant.presentation.attributionLabel,
      declarations: pifDeclarations,
      plan: {
        upfrontAmountCents: 0,
        frequency: "Weekly",
        numberOfInstalments: 48,
        firstPaymentDate: "2026-10-01",
      },
    });
    assert.equal(eligibility.payInFullAvailable, false);
    assert.equal(eligibility.paymentPlanAvailable, true);
    assert.equal(view.mode, "plan_only");
    assert.equal(view.selectedOption, "interest_free_payment_plan");
    assert.equal(view.flags.showDdaSection, true);
    assert.equal(view.flags.showPpaLink, true);
    assert.equal(view.flags.showPayInFullChoice, false);
    assert.equal(view.copy.confirmCta, "Confirm enrolment & activate payment plan");
  });
});

describe("EnrolmentCheckout consumes the payment-mode view model", () => {
  it("derives the initial option from eligibility instead of hardcoding payment_plan", () => {
    assert.match(checkoutSource, /from "@\/lib\/nz-enrolment\/checkout-payment-mode"/);
    assert.match(checkoutSource, /resolveHostedPaymentMode/);
    assert.match(checkoutSource, /initialHostedPaymentOption/);
    assert.match(checkoutSource, /hostedCheckoutViewModel|hostedCheckoutRenderFlags/);
    assert.match(checkoutSource, /hostedCheckoutCopy/);
    assert.match(checkoutSource, /hostedCheckoutCreatePlan/);
    assert.match(checkoutSource, /hostedCheckoutConfirmDeclarations/);
    assert.match(checkoutSource, /paymentPlanAvailable/);
    assert.doesNotMatch(
      checkoutSource,
      /useState<NzPaymentOptionId>\(\s*"interest_free_payment_plan"\s*\)/,
    );
    assert.match(pageSource, /paymentPlanAvailable=\{eligibility\.paymentPlanAvailable\}/);
  });

  it("does not render the payment-plan choice or DDA unless those flags are true", () => {
    assert.match(
      checkoutSource,
      /renderFlags\.showPaymentPlanChoice[\s\S]*nz-payment-plan-choice/,
    );
    assert.match(checkoutSource, /renderFlags\.showDdaSection[\s\S]*nz-section-dda/);
    assert.match(checkoutSource, /renderFlags\.showFirstPaymentDate[\s\S]*first-payment-date/);
    assert.match(checkoutSource, /renderFlags\.showPpaLink[\s\S]*Payment Plan Agreement/);
    assert.match(
      checkoutSource,
      /renderFlags\.showDdsaLink[\s\S]*Direct Debit Service Agreement/,
    );
    assert.match(checkoutSource, /copy\.paymentSectionTitle/);
    assert.match(checkoutSource, /copy\.confirmCta/);
    assert.match(checkoutSource, /nz-enrolment-unavailable/);
  });
});
