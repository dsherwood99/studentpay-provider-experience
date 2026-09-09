import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { previewPlan, dollarsToCents, centsToApiAmount } from "./plan-math.ts";
import { buildCanonicalCreatePayload } from "./canonical.ts";
import { getNzCourse, getNzCoursesForProvider } from "./courses.ts";
import { getNzTenantBySlug, listActiveNzTenants, toPublicTenant } from "./tenants.ts";
import {
  decodeNzCheckoutSession,
  encodeNzCheckoutSession,
} from "./session.ts";

describe("NZ enrolment tenant configuration", () => {
  it("loads OLI and a second fixture tenant from config only", () => {
    const oli = getNzTenantBySlug("oli");
    const fixture = getNzTenantBySlug("fixture-institute");
    assert.ok(oli);
    assert.ok(fixture);
    assert.equal(oli?.providerCode, "OLI_NZ");
    assert.equal(fixture?.providerCode, "SANDBOX_DEMO");
    assert.notEqual(oli?.slug, fixture?.slug);
    assert.equal(listActiveNzTenants().length >= 2, true);
  });

  it("does not expose API key env names on the public tenant view", () => {
    const oli = getNzTenantBySlug("oli");
    assert.ok(oli);
    const pub = toPublicTenant(oli!);
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

describe("NZ enrolment plan preview maths", () => {
  it("enforces equal instalment invariants in integer cents", () => {
    const preview = previewPlan({
      coursePriceCents: 120_000,
      upfrontAmountCents: 0,
      frequency: "Weekly",
      numberOfInstalments: 48,
      firstPaymentDate: "2026-10-01",
    });
    assert.equal(preview.amountToFinanceCents, 120_000);
    assert.equal(preview.instalmentAmountCents, 2500);
    assert.equal(
      preview.numberOfInstalments * preview.instalmentAmountCents,
      preview.amountToFinanceCents,
    );
    assert.equal(
      preview.coursePriceCents - preview.upfrontAmountCents,
      preview.amountToFinanceCents,
    );
  });

  it("rejects plans that do not divide evenly", () => {
    assert.throws(() =>
      previewPlan({
        coursePriceCents: 120_000,
        upfrontAmountCents: 100,
        frequency: "Weekly",
        numberOfInstalments: 48,
        firstPaymentDate: "2026-10-01",
      }),
    );
  });

  it("round-trips dollars through integer cents without float drift", () => {
    assert.equal(dollarsToCents(15), 1500);
    assert.equal(centsToApiAmount(1500), 15);
    assert.equal(centsToApiAmount(dollarsToCents(2790)), 2790);
  });
});

describe("NZ enrolment session", () => {
  it("round-trips a signed session and keeps the checkout token server-side", () => {
    process.env.NZ_ENROLMENT_SESSION_SECRET = "unit-test-session-secret-key";
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

describe("canonical create mapping", () => {
  it("sends the configured course price, not a browser-supplied price", () => {
    const tenant = getNzTenantBySlug("oli")!;
    const course = getNzCourse("oli", "certification-course")!;
    const payload = buildCanonicalCreatePayload({
      tenant,
      course,
      student: {
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
      },
      plan: {
        paymentOption: "interest_free_payment_plan",
        upfrontAmountCents: 0,
        frequency: "Weekly",
        numberOfInstalments: 48,
        firstPaymentDate: "2026-10-01",
      },
      providerOrderId: "OLI-HOSTED-CERT-TEST",
      successUrl: "https://example.test/enrol/oli/certification-course?dda=return",
      cancelUrl: "https://example.test/enrol/oli/certification-course?dda=cancelled",
    });

    assert.equal(payload.provider.provider_code, "OLI_NZ");
    assert.equal(payload.course.course_code, "OLI_SANDBOX_CERT_COURSE");
    assert.equal(payload.pricing.course_price, 1200);
    assert.equal(payload.pricing.upfront_payment, 0);
    assert.equal(payload.pricing.amount_to_finance, 1200);
    assert.equal(payload.plan.instalment_amount, 25);
    assert.equal(payload.plan.number_of_instalments, 48);
    assert.equal(payload.plan.payment_type, "interest_free_payment_plan");
  });
});
