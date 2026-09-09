import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { buildCanonicalCreatePayload, previewCoursePlan } from "./canonical.ts";
import { getNzCourse, getNzCoursesForProvider } from "./courses.ts";
import {
  decodeNzCheckoutSession,
  encodeNzCheckoutSession,
} from "./session.ts";
import { getNzTenantBySlug, listActiveNzTenants, toPublicTenant } from "./tenants.ts";
import { dollarsToCents } from "./plan-math.ts";

const managed = [
  "HOSTED_PRODUCT_MODE",
  "STUDENTPAY_ENV",
  "NZ_ENROLMENT_SESSION_SECRET",
];
const previous: Record<string, string | undefined> = {};

function snapshotEnv() {
  for (const name of managed) {
    previous[name] = process.env[name];
    delete process.env[name];
  }
  process.env.STUDENTPAY_ENV = "sandbox";
  process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
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

describe("NZ enrolment tenant configuration", () => {
  it("loads OLI and a second fixture tenant from config only", () => {
    const oli = getNzTenantBySlug("oli");
    const fixture = getNzTenantBySlug("fixture-institute");
    assert.ok(oli);
    assert.ok(fixture);
    assert.equal(oli?.providerCode, "OLI_NZ");
    assert.equal(fixture?.providerCode, "SANDBOX_DEMO");
    assert.equal("apiBaseUrl" in oli!, false);
    assert.equal(listActiveNzTenants().length >= 2, true);
  });

  it("does not expose API key env names on the public tenant view", () => {
    const oli = getNzTenantBySlug("oli")!;
    const pub = toPublicTenant(oli);
    assert.equal("apiKeyEnv" in pub, false);
    assert.equal("apiBaseUrl" in pub, false);
    assert.equal("providerCode" in pub, false);
  });

  it("isolates courses by provider slug", () => {
    const oliCourses = getNzCoursesForProvider("oli");
    const fixtureCourses = getNzCoursesForProvider("fixture-institute");
    assert.equal(oliCourses.every((course) => course.providerSlug === "oli"), true);
    assert.equal(
      fixtureCourses.every((course) => course.providerSlug === "fixture-institute"),
      true,
    );
    assert.equal(getNzCourse("oli", "example-certificate"), undefined);
    assert.equal(getNzCourse("fixture-institute", "certification-course"), undefined);
  });
});

describe("OLI production catalogue", () => {
  it("imports 64 approved CSV courses that all reconcile in cents", () => {
    process.env.STUDENTPAY_ENV = "production";
    const courses = getNzCoursesForProvider("oli");
    assert.equal(courses.length, 64);
    assert.equal(new Set(courses.map((course) => course.slug)).size, 64);

    for (const course of courses) {
      assert.equal(course.planPolicy.mode, "derived_regular");
      if (course.planPolicy.mode !== "derived_regular") {
        continue;
      }
      const preview = previewCoursePlan(course, { firstPaymentDate: "2026-10-01" });
      assert.equal(preview.upfrontAmountCents, 0);
      assert.equal(preview.frequency, "Weekly");
      assert.equal(preview.regularInstalmentAmountCents, 2500);
      assert.equal(
        preview.fullRegularInstalmentCount * 2500 +
          (preview.finalInstalmentAmountCents || 0),
        course.paymentPlanCourseFeeCents,
      );
      assert.ok(course.paymentInFullCourseFeeCents > 0);
      assert.notEqual(
        course.paymentInFullCourseFeeCents,
        preview.upfrontAmountCents,
      );
    }
  });

  it("keeps the sandbox certification fixture available only in sandbox", () => {
    const sandboxCourse = getNzCourse("oli", "certification-course");
    assert.ok(sandboxCourse);
    const payload = buildCanonicalCreatePayload({
      tenant: getNzTenantBySlug("oli")!,
      course: sandboxCourse!,
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
    assert.equal(payload.course.course_code, "OLI_SANDBOX_CERT_COURSE");
    assert.equal(payload.pricing.course_price, 1200);
    assert.equal(payload.pricing.upfront_payment, 0);
    assert.equal(payload.plan.number_of_instalments, 48);
    assert.equal(payload.plan.instalment_amount, 25);
    assert.equal(payload.plan.final_instalment_amount, undefined);
  });

  it("maps a residual OLI course without pretending 74 × $25", () => {
    process.env.STUDENTPAY_ENV = "production";
    const course = getNzCourse("oli", "certificate-in-psychology-counselling")!;
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
      providerOrderId: "OLI-RESIDUAL-MATH-TEST",
      successUrl: "https://example.test/return",
      cancelUrl: "https://example.test/cancel",
    });
    assert.equal(payload.course.course_code, "PSY101");
    assert.equal(payload.pricing.course_price, 1834.25);
    assert.equal(payload.pricing.upfront_payment, 0);
    assert.equal(payload.plan.instalment_amount, 25);
    assert.equal(payload.plan.number_of_instalments, 74);
    assert.equal(payload.plan.final_instalment_amount, 9.25);
    assert.equal(payload.pricing.amount_to_finance, 1834.25);
    assert.notEqual(
      payload.plan.number_of_instalments * payload.plan.instalment_amount,
      payload.pricing.amount_to_finance,
    );
  });
});

describe("NZ enrolment session", () => {
  it("round-trips a signed session and keeps the checkout token server-side", () => {
    const encoded = encodeNzCheckoutSession({
      providerSlug: "oli",
      courseSlug: "certification-course",
      providerOrderId: "OLI-HOSTED-CERT-TEST",
      checkoutToken: "secret-token",
    });
    const decoded = decodeNzCheckoutSession(encoded);
    assert.equal(decoded?.checkoutToken, "secret-token");
    assert.equal(decodeNzCheckoutSession(`${encoded}tampered`), null);
  });
});

describe("cent conversion", () => {
  it("round-trips dollars through integer cents without float drift", () => {
    assert.equal(dollarsToCents(15), 1500);
    assert.equal(dollarsToCents("1834.25"), 183425);
  });
});
