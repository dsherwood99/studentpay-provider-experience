import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BRIDAL_AUTHORITATIVE_SNAPSHOT } from "../provider-experience/catalogue-checkout.ts";
import {
  auPaymentPlanCourses,
  auPaymentPlanCoursePath,
  auPaymentPlanEnrolPath,
  AU_PAYMENT_PLAN_DIRECTORY_PATH,
  formatAuInstalmentSummary,
  formatAudCents,
  getAuPaymentPlanCourse,
  getAuPaymentPlanCourseForProvider,
  isAuPaymentPlanCheckoutBlocked,
  isAuPaymentPlanRouteEnabled,
  KIT_NOT_INCLUDED,
  upfrontCollectionNote,
} from "./courses.ts";
import { calculateAuWeeklySchedule } from "./schedule.ts";

describe("Australian payment-plan demonstrations", () => {
  it("publishes Bridal Freelancer Bundle from the verified weekly schedule", () => {
    const bridal = getAuPaymentPlanCourse("bridal-freelancer-bundle");
    assert.ok(bridal);
    assert.equal(auPaymentPlanCourses.length, 1);
    assert.equal(bridal.code, "ACADEMYAU_BRIDAL_FREELANCER_BUNDLE");
    assert.notEqual(bridal.code, "BRIDAL_FREELANCER_BUNDLE");
    assert.equal(bridal.checkoutPrefix, "ACADEMYAU-BFB");
    assert.notEqual(bridal.checkoutPrefix, "BELA-BFB");
    assert.equal(bridal.title, "Bridal Freelancer Bundle");
    assert.equal(bridal.source, "owner-approved-financial-terms");
    assert.deepEqual(bridal.inclusions, []);
    assert.deepEqual(bridal.exclusions, [KIT_NOT_INCLUDED]);
    assert.equal(bridal.schedule.currency, "AUD");
    assert.equal(bridal.schedule.paymentFrequency, "Weekly");
    assert.equal(bridal.schedule.coursePriceCents, 350_000);
    assert.equal(bridal.schedule.weeklyAmountCents, 2_300);
    assert.equal(bridal.schedule.upfrontPaymentCents, 400);
    assert.equal(bridal.schedule.numberOfInstallments, 152);
    assert.equal(bridal.schedule.finalPaymentCents, 0);
    assert.equal(
      bridal.schedule.upfrontPaymentCents +
        bridal.schedule.numberOfInstallments * bridal.schedule.weeklyAmountCents +
        bridal.schedule.finalPaymentCents,
      bridal.schedule.coursePriceCents,
    );
    assert.equal(
      bridal.schedule.upfrontCollection,
      "within-24-hours-of-signup",
    );
    assert.equal(upfrontCollectionNote(bridal), "Debited within 24 hours of signup.");
    assert.equal(
      formatAuInstalmentSummary(bridal),
      "AUD $4.00 upfront, then 152 weekly payments of AUD $23.00",
    );
    assert.equal(formatAudCents(bridal.schedule.coursePriceCents), "AUD $3,500.00");
    assert.equal(
      bridal.schedule.coursePriceCents / 100,
      BRIDAL_AUTHORITATIVE_SNAPSHOT.course_price,
    );
    assert.equal(
      bridal.schedule.upfrontPaymentCents / 100,
      BRIDAL_AUTHORITATIVE_SNAPSHOT.upfront,
    );
    assert.equal(
      bridal.schedule.weeklyAmountCents / 100,
      BRIDAL_AUTHORITATIVE_SNAPSHOT.recurring,
    );
    assert.equal(
      bridal.schedule.numberOfInstallments,
      BRIDAL_AUTHORITATIVE_SNAPSHOT.count,
    );
    assert.equal(
      (bridal.schedule.coursePriceCents - bridal.schedule.upfrontPaymentCents) /
        100,
      BRIDAL_AUTHORITATIVE_SNAPSHOT.amount_to_finance,
    );
  });

  it("keeps the demonstration on Academy Australia and closed to checkout", () => {
    assert.equal(
      getAuPaymentPlanCourseForProvider(
        "academy-australia",
        "bridal-freelancer-bundle",
      )?.code,
      "ACADEMYAU_BRIDAL_FREELANCER_BUNDLE",
    );
    assert.equal(
      getAuPaymentPlanCourseForProvider(
        "bela-beauty-college",
        "bridal-freelancer-bundle",
      ),
      undefined,
    );
    assert.equal(
      getAuPaymentPlanCourseForProvider(
        "bela-beauty-sandbox",
        "bridal-freelancer-bundle",
      ),
      undefined,
    );
    assert.equal(getAuPaymentPlanCourse("au-payment-plans"), undefined);
    assert.equal(
      isAuPaymentPlanCheckoutBlocked(
        "academy-australia",
        "bridal-freelancer-bundle",
      ),
      true,
    );
    assert.equal(
      isAuPaymentPlanCheckoutBlocked(
        "bela-beauty-sandbox",
        "bridal-freelancer-bundle",
      ),
      false,
    );
    assert.equal(
      auPaymentPlanCoursePath("bridal-freelancer-bundle"),
      "/providers/academy-australia/courses/bridal-freelancer-bundle",
    );
    assert.equal(
      auPaymentPlanEnrolPath("bridal-freelancer-bundle"),
      "/providers/academy-australia/courses/bridal-freelancer-bundle/enrol",
    );
    assert.equal(
      AU_PAYMENT_PLAN_DIRECTORY_PATH,
      "/providers/academy-australia/courses/au-payment-plans",
    );
  });

  it("hides the demonstration on NZ enrolment and Bela hosts", () => {
    const previous = {
      HOSTED_PRODUCT_MODE: process.env.HOSTED_PRODUCT_MODE,
      STUDENTPAY_PROVIDER_CODE: process.env.STUDENTPAY_PROVIDER_CODE,
      ACADEMY_PROVIDER_CODE: process.env.ACADEMY_PROVIDER_CODE,
    };

    try {
      delete process.env.STUDENTPAY_PROVIDER_CODE;
      delete process.env.ACADEMY_PROVIDER_CODE;
      delete process.env.HOSTED_PRODUCT_MODE;
      assert.equal(isAuPaymentPlanRouteEnabled("academy-australia"), false);
      assert.equal(
        isAuPaymentPlanRouteEnabled("academy-australia", "www.academyaustralia.com"),
        true,
      );
      assert.equal(isAuPaymentPlanRouteEnabled("bela-beauty-college"), false);

      process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
      assert.equal(isAuPaymentPlanRouteEnabled("academy-australia"), false);

      process.env.HOSTED_PRODUCT_MODE = "bela";
      assert.equal(isAuPaymentPlanRouteEnabled("academy-australia"), false);

      process.env.HOSTED_PRODUCT_MODE = "academy";
      assert.equal(isAuPaymentPlanRouteEnabled("academy-australia"), true);

      delete process.env.HOSTED_PRODUCT_MODE;
      process.env.STUDENTPAY_PROVIDER_CODE = "BELA";
      assert.equal(isAuPaymentPlanRouteEnabled("academy-australia"), false);

      process.env.STUDENTPAY_PROVIDER_CODE = "ACADEMYAU";
      assert.equal(isAuPaymentPlanRouteEnabled("academy-australia"), true);
    } finally {
      for (const [name, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      }
    }
  });

  it("reproduces other verified weekly remainders without publishing them", () => {
    const makeup = calculateAuWeeklySchedule({
      coursePriceCents: 200_000,
      weeklyAmountCents: 1_699,
    });
    assert.equal(makeup.ok, true);
    if (makeup.ok) {
      assert.equal(makeup.schedule.upfrontPaymentCents, 1_217);
      assert.equal(makeup.schedule.numberOfInstallments, 117);
      assert.equal(makeup.schedule.finalPaymentCents, 0);
    }

    const classic = calculateAuWeeklySchedule({
      coursePriceCents: 180_000,
      weeklyAmountCents: 2_400,
    });
    assert.equal(classic.ok, true);
    if (classic.ok) {
      assert.equal(classic.schedule.upfrontPaymentCents, 0);
      assert.equal(classic.schedule.numberOfInstallments, 75);
      assert.equal(classic.schedule.upfrontCollection, "none");
    }
  });
});
