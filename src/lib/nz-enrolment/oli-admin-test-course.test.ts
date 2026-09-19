import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  buildCanonicalCreatePayload,
  buildPayInFullCreatePayload,
  previewCoursePlan,
} from "./canonical.ts";
import { getNzCourse, getNzCoursesForProvider, toPublicCourse } from "./courses.ts";
import { overlayNzCourseFromApi } from "./api-catalogue-overlay.ts";
import { resolveHostedPayInFullEligibility } from "./pay-in-full.ts";
import { getNzTenantBySlug } from "./tenants.ts";

const managed = [
  "HOSTED_PRODUCT_MODE",
  "STUDENTPAY_ENV",
  "NZ_STUDENTPAY_API_BASE_URL",
  "NZ_ENROLMENT_SESSION_SECRET",
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
  firstName: "Taylor",
  lastName: "Testdata",
  email: "oli.test.001.sandbox@example.test",
  mobile: "0210000001",
  dateOfBirth: "1994-09-18",
  streetAddress: "1 Sandbox Lane",
  suburb: "Auckland",
  city: "Auckland",
  postcode: "1010",
  region: "Auckland",
  country: "New Zealand",
};

describe("OLI_TEST_001 sandbox admin fixture", () => {
  it("looks up the test course in sandbox with both payment options", () => {
    const course = getNzCourse("oli", "studentpay-test-course");
    assert.ok(course);
    assert.equal(course?.courseCode, "OLI_TEST_001");
    assert.equal(course?.slug, "studentpay-test-course");
    assert.equal(course?.providerSlug, "oli");
    assert.equal(course?.name, "OLI Test Course – StudentPay");
    assert.equal(course?.sandboxOnly, true);
    assert.equal(course?.status, "active");
    assert.equal(course?.paymentInFullCourseFeeCents, 1000);
    assert.equal(course?.paymentPlanCourseFeeCents, 1000);
    assert.deepEqual(course?.enrolmentPaymentOptions, [
      "payment_plan",
      "pay_in_full",
    ]);

    const pub = toPublicCourse(course!);
    assert.deepEqual(pub.enrolmentPaymentOptions, ["payment_plan", "pay_in_full"]);
    assert.equal(pub.paymentInFullCourseFeeCents, 1000);
    assert.equal(pub.paymentPlanCourseFeeCents, 1000);
  });

  it("is hidden in Production and is not in the approved OLI production catalogue", () => {
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://api.studentpay.co.nz";

    assert.equal(getNzCourse("oli", "studentpay-test-course"), undefined);
    const productionOli = getNzCoursesForProvider("oli");
    assert.equal(productionOli.length, 64);
    assert.equal(
      productionOli.some((course) => course.courseCode === "OLI_TEST_001"),
      false,
    );
    assert.equal(
      productionOli.some((course) => course.slug === "studentpay-test-course"),
      false,
    );

    const productionJson = JSON.parse(
      fs.readFileSync(
        path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          "catalogues/oli-production.json",
        ),
        "utf8",
      ),
    ) as Array<{ courseCode: string; slug: string }>;
    assert.equal(productionJson.length, 64);
    assert.equal(
      productionJson.some((row) => row.courseCode === "OLI_TEST_001"),
      false,
    );
  });

  it("exposes Pay Now and Payment Plan through the normal OLI checkout shell", () => {
    const tenant = getNzTenantBySlug("oli")!;
    const course = getNzCourse("oli", "studentpay-test-course")!;
    const eligibility = resolveHostedPayInFullEligibility({ tenant, course });
    assert.equal(tenant.slug, "oli");
    assert.equal(tenant.checkout.paymentOptions.pay_in_full.enabled, true);
    assert.equal(
      tenant.checkout.paymentOptions.interest_free_payment_plan.enabled,
      true,
    );
    assert.equal(eligibility.payInFullAvailable, true);
    assert.equal(eligibility.paymentPlanAvailable, true);
  });

  it("resolves Pay Now at 1000 cents without a client-supplied price", () => {
    const tenant = getNzTenantBySlug("oli")!;
    const course = getNzCourse("oli", "studentpay-test-course")!;
    const payload = buildPayInFullCreatePayload({
      tenant,
      course,
      student,
      providerOrderId: "OLI-TEST-PIF-20260918-001",
      successUrl:
        "https://example.test/enrol/oli/studentpay-test-course",
      cancelUrl: "https://example.test/enrol/oli/studentpay-test-course",
    });
    assert.equal(payload.payment_option, "pay_in_full");
    assert.equal(payload.provider.provider_code, "OLI_NZ");
    assert.equal(payload.course.course_code, "OLI_TEST_001");
    assert.equal("pricing" in payload, false);
    assert.equal(course.paymentInFullCourseFeeCents, 1000);
  });

  it("derives 4 × 250 cents weekly with no residual final payment", () => {
    const course = getNzCourse("oli", "studentpay-test-course")!;
    assert.equal(course.planPolicy.mode, "derived_regular");
    if (course.planPolicy.mode !== "derived_regular") {
      return;
    }
    assert.equal(course.planPolicy.regularInstalmentCents, 250);
    assert.equal(course.planPolicy.upfrontAmountCents, 0);
    assert.equal(course.planPolicy.frequency, "Weekly");

    const preview = previewCoursePlan(course, { firstPaymentDate: "2026-10-01" });
    assert.equal(preview.coursePriceCents, 1000);
    assert.equal(preview.upfrontAmountCents, 0);
    assert.equal(preview.regularInstalmentAmountCents, 250);
    assert.equal(preview.numberOfInstalments, 4);
    assert.equal(preview.fullRegularInstalmentCount, 4);
    assert.equal(preview.hasResidualFinal, false);
    assert.equal(preview.finalInstalmentAmountCents, null);
    assert.equal(
      preview.fullRegularInstalmentCount * preview.regularInstalmentAmountCents +
        preview.upfrontAmountCents,
      preview.coursePriceCents,
    );

    const tenant = getNzTenantBySlug("oli")!;
    const payload = buildCanonicalCreatePayload({
      tenant,
      course,
      student,
      plan: {
        paymentOption: "interest_free_payment_plan",
        upfrontAmountCents: 0,
        frequency: "Weekly",
        firstPaymentDate: "2026-10-01",
      },
      providerOrderId: "OLI-TEST-PLAN-20260918-001",
      successUrl:
        "https://example.test/enrol/oli/studentpay-test-course?dda=return",
      cancelUrl:
        "https://example.test/enrol/oli/studentpay-test-course?dda=cancelled",
    });
    assert.equal(payload.course.course_code, "OLI_TEST_001");
    assert.equal(payload.pricing.course_price, 10);
    assert.equal(payload.pricing.upfront_payment, 0);
    assert.equal(payload.plan.payment_frequency, "Weekly");
    assert.equal(payload.plan.number_of_instalments, 4);
    assert.equal(payload.plan.instalment_amount, 2.5);
    assert.equal(payload.plan.final_instalment_amount, undefined);
  });

  it("does not change existing Production OLI commercial terms", () => {
    process.env.STUDENTPAY_ENV = "production";
    const psy = getNzCourse("oli", "certificate-in-psychology-counselling")!;
    const adm = getNzCourse("oli", "certificate-in-business-administration")!;
    assert.equal(psy.courseCode, "PSY101");
    assert.equal(psy.paymentPlanCourseFeeCents, 183425);
    assert.equal(psy.paymentInFullCourseFeeCents, 160425);
    assert.equal(adm.courseCode, "ADM101");
    assert.equal(adm.paymentPlanCourseFeeCents, 183425);
    assert.equal(adm.paymentInFullCourseFeeCents, 160425);
  });

  it("overlays API-resolved Salesforce terms onto the sandbox canary course", () => {
    const local = getNzCourse("oli", "studentpay-test-course")!;
    const overlaid = overlayNzCourseFromApi(local, {
      course_code: "OLI_TEST_001",
      slug: "studentpay-test-course",
      name: "OLI Test Course – StudentPay",
      description: "StudentPay NZ sandbox-only test course for validating Salesforce catalogue authority. Not a live student offering.",
      status: "active",
      enrolment_payment_options: ["payment_plan", "pay_in_full"],
      payment_in_full_course_fee_cents: 1000,
      payment_plan_course_fee_cents: 1000,
      frequency: "Weekly",
      plan_mode: "derived_regular",
      regular_instalment_cents: 250,
      number_of_instalments: 4,
      upfront_amount_cents: 0,
    });
    assert.ok(overlaid);
    const publicCourse = toPublicCourse(overlaid);
    assert.equal(publicCourse.paymentInFullCourseFeeCents, 1000);
    assert.equal(publicCourse.paymentPlanCourseFeeCents, 1000);
    assert.equal(publicCourse.planPolicy.mode, "derived_regular");
    if (publicCourse.planPolicy.mode === "derived_regular") {
      assert.equal(publicCourse.planPolicy.regularInstalmentCents, 250);
      assert.equal(publicCourse.planPolicy.frequency, "Weekly");
      assert.equal(publicCourse.planPolicy.upfrontAmountCents, 0);
    }
    const preview = previewCoursePlan(overlaid, { firstPaymentDate: "2026-10-01" });
    assert.equal(preview.coursePriceCents, 1000);
    assert.equal(preview.regularInstalmentAmountCents, 250);
    assert.equal(preview.numberOfInstalments, 4);
  });

  it("wires the enrolment page and checkout BFF to fail closed on Salesforce-authority overlay", () => {
    const page = fs.readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../app/enrol/[providerSlug]/[courseSlug]/page.tsx",
      ),
      "utf8",
    );
    const checkout = fs.readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../components/nz-enrolment/EnrolmentCheckout.tsx",
      ),
      "utf8",
    );
    const bff = fs.readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../app/api/enrolment-checkout/route.ts",
      ),
      "utf8",
    );
    assert.match(page, /resolveAuthoritativeHostedCourse/);
    assert.match(page, /NzCourseConfigurationUnavailable/);
    assert.doesNotMatch(page, /\|\| localCourse/);
    assert.match(bff, /COURSE_CONFIGURATION_UNAVAILABLE/);
    assert.doesNotMatch(bff, /\|\| resolved\.course/);
    assert.match(checkout, /json\.courses/);
    assert.match(checkout, /setCourse\(overlaid\)/);
  });
});
