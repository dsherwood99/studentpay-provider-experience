import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import { previewCoursePlan } from "./canonical.ts";
import { hostedCheckoutViewModel } from "./checkout-payment-mode.ts";
import { isPayInFullChoiceVisible, planDisplay } from "./checkout-ui.ts";
import { getNzCourse } from "./courses.ts";
import { resolveHostedPayInFullEligibility } from "./pay-in-full.ts";
import { currentCourseDeepLink } from "./presentation.ts";
import { getDefaultProductionNzTenantSlug, getNzTenantBySlug, toPublicTenant } from "./tenants.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));
const managed = [
  "HOSTED_PRODUCT_MODE",
  "STUDENTPAY_ENV",
  "NZ_STUDENTPAY_API_BASE_URL",
  "E13_SANDBOX_PAY_IN_FULL_HOSTED_PREVIEW",
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

describe("BELA_NZ sandbox Hosted Checkout prep", () => {
  it("prepares BELA_NZ as a sandbox-only generic Hosted tenant", () => {
    const tenant = getNzTenantBySlug("bela-nz")!;
    const course = getNzCourse("bela-nz", "lash-business-bundle")!;
    assert.equal(tenant.providerCode, "BELA_NZ");
    assert.equal(tenant.sandboxOnly, true);
    assert.equal(tenant.active, true);
    assert.equal(tenant.apiKeyEnv, "PROVIDER_API_KEY_BELA_NZ");
    assert.equal(course.courseCode, "BELA_LASH_BUSINESS_BUNDLE");
    assert.equal(course.sandboxOnly, true);
    assert.equal(course.paymentPlanCourseFeeCents, 280_000);
    assert.equal(course.planPolicy.upfrontAmountCents, 1000);
    assert.equal(course.planPolicy.mode, "derived_regular");
    if (course.planPolicy.mode === "derived_regular") {
      assert.equal(course.planPolicy.regularInstalmentCents, 1500);
      assert.equal(course.planPolicy.frequency, "Weekly");
    }
    assert.equal(
      currentCourseDeepLink(toPublicTenant(tenant), course),
      "https://enrol.studentpay.co.nz/enrol/bela-nz/lash-business-bundle",
    );
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://api.studentpay.co.nz";
    assert.equal(getNzTenantBySlug("bela-nz"), undefined);
    assert.equal(getNzCourse("bela-nz", "lash-business-bundle"), undefined);
    assert.equal(getDefaultProductionNzTenantSlug(), "oli");
  });

  it("reuses the generic Hosted checkout page, chrome, and payment-mode helpers", () => {
    const page = fs.readFileSync(
      path.join(srcRoot, "app/enrol/[providerSlug]/[courseSlug]/page.tsx"),
      "utf8",
    );
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    const layout = fs.readFileSync(
      path.join(srcRoot, "app/enrol/[providerSlug]/layout.tsx"),
      "utf8",
    );
    assert.match(page, /NzEnrolmentCheckout/);
    assert.match(page, /resolveHostedPayInFullEligibility/);
    assert.match(page, /toPublicTenant\(overlayTenant\)/);
    assert.doesNotMatch(page, /bela-nz|BELA_NZ/);
    assert.match(layout, /ProviderNativeFooter/);
    assert.match(checkout, /ProviderNativeHeader/);
    assert.match(checkout, /hostedCheckoutViewModel|hostedCheckoutRenderFlags/);
    assert.match(checkout, /data-testid="nz-enrolment-single-page"/);
    assert.match(checkout, /data-testid="nz-plan-upfront"/);
    assert.match(checkout, /StudentPayAttribution/);
    assert.doesNotMatch(checkout, /bela-nz|BELA_NZ|Bela Beauty/);
    assert.doesNotMatch(checkout, /\/api\/demos\/bela-beauty/);
    assert.doesNotMatch(page, /\/api\/demos\/bela-beauty/);
  });

  it("shows Lash Business Bundle $2,800 / $10 upfront / 186 × $15 and hides Pay Now", () => {
    const tenant = getNzTenantBySlug("bela-nz")!;
    const course = getNzCourse("bela-nz", "lash-business-bundle")!;
    const eligibility = resolveHostedPayInFullEligibility({ tenant, course });
    const preview = previewCoursePlan(course, { firstPaymentDate: "2026-10-01" });
    const display = planDisplay(preview);
    const view = hostedCheckoutViewModel({
      paymentPlanAvailable: eligibility.paymentPlanAvailable,
      payInFullAvailable: eligibility.payInFullAvailable,
      amountCents: course.paymentPlanCourseFeeCents,
      tenantAttribution: tenant.presentation.attributionLabel,
      plan: {
        upfrontAmountCents: preview.upfrontAmountCents,
        frequency: preview.frequency,
        numberOfInstalments: preview.numberOfInstalments,
        firstPaymentDate: preview.firstPaymentDate,
      },
    });

    assert.equal(course.name, "Lash Business Bundle");
    assert.equal(preview.coursePriceCents, 280_000);
    assert.equal(preview.upfrontAmountCents, 1000);
    assert.equal(preview.regularInstalmentAmountCents, 1500);
    assert.equal(preview.numberOfInstalments, 186);
    assert.equal(preview.hasResidualFinal, false);
    assert.equal(display.upfrontLabel, "$10.00 upfront");
    assert.match(display.regularLabel, /\$15\.00 per week/);
    assert.match(display.regularCountLabel, /186 weekly payments of \$15\.00/);
    assert.match(display.totalLabel, /\$2,800\.00/);
    assert.equal(view.mode, "plan_only");
    assert.equal(view.flags.showPayInFullChoice, false);
    assert.equal(view.flags.showPaymentMethodRadios, false);
    assert.equal(view.flags.showDdaSection, true);
    assert.equal(
      isPayInFullChoiceVisible(tenant.checkout.paymentOptions.pay_in_full),
      false,
    );
    process.env.E13_SANDBOX_PAY_IN_FULL_HOSTED_PREVIEW = "true";
    assert.equal(
      resolveHostedPayInFullEligibility({ tenant, course }).payInFullAvailable,
      false,
    );
  });
});
