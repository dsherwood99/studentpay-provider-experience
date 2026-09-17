import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  buildCanonicalConfirmPayload,
  buildCanonicalCreatePayload,
  buildPayInFullConfirmPayload,
  buildPayInFullCreatePayload,
  previewCoursePlan,
} from "./canonical.ts";
import { getNzCourse, getNzCoursesForProvider, toPublicCourse } from "./courses.ts";
import {
  NZ_CONFIRM_CTA,
  NZ_DIRECT_DEBIT_CTA,
} from "./checkout-ui.ts";
import {
  HOSTED_E13_API_SHA,
  authoritativePayInFullPriceCents,
  isLiveStripePublishableKey,
  hostedStripePublishableKeyIsSafe,
  isHostedPayInFullEnvironmentAllowed,
  isTestStripePublishableKey,
  publicCardPayment,
  resolveHostedPayInFullEligibility,
} from "./pay-in-full.ts";
import {
  enrolmentCompleteFromBrowser,
  payInFullDeclarationsAccepted,
  payInFullFailureCopy,
  payInFullPhase,
  payInFullReviewErrorAfterPayment,
  payInFullSuccessContainsForbiddenCopy,
  payInFullSuccessCopy,
  sameCheckoutResume,
  shouldCreatePayInFullCheckout,
  shouldReuseProviderOrderId,
} from "./pay-in-full-flow.ts";
import { hostedErrorMessage } from "./errors.ts";
import { getDefaultProductionNzTenantSlug, getNzTenantBySlug } from "./tenants.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));
const managed = [
  "HOSTED_PRODUCT_MODE",
  "STUDENTPAY_ENV",
  "NZ_STUDENTPAY_API_BASE_URL",
  "NZ_ENROLMENT_SESSION_SECRET",
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

describe("Hosted E13 eligibility", () => {
  it("1. hides Pay in Full where the course is plan-only", () => {
    const tenant = getNzTenantBySlug("oli")!;
    const course = getNzCourse("oli", "certification-course")!;
    const eligibility = resolveHostedPayInFullEligibility({ tenant, course });
    assert.equal(eligibility.courseAllows, false);
    assert.equal(eligibility.payInFullAvailable, false);
    assert.equal(eligibility.paymentPlanAvailable, true);
  });

  it("2. shows Pay in Full only when env, provider, and catalogue all allow it", () => {
    const tenant = getNzTenantBySlug("bela-nz")!;
    const course = getNzCourse("bela-nz", "lash-business-bundle")!;
    const eligibility = resolveHostedPayInFullEligibility({ tenant, course });
    assert.equal(eligibility.environmentAllowed, true);
    assert.equal(eligibility.providerEnabled, true);
    assert.equal(eligibility.courseAllows, true);
    assert.equal(eligibility.payInFullAvailable, true);
  });

  it("3. still shows Payment Plan when Pay in Full is available", () => {
    const tenant = getNzTenantBySlug("bela-nz")!;
    const course = getNzCourse("bela-nz", "lash-business-bundle")!;
    const eligibility = resolveHostedPayInFullEligibility({ tenant, course });
    assert.equal(eligibility.paymentPlanAvailable, true);
    assert.equal(toPublicCourse(course).enrolmentPaymentOptions.includes("payment_plan"), true);
  });

  it("does not expose Pay in Full on Bela in production Hosted", () => {
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://api.studentpay.co.nz";
    assert.equal(isHostedPayInFullEnvironmentAllowed(), true);
    assert.equal(getNzTenantBySlug("bela-nz"), undefined);
    const oli = getNzTenantBySlug("oli")!;
    const course = getNzCoursesForProvider("oli")[0]!;
    assert.equal(
      resolveHostedPayInFullEligibility({ tenant: oli, course }).payInFullAvailable,
      true,
    );
    assert.equal(getNzTenantBySlug("studentpay-internal-e13"), undefined);
  });
});

describe("Hosted E13 price and create contract", () => {
  it("4. displays the authoritative E3 price for Bela", () => {
    const course = getNzCourse("bela-nz", "lash-business-bundle")!;
    assert.equal(course.paymentInFullCourseFeeCents, 280_000);
    assert.equal(
      authoritativePayInFullPriceCents({
        catalogueCents: course.paymentInFullCourseFeeCents,
        serverCoursePrice: 2800,
      }),
      280_000,
    );
  });

  it("5. lets the server price win over conflicting client data", () => {
    assert.equal(
      authoritativePayInFullPriceCents({
        catalogueCents: 999_999,
        serverCoursePrice: 2800,
      }),
      280_000,
    );
  });

  it("6. Pay in Full create sends payment_option and no client price", () => {
    const payload = buildPayInFullCreatePayload({
      tenant: getNzTenantBySlug("bela-nz")!,
      course: getNzCourse("bela-nz", "lash-business-bundle")!,
      student,
      providerOrderId: "HOSTED-BELA_NZ-UNIT",
      successUrl: "https://example.test/enrol/bela-nz/lash-business-bundle",
      cancelUrl: "https://example.test/enrol/bela-nz/lash-business-bundle",
    });
    assert.equal(payload.payment_option, "pay_in_full");
    assert.equal(payload.course.course_code, "BELA_LASH_BUSINESS_BUNDLE");
    assert.equal("pricing" in payload, false);
    assert.equal("plan" in payload, false);
    assert.equal(JSON.stringify(payload).includes("course_price"), false);
  });

  it("7. does not enter the DDA path on Pay in Full create or confirm", () => {
    const createPayload = buildPayInFullCreatePayload({
      tenant: getNzTenantBySlug("bela-nz")!,
      course: getNzCourse("bela-nz", "lash-business-bundle")!,
      student,
      providerOrderId: "HOSTED-BELA_NZ-UNIT",
      successUrl: "https://example.test/return",
      cancelUrl: "https://example.test/cancel",
    });
    const confirmPayload = buildPayInFullConfirmPayload({
      tenant: getNzTenantBySlug("bela-nz")!,
      providerOrderId: "HOSTED-BELA_NZ-UNIT",
      checkoutId: "BELA_NZ-CHECKOUT",
      opportunityId: "006UNIT",
      declarations: {
        information_confirmed: true,
        privacy_consent_accepted: true,
      },
    });
    assert.equal(confirmPayload.payment_option, "pay_in_full");
    assert.equal("dda_id" in confirmPayload.checkout, false);
    assert.equal("payment_plan_accepted" in confirmPayload.declarations, false);
    assert.match(JSON.stringify(createPayload), /pay_in_full/);
    assert.doesNotMatch(JSON.stringify(createPayload), /direct_debit|gocardless|dda/i);
    assert.doesNotMatch(JSON.stringify(confirmPayload), /dda_id|payment_plan_accepted/);
  });
});

describe("Hosted E13 Pay in Full confirm contract", () => {
  const confirmPayload = () =>
    buildPayInFullConfirmPayload({
      tenant: getNzTenantBySlug("bela-nz")!,
      providerOrderId: "HOSTED-BELA_NZ-UNIT",
      checkoutId: "BELA_NZ-CHECKOUT",
      opportunityId: "006UNIT",
      declarations: {
        information_confirmed: true,
        privacy_consent_accepted: true,
      },
    });

  it("includes payment_option=pay_in_full", () => {
    assert.equal(confirmPayload().payment_option, "pay_in_full");
  });

  it("includes provider, checkout, opportunity, and PIF declarations", () => {
    const payload = confirmPayload();
    assert.equal(payload.provider.provider_code, "BELA_NZ");
    assert.equal(payload.provider.provider_order_id, "HOSTED-BELA_NZ-UNIT");
    assert.equal(payload.checkout.checkout_id, "BELA_NZ-CHECKOUT");
    assert.equal(payload.checkout.opportunity_id, "006UNIT");
    assert.equal(payload.declarations.information_confirmed, true);
    assert.equal(payload.declarations.privacy_consent_accepted, true);
  });

  it("does not include payment-plan confirm fields", () => {
    const serialized = JSON.stringify(confirmPayload());
    assert.doesNotMatch(serialized, /checkout_token/);
    assert.doesNotMatch(serialized, /dda_id/);
    assert.doesNotMatch(serialized, /payment_method/);
    assert.doesNotMatch(serialized, /first_payment_date/);
    assert.doesNotMatch(serialized, /deposit_confirmed/);
    assert.doesNotMatch(serialized, /payment_plan_accepted/);
    assert.equal("payment" in confirmPayload(), false);
    assert.equal("plan" in confirmPayload(), false);
  });

  it("leaves the payment-plan confirm payload unchanged", () => {
    const confirm = buildCanonicalConfirmPayload({
      tenant: getNzTenantBySlug("oli")!,
      providerOrderId: "OLI-HOSTED-CERT-TEST",
      checkoutId: "chk",
      checkoutToken: "tok",
      opportunityId: "006",
      ddaId: "a0A",
      firstPaymentDate: "2026-10-01",
      declarations: {
        payment_plan_accepted: true,
        information_confirmed: true,
        privacy_consent_accepted: true,
      },
    });
    assert.equal("payment_option" in confirm, false);
    assert.equal(confirm.checkout.checkout_token, "tok");
    assert.equal(confirm.checkout.dda_id, "a0A");
    assert.equal(confirm.payment.payment_method, "studentpay_payment_plan");
    assert.equal(confirm.payment.first_payment_date, "2026-10-01");
    assert.equal(confirm.payment.deposit_confirmed, true);
    assert.equal(confirm.declarations.payment_plan_accepted, true);
  });

  it("Hosted confirm route forwards payment_option=pay_in_full for a PIF session", () => {
    const confirmRoute = fs.readFileSync(
      path.join(srcRoot, "app/api/enrolment-checkout/confirm/route.ts"),
      "utf8",
    );
    assert.match(confirmRoute, /buildPayInFullConfirmPayload\(/);
    assert.match(
      confirmRoute,
      /const payload = payInFull\s*\?[\s\S]*buildPayInFullConfirmPayload\([\s\S]*\)\s*:[\s\S]*buildCanonicalConfirmPayload/,
    );
    assert.match(
      confirmRoute,
      /canonicalConfirm\(\{[\s\S]*payload,[\s\S]*\}\)/,
    );
    assert.doesNotMatch(confirmRoute, /delete \(payload as \{[^}]*\}\)\.payment_option/);
    assert.doesNotMatch(confirmRoute, /payload\.payment_option =/);
    const builder = fs.readFileSync(
      path.join(srcRoot, "lib/nz-enrolment/canonical.ts"),
      "utf8",
    );
    assert.match(
      builder,
      /export function buildPayInFullConfirmPayload[\s\S]*return \{\s*payment_option: "pay_in_full"/,
    );
  });

  it("does not show generic field-validation copy after a successful payment", () => {
    const generic = hostedErrorMessage(
      "VALIDATION_ERROR",
      "Invalid provider checkout confirmation payload.",
    );
    assert.equal(generic, "Please check the highlighted fields and try again.");
    assert.equal(payInFullReviewErrorAfterPayment(generic), undefined);
    assert.equal(
      payInFullReviewErrorAfterPayment("Your enrolment session expired. Please start again."),
      "Your enrolment session expired. Please start again.",
    );
    const copy = payInFullFailureCopy("server_error_after_payment");
    assert.equal(copy.title, "Payment received — enrolment still confirming");
    assert.match(copy.body, /Do not pay again/);
    const checkoutSource = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    assert.match(checkoutSource, /payInFullReviewErrorAfterPayment/);
    assert.match(checkoutSource, /let paymentReceived = stripeSucceeded/);
    assert.match(
      checkoutSource,
      /if \(paymentReceived\) \{[\s\S]*review: payInFullReviewErrorAfterPayment\(message\)/,
    );
  });
});

describe("Hosted E13 Stripe and completion", () => {
  it("8. initialises Stripe Elements only with the env-matching publishable key", () => {
    assert.equal(isTestStripePublishableKey("pk_test_abc"), true);
    assert.equal(isTestStripePublishableKey("pk_live_abc"), false);
    assert.equal(isLiveStripePublishableKey("pk_live_abc"), true);
    assert.equal(hostedStripePublishableKeyIsSafe("pk_test_abc"), true);
    assert.equal(hostedStripePublishableKeyIsSafe("pk_live_abc"), false);
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://api.studentpay.co.nz";
    assert.equal(hostedStripePublishableKeyIsSafe("pk_live_abc"), true);
    assert.equal(hostedStripePublishableKeyIsSafe("pk_test_abc"), false);
    const cardForm = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/PayInFullCardForm.tsx"),
      "utf8",
    );
    assert.match(cardForm, /@stripe\/stripe-js/);
    assert.match(cardForm, /elements\.create\("payment"/);
    assert.match(cardForm, /pk_test_/);
    assert.match(cardForm, /pk_live_/);
  });

  it("9-10. Stripe success polls the server and is not enrolment completion", () => {
    assert.equal(
      enrolmentCompleteFromBrowser({
        stripeSucceeded: true,
        ledgerPosted: true,
        checkoutStatus: "payment_required",
      }),
      false,
    );
    assert.equal(
      enrolmentCompleteFromBrowser({
        stripeSucceeded: true,
        ledgerPosted: true,
        checkoutStatus: "confirmed",
      }),
      true,
    );
  });

  it("11. PAYMENT_PROCESSING is a wait state, not a new charge", () => {
    const phase = payInFullPhase({
      confirmed: false,
      stripeSucceeded: false,
      ledgerPosted: false,
      confirmCode: "PAYMENT_PROCESSING",
      serverErrorAfterPayment: false,
      hasClientSecret: true,
    });
    const copy = payInFullFailureCopy(phase);
    assert.equal(phase, "processing");
    assert.equal(copy.inviteAnotherPayment, false);
    assert.match(copy.body, /Do not pay again/);
  });

  it("12. PAYMENT_FAILED allows a safe retry", () => {
    const copy = payInFullFailureCopy("failed");
    assert.equal(copy.allowRetry, true);
    assert.match(copy.title, /Payment not completed/);
  });

  it("13. already_confirmed is treated as success", () => {
    assert.equal(
      enrolmentCompleteFromBrowser({
        stripeSucceeded: false,
        ledgerPosted: false,
        checkoutStatus: "confirmed",
      }),
      true,
    );
  });

  it("14. refresh resumes the same checkout id", () => {
    assert.equal(
      sameCheckoutResume({
        previousCheckoutId: "BELA_NZ-1",
        nextCheckoutId: "BELA_NZ-1",
      }),
      true,
    );
    assert.equal(
      sameCheckoutResume({
        previousCheckoutId: "BELA_NZ-1",
        nextCheckoutId: "BELA_NZ-2",
      }),
      false,
    );
  });

  it("15. double submit reuses the session provider_order_id", () => {
    assert.equal(
      shouldCreatePayInFullCheckout({
        eligible: true,
        studentValid: true,
        alreadyCreated: true,
        userClickedContinue: true,
        busy: false,
      }),
      false,
    );
    assert.equal(
      shouldReuseProviderOrderId({
        sessionProviderSlug: "bela-nz",
        sessionCourseSlug: "lash-business-bundle",
        providerSlug: "bela-nz",
        courseSlug: "lash-business-bundle",
        sessionProviderOrderId: "HOSTED-BELA_NZ-STABLE",
      }),
      true,
    );
  });
});

describe("Hosted E13 success and payment-plan regression", () => {
  it("16-17. success page uses Pay in Full wording with no plan/DD copy", () => {
    const copy = payInFullSuccessCopy({
      courseName: "Lash Business Bundle",
      providerName: "Bela Beauty College",
      amountLabel: "$2,800.00",
      checkoutId: "BELA_NZ-REF",
    });
    assert.equal(copy.heading, "Enrolment confirmed");
    assert.match(copy.rows.map((row) => row.value).join(" "), /Card/);
    assert.match(copy.rows.map((row) => row.label).join(" "), /Payment received/);
    const text = `${copy.heading} ${copy.lead} ${copy.rows.map((row) => `${row.label} ${row.value}`).join(" ")}`;
    assert.equal(payInFullSuccessContainsForbiddenCopy(text), false);
    assert.doesNotMatch(text, /Direct Debit|GoCardless|Payment Plan Agreement|instalment schedule/i);
  });

  it("18. Payment Plan create payload is unchanged for OLI", () => {
    const course = getNzCourse("oli", "certification-course")!;
    const payload = buildCanonicalCreatePayload({
      tenant: getNzTenantBySlug("oli")!,
      course,
      student,
      plan: {
        paymentOption: "interest_free_payment_plan",
        upfrontAmountCents: 0,
        frequency: "Weekly",
        firstPaymentDate: "2026-10-01",
      },
      providerOrderId: "OLI-HOSTED-CERT-TEST",
      successUrl: "https://example.test/enrol/oli/certification-course?dda=return",
      cancelUrl: "https://example.test/enrol/oli/certification-course?dda=cancelled",
    });
    assert.equal(payload.plan.payment_type, "interest_free_payment_plan");
    assert.equal(payload.pricing.course_price, 1200);
    const confirm = buildCanonicalConfirmPayload({
      tenant: getNzTenantBySlug("oli")!,
      providerOrderId: "OLI-HOSTED-CERT-TEST",
      checkoutId: "chk",
      checkoutToken: "tok",
      opportunityId: "006",
      ddaId: "a0A",
      firstPaymentDate: "2026-10-01",
      declarations: {
        payment_plan_accepted: true,
        information_confirmed: true,
        privacy_consent_accepted: true,
      },
    });
    assert.equal(confirm.checkout.dda_id, "a0A");
    assert.equal(confirm.declarations.payment_plan_accepted, true);
    assert.equal("payment_option" in confirm, false);
    assert.equal(confirm.checkout.checkout_token, "tok");
    assert.equal(confirm.payment.payment_method, "studentpay_payment_plan");
  });

  it("19. OLI production Hosted exposes Pay Now while catalogue carries both prices", () => {
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://api.studentpay.co.nz";
    const tenant = getNzTenantBySlug("oli")!;
    const courses = getNzCoursesForProvider("oli");
    assert.equal(courses.length, 64);
    assert.equal(tenant.checkout.paymentOptions.pay_in_full.enabled, true);
    assert.equal(tenant.checkout.paymentOptions.pay_in_full.comingSoon, false);
    for (const course of courses) {
      assert.equal(course.paymentInFullCourseFeeCents > 0, true);
      assert.equal(
        resolveHostedPayInFullEligibility({ tenant, course }).payInFullAvailable,
        true,
      );
    }
    assert.equal(NZ_DIRECT_DEBIT_CTA, "Set up Direct Debit");
    assert.equal(NZ_CONFIRM_CTA, "Confirm enrolment & activate payment plan");
  });

  it("20. Bela payment-plan preview still uses E7 weekly terms", () => {
    const course = getNzCourse("bela-nz", "lash-business-bundle")!;
    const preview = previewCoursePlan(course, { firstPaymentDate: "2026-10-01" });
    assert.equal(preview.coursePriceCents, 280_000);
    assert.equal(preview.upfrontAmountCents, 1000);
    assert.equal(preview.regularInstalmentAmountCents, 1500);
    assert.equal(preview.frequency, "Weekly");
    const planPayload = buildCanonicalCreatePayload({
      tenant: getNzTenantBySlug("bela-nz")!,
      course,
      student,
      plan: {
        paymentOption: "interest_free_payment_plan",
        upfrontAmountCents: 1000,
        frequency: "Weekly",
        firstPaymentDate: "2026-10-01",
      },
      providerOrderId: "HOSTED-BELA-PLAN",
      successUrl: "https://example.test/enrol/bela-nz/lash-business-bundle?dda=return",
      cancelUrl: "https://example.test/enrol/bela-nz/lash-business-bundle?dda=cancelled",
    });
    assert.equal(planPayload.plan.payment_type, "interest_free_payment_plan");
    assert.equal("payment_option" in planPayload, false);
  });

  it("records the E13 API SHA Hosted was built against", () => {
    assert.equal(HOSTED_E13_API_SHA, "78b2e4439b0ad31e5c766793b8bc1f85523293c6");
  });

  it("does not put Stripe payment ids in the public card payload helper", () => {
    const publicCard = publicCardPayment({
      required: true,
      payment_status: "requires_payment_method",
      amount: 2800,
      client_secret: "pi_secret_test",
      publishable_key: "pk_test_abc",
      ledger_posted: false,
    });
    assert.equal(publicCard && "payment_id" in publicCard, false);
    assert.equal(payInFullDeclarationsAccepted({
      information_confirmed: true,
      privacy_consent_accepted: true,
    }), true);
  });

  it("internal Production canary is hidden until explicitly enabled", () => {
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://api.studentpay.co.nz";
    assert.equal(getNzTenantBySlug("studentpay-internal-e13"), undefined);
    assert.equal(
      getNzCourse("studentpay-internal-e13", "e13-prod-canary-001"),
      undefined,
    );
    assert.equal(getDefaultProductionNzTenantSlug(), "oli");
  });

  it("internal Production canary is eligible only when Hosted flag, env, provider, and catalogue align", () => {
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://api.studentpay.co.nz";
    process.env.E13_INTERNAL_CANARY_HOSTED_ENABLED = "true";
    const tenant = getNzTenantBySlug("studentpay-internal-e13")!;
    const course = getNzCourse("studentpay-internal-e13", "e13-prod-canary-001")!;
    const eligibility = resolveHostedPayInFullEligibility({ tenant, course });
    assert.equal(tenant.internalCanary, true);
    assert.equal(course.paymentInFullCourseFeeCents, 100);
    assert.equal(
      authoritativePayInFullPriceCents({
        catalogueCents: course.paymentInFullCourseFeeCents,
        serverCoursePrice: 1,
      }),
      100,
    );
    assert.equal(eligibility.environmentAllowed, true);
    assert.equal(eligibility.providerEnabled, true);
    assert.equal(eligibility.courseAllows, true);
    assert.equal(eligibility.payInFullAvailable, true);
    assert.equal(eligibility.paymentPlanAvailable, false);
    assert.equal(getDefaultProductionNzTenantSlug(), "oli");
    const payload = buildPayInFullCreatePayload({
      tenant,
      course,
      student,
      providerOrderId: "HOSTED-E13-CANARY-UNIT",
      successUrl: "https://example.test/enrol/studentpay-internal-e13/e13-prod-canary-001",
      cancelUrl: "https://example.test/enrol/studentpay-internal-e13/e13-prod-canary-001",
    });
    assert.equal(payload.payment_option, "pay_in_full");
    assert.equal("pricing" in payload, false);
  });
});
