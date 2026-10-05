import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { previewPlan } from "./plan-math.ts";
import { courseWebsiteLinkLabel, formatEnrolmentDisplayDate, providerCourseWebsiteUrl } from "./presentation.ts";
import { getNzCourse, toPublicCourse } from "./courses.ts";
import { getNzTenantBySlug, toPublicTenant } from "./tenants.ts";
import { formatSavingBadge, payNowSavingFromCatalogue } from "./checkout-ui.ts";
import { gstInclusiveDisplayRows } from "./tax-presentation.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));
const CERTIFICATE_PIF = 102_925;
const CERTIFICATE_PLAN = 148_925;
const DIPLOMA_PIF = 217_925;
const DIPLOMA_PLAN = 309_925;
const BEAUTY_PIF = 321_425;
const BEAUTY_PLAN = 402_500;

describe("OLI course navigation copy and same-tab links", () => {
  it("uses dynamic Course Page copy and the configured OLI course URL", () => {
    process.env.STUDENTPAY_ENV = "sandbox";
    const tenant = toPublicTenant(getNzTenantBySlug("oli")!);
    const course = toPublicCourse(
      getNzCourse("oli", "certificate-in-business-operations-management")!,
    );
    assert.equal(
      courseWebsiteLinkLabel(tenant, course),
      "View the Certificate in Business Operations Management Course Page",
    );
    assert.equal(
      providerCourseWebsiteUrl(tenant, course),
      "https://onlinelearninginstitute.co.nz/course/certificate-in-business-operations-management/",
    );
    const bela = toPublicTenant(getNzTenantBySlug("bela-nz")!);
    assert.equal(
      courseWebsiteLinkLabel(bela, { name: "Lash Business Bundle" }),
      "View this course on the Bela Beauty College website",
    );
  });

  it("keeps Back to course and the Course Page link in the same tab", () => {
    const header = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/ProviderNativeHeader.tsx"),
      "utf8",
    );
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    const backLinks = [
      ...header.matchAll(
        /<a[^>]*data-testid="nz-back-to-course"[^>]*>[\s\S]*?Back to course\s*<\/a>/g,
      ),
    ].map((match) => match[0]);
    assert.equal(backLinks.length >= 3, true);
    for (const link of backLinks) {
      assert.doesNotMatch(link, /target="_blank"/);
      assert.doesNotMatch(link, /window\.open/);
    }
    const courseLink = checkout.slice(
      checkout.indexOf("nz-course-page-link"),
      checkout.indexOf("courseWebsiteLinkLabel"),
    );
    assert.doesNotMatch(courseLink, /target="_blank"/);
    assert.match(checkout, /courseWebsiteLinkLabel\(tenant, course\)/);
  });

  it("leaves legal agreement popups on the existing new-window treatment", () => {
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    const legal = checkout.slice(checkout.indexOf("function LegalAgreementLink"));
    assert.match(legal, /target="_blank"/);
    assert.match(legal, /window\.open/);
    assert.match(legal, /openLegalAgreementDocument/);
  });
});

describe("OLI payment-choice and enrolment-summary presentation", () => {
  it("derives Certificate, Diploma, and Beauty savings from authoritative gross cents", () => {
    assert.equal(
      formatSavingBadge(
        payNowSavingFromCatalogue({
          paymentInFullCourseFeeCents: CERTIFICATE_PIF,
          paymentPlanCourseFeeCents: CERTIFICATE_PLAN,
        })?.savingCents || 0,
      ),
      "Save $460",
    );
    assert.equal(
      formatSavingBadge(
        payNowSavingFromCatalogue({
          paymentInFullCourseFeeCents: DIPLOMA_PIF,
          paymentPlanCourseFeeCents: DIPLOMA_PLAN,
        })?.savingCents || 0,
      ),
      "Save $920",
    );
    assert.equal(
      formatSavingBadge(
        payNowSavingFromCatalogue({
          paymentInFullCourseFeeCents: BEAUTY_PIF,
          paymentPlanCourseFeeCents: BEAUTY_PLAN,
        })?.savingCents || 0,
      ),
      "Save $810.75",
    );
    assert.equal(formatSavingBadge(0), null);
    assert.equal(formatSavingBadge(-100), null);
  });

  it("keeps OLI GST rows and weekly hierarchy without instalment-count copy", () => {
    const payNow = gstInclusiveDisplayRows(CERTIFICATE_PIF, {
      mode: "gst_inclusive_breakdown",
      label: "GST",
      rateBasisPoints: 1500,
    });
    const plan = gstInclusiveDisplayRows(CERTIFICATE_PLAN, {
      mode: "gst_inclusive_breakdown",
      label: "GST",
      rateBasisPoints: 1500,
    });
    assert.deepEqual(payNow?.map((row) => row.value), ["$895.00", "$134.25", "$1,029.25"]);
    assert.deepEqual(plan?.map((row) => row.value), ["$1,295.00", "$194.25", "$1,489.25"]);
    const diplomaPlan = previewPlan({
      coursePriceCents: DIPLOMA_PLAN,
      upfrontAmountCents: 0,
      frequency: "Weekly",
      regularInstalmentCents: 2500,
      firstPaymentDate: "2026-10-12",
    });
    const certificatePlan = previewPlan({
      coursePriceCents: CERTIFICATE_PLAN,
      upfrontAmountCents: 0,
      frequency: "Weekly",
      regularInstalmentCents: 2500,
      firstPaymentDate: "2026-10-12",
    });
    assert.equal(certificatePlan.fullRegularInstalmentCount, 59);
    assert.equal(certificatePlan.finalInstalmentAmountCents, 1425);
    assert.equal(diplomaPlan.fullRegularInstalmentCount, 123);
    assert.equal(diplomaPlan.finalInstalmentAmountCents, 2425);
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    assert.match(checkout, /formatCompactNzdFromCents\(preview\.regularInstalmentAmountCents\)\} \/ week/);
    assert.match(checkout, /hidePlanScheduleDetails/);
    assert.match(checkout, /Interest-free payment plan/);
    assert.match(checkout, /One-off payment/);
    assert.doesNotMatch(
      checkout.slice(checkout.indexOf("nz-payment-plan-body"), checkout.indexOf("nz-payment-plan-total")),
      /59 weekly payments/,
    );
    assert.doesNotMatch(
      checkout.slice(checkout.indexOf("nz-payment-plan-body"), checkout.indexOf("nz-payment-plan-total")),
      /123 weekly payments/,
    );
  });

  it("hides the OLI summary Schedule block and keeps a human-readable first payment date", () => {
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    assert.match(checkout, /hidePlanScheduleDetails \? null/);
    assert.match(checkout, /formatEnrolmentDisplayDate\(resolvedFirstPaymentDate\)/);
    assert.equal(formatEnrolmentDisplayDate("2026-10-12"), "12 Oct 2026");
    process.env.STUDENTPAY_ENV = "sandbox";
    const oli = toPublicTenant(getNzTenantBySlug("oli")!);
    const bela = toPublicTenant(getNzTenantBySlug("bela-nz")!);
    const fixture = toPublicTenant(getNzTenantBySlug("fixture-institute")!);
    assert.equal(oli.checkout.hidePlanScheduleDetails, true);
    assert.equal(oli.checkout.paymentChoicePresentation, "savings_hierarchy");
    assert.equal(oli.checkout.coursePageLinkStyle, "view_the_course_page");
    assert.equal(bela.checkout.hidePlanScheduleDetails, undefined);
    assert.equal(bela.checkout.paymentChoicePresentation, undefined);
    assert.equal(bela.checkout.taxPresentation, undefined);
    assert.equal(fixture.checkout.hidePlanScheduleDetails, undefined);
    assert.equal(fixture.checkout.maxFirstPaymentDelayDays, undefined);
  });

  it("does not add GST or ex-GST amounts to money-movement files", () => {
    const files = [
      "lib/nz-enrolment/pay-in-full-flow.ts",
      "lib/nz-enrolment/pay-in-full-stripe.ts",
      "lib/nz-enrolment/canonical.ts",
      "app/api/enrolment-checkout/route.ts",
      "app/api/enrolment-checkout/confirm/route.ts",
    ];
    for (const file of files) {
      const text = fs.readFileSync(path.join(srcRoot, file), "utf8");
      assert.doesNotMatch(text, /exclusiveCents|exGst|gstCents|taxPresentation|formatSavingBadge/);
    }
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    const create = checkout.slice(
      checkout.indexOf('await fetch("/api/enrolment-checkout",'),
      checkout.indexOf("applyStatus(json)", checkout.indexOf('await fetch("/api/enrolment-checkout",')),
    );
    assert.match(create, /plan: createPlan/);
    assert.doesNotMatch(create, /exclusiveCents|gstCents|savingCents/);
    assert.doesNotMatch(checkout, /BEA101|Beauty|PSY101|ADM101/);
    assert.doesNotMatch(checkout, /providerSlug\s*===\s*['"]oli['"]/);
  });
});
