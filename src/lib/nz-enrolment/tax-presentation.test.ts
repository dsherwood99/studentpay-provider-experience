import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { previewPlan } from "./plan-math.ts";
import { getNzTenantBySlug, toPublicTenant } from "./tenants.ts";
import {
  NZ_GST_RATE_BASIS_POINTS,
  gstInclusiveBreakdown,
  gstInclusiveDisplayRows,
  isGstInclusiveBreakdown,
} from "./tax-presentation.ts";
import {
  payNowChoiceBody,
  payNowSavingFromCatalogue,
  paymentPlanConfirmationRows,
} from "./checkout-ui.ts";

const CERTIFICATE_PIF = 102_925;
const CERTIFICATE_PLAN = 148_925;
const DIPLOMA_PIF = 217_925;
const DIPLOMA_PLAN = 309_925;
const BEAUTY_GROSS = 402_500;

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("OLI GST presentation configuration", () => {
  it("enables GST-inclusive breakdown at 15% for OLI only", () => {
    process.env.STUDENTPAY_ENV = "sandbox";
    const oli = toPublicTenant(getNzTenantBySlug("oli")!);
    assert.equal(oli.checkout.taxPresentation?.mode, "gst_inclusive_breakdown");
    assert.equal(oli.checkout.taxPresentation?.label, "GST");
    assert.equal(oli.checkout.taxPresentation?.rateBasisPoints, NZ_GST_RATE_BASIS_POINTS);
    assert.equal(oli.checkout.taxPresentation?.rateBasisPoints, 1500);

    const fixture = toPublicTenant(getNzTenantBySlug("fixture-institute")!);
    assert.equal(fixture.checkout.taxPresentation, undefined);

    const bela = toPublicTenant(getNzTenantBySlug("bela-nz")!);
    assert.equal(bela.checkout.taxPresentation, undefined);
    assert.equal(isGstInclusiveBreakdown(bela.checkout.taxPresentation), false);
  });
});

describe("GST-inclusive integer-cent helper", () => {
  it("splits Certificate Pay Now 102925 into 89500 + 13425", () => {
    const breakdown = gstInclusiveBreakdown(CERTIFICATE_PIF);
    assert.equal(breakdown.exclusiveCents, 89_500);
    assert.equal(breakdown.gstCents, 13_425);
    assert.equal(breakdown.exclusiveCents + breakdown.gstCents, CERTIFICATE_PIF);
    assert.deepEqual(
      gstInclusiveDisplayRows(CERTIFICATE_PIF, {
        mode: "gst_inclusive_breakdown",
        label: "GST",
        rateBasisPoints: 1500,
      }),
      [
        { label: "Course fee excl. GST", value: "$895.00" },
        { label: "GST", value: "$134.25" },
        { label: "Total incl. GST", value: "$1,029.25" },
      ],
    );
  });

  it("splits Certificate Payment Plan 148925 into 129500 + 19425", () => {
    const breakdown = gstInclusiveBreakdown(CERTIFICATE_PLAN);
    assert.equal(breakdown.exclusiveCents, 129_500);
    assert.equal(breakdown.gstCents, 19_425);
    assert.deepEqual(
      gstInclusiveDisplayRows(CERTIFICATE_PLAN, {
        mode: "gst_inclusive_breakdown",
        label: "GST",
        rateBasisPoints: 1500,
      }),
      [
        { label: "Course fee excl. GST", value: "$1,295.00" },
        { label: "GST", value: "$194.25" },
        { label: "Total incl. GST", value: "$1,489.25" },
      ],
    );
  });

  it("splits Diploma Pay Now 217925 into 189500 + 28425", () => {
    const breakdown = gstInclusiveBreakdown(DIPLOMA_PIF);
    assert.equal(breakdown.exclusiveCents, 189_500);
    assert.equal(breakdown.gstCents, 28_425);
    assert.deepEqual(
      gstInclusiveDisplayRows(DIPLOMA_PIF, {
        mode: "gst_inclusive_breakdown",
        label: "GST",
        rateBasisPoints: 1500,
      }),
      [
        { label: "Course fee excl. GST", value: "$1,895.00" },
        { label: "GST", value: "$284.25" },
        { label: "Total incl. GST", value: "$2,179.25" },
      ],
    );
  });

  it("splits Diploma Payment Plan 309925 into 269500 + 40425", () => {
    const breakdown = gstInclusiveBreakdown(DIPLOMA_PLAN);
    assert.equal(breakdown.exclusiveCents, 269_500);
    assert.equal(breakdown.gstCents, 40_425);
    assert.deepEqual(
      gstInclusiveDisplayRows(DIPLOMA_PLAN, {
        mode: "gst_inclusive_breakdown",
        label: "GST",
        rateBasisPoints: 1500,
      }),
      [
        { label: "Course fee excl. GST", value: "$2,695.00" },
        { label: "GST", value: "$404.25" },
        { label: "Total incl. GST", value: "$3,099.25" },
      ],
    );
  });

  it("keeps exclusive + GST equal to an arbitrary gross amount", () => {
    for (const gross of [1, 99, 101, 3333, 199_999, BEAUTY_GROSS]) {
      const breakdown = gstInclusiveBreakdown(gross);
      assert.equal(breakdown.exclusiveCents + breakdown.gstCents, gross);
    }
  });

  it("derives Beauty/non-standard $4,025.00 without course-specific branching", () => {
    const breakdown = gstInclusiveBreakdown(BEAUTY_GROSS);
    assert.equal(breakdown.exclusiveCents, 350_000);
    assert.equal(breakdown.gstCents, 52_500);
    assert.equal(breakdown.grossCents, BEAUTY_GROSS);
  });

  it("returns no GST rows when tax presentation is absent", () => {
    assert.equal(gstInclusiveDisplayRows(CERTIFICATE_PLAN, undefined), null);
    assert.equal(gstInclusiveDisplayRows(CERTIFICATE_PLAN, null), null);
  });
});

describe("OLI GST presentation uses authoritative gross cents", () => {
  it("derives Pay Now cards from paymentInFullCourseFeeCents", () => {
    const rows = gstInclusiveDisplayRows(CERTIFICATE_PIF, {
      mode: "gst_inclusive_breakdown",
      label: "GST",
      rateBasisPoints: 1500,
    });
    assert.equal(rows?.[2]?.value, "$1,029.25");
  });

  it("derives Payment Plan cards and catalogue from paymentPlanCourseFeeCents", () => {
    const rows = gstInclusiveDisplayRows(CERTIFICATE_PLAN, {
      mode: "gst_inclusive_breakdown",
      label: "GST",
      rateBasisPoints: 1500,
    });
    assert.equal(rows?.[2]?.value, "$1,489.25");
  });

  it("keeps Pay Now saving as a gross-to-gross difference", () => {
    const certificate = payNowSavingFromCatalogue({
      paymentInFullCourseFeeCents: CERTIFICATE_PIF,
      paymentPlanCourseFeeCents: CERTIFICATE_PLAN,
    });
    const diploma = payNowSavingFromCatalogue({
      paymentInFullCourseFeeCents: DIPLOMA_PIF,
      paymentPlanCourseFeeCents: DIPLOMA_PLAN,
    });
    assert.equal(certificate?.savingCents, 46_000);
    assert.equal(diploma?.savingCents, 92_000);
    assert.equal(
      payNowChoiceBody({
        paymentInFullCourseFeeCents: CERTIFICATE_PIF,
        paymentPlanCourseFeeCents: CERTIFICATE_PLAN,
        taxPresentation: {
          mode: "gst_inclusive_breakdown",
          label: "GST",
          rateBasisPoints: 1500,
        },
      }),
      "Pay your course fee today and save $460.00 incl. GST.",
    );
    assert.equal(
      payNowChoiceBody({
        paymentInFullCourseFeeCents: DIPLOMA_PIF,
        paymentPlanCourseFeeCents: DIPLOMA_PLAN,
        taxPresentation: {
          mode: "gst_inclusive_breakdown",
          label: "GST",
          rateBasisPoints: 1500,
        },
      }),
      "Pay your course fee today and save $920.00 incl. GST.",
    );
  });

  it("keeps Payment Plan residual schedules on the GST-inclusive totals", () => {
    const certificate = previewPlan({
      coursePriceCents: CERTIFICATE_PLAN,
      upfrontAmountCents: 0,
      frequency: "Weekly",
      regularInstalmentCents: 2500,
      firstPaymentDate: "2026-10-01",
    });
    const diploma = previewPlan({
      coursePriceCents: DIPLOMA_PLAN,
      upfrontAmountCents: 0,
      frequency: "Weekly",
      regularInstalmentCents: 2500,
      firstPaymentDate: "2026-10-01",
    });
    assert.equal(certificate.fullRegularInstalmentCount, 59);
    assert.equal(certificate.finalInstalmentAmountCents, 1425);
    assert.equal(certificate.numberOfInstalments, 60);
    assert.equal(diploma.fullRegularInstalmentCount, 123);
    assert.equal(diploma.finalInstalmentAmountCents, 2425);
    assert.equal(diploma.numberOfInstalments, 124);
  });

  it("replaces the confirmation course-fee line with GST display rows only", () => {
    const rows = gstInclusiveDisplayRows(CERTIFICATE_PLAN, {
      mode: "gst_inclusive_breakdown",
      label: "GST",
      rateBasisPoints: 1500,
    })!;
    const confirmation = paymentPlanConfirmationRows({
      courseName: "Certificate in Business Administration",
      courseFeeLabel: "$1,489.25",
      courseFeeRows: rows.map((row) => ({ ...row, group: "payments" as const })),
      paymentPlanLabel: "$25.00 per week",
    });
    assert.deepEqual(
      confirmation.map((row) => `${row.label}: ${row.value}`),
      [
        "Course: Certificate in Business Administration",
        "Course fee excl. GST: $1,295.00",
        "GST: $194.25",
        "Total incl. GST: $1,489.25",
        "Payment plan: $25.00 per week",
      ],
    );
  });
});

describe("GST presentation stays out of money movement and non-OLI UI", () => {
  it("does not put ex-GST or GST amounts on Hosted create/confirm payloads", () => {
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    const createStart = checkout.indexOf('await fetch("/api/enrolment-checkout",');
    const create = checkout.slice(
      createStart,
      checkout.indexOf("applyStatus(json)", createStart),
    );
    const confirmStart = checkout.indexOf('await fetch("/api/enrolment-checkout/confirm"');
    const confirm = checkout.slice(
      confirmStart,
      checkout.indexOf("already_confirmed", confirmStart),
    );
    assert.match(create, /providerSlug: tenant\.slug/);
    assert.match(create, /courseSlug: course\.slug/);
    assert.match(create, /student: resolvedStudent/);
    assert.match(create, /plan: createPlan/);
    assert.doesNotMatch(create, /exclusiveCents|exGst|ex_gst|gstCents|gst_amount/);
    assert.doesNotMatch(confirm, /exclusiveCents|exGst|ex_gst|gstCents|gst_amount/);
    assert.match(confirm, /declarations: confirmDeclarations/);
    assert.doesNotMatch(checkout, /gstInclusiveBreakdown\(/);
  });

  it("does not branch GST presentation on course code, category, or Beauty slugs", () => {
    const files = [
      "lib/nz-enrolment/tax-presentation.ts",
      "lib/nz-enrolment/checkout-ui.ts",
      "components/nz-enrolment/EnrolmentCheckout.tsx",
      "components/nz-enrolment/CourseCatalogue.tsx",
      "components/nz-enrolment/TaxBreakdown.tsx",
    ];
    for (const file of files) {
      const text = fs.readFileSync(path.join(srcRoot, file), "utf8");
      assert.doesNotMatch(text, /BEA101|Beauty|PSY101|ADM101|courseCode\s*===\s*['"]TEC/);
      assert.doesNotMatch(text, /category\s*===\s*['"]Diploma|category\s*===\s*['"]Certificate/);
      assert.doesNotMatch(text, /providerSlug\s*===\s*['"]oli['"]/);
    }
  });

  it("leaves BELA_NZ and generic catalogue presentation on a single course-fee line", () => {
    const catalogue = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/CourseCatalogue.tsx"),
      "utf8",
    );
    assert.match(catalogue, /isGstInclusiveBreakdown\(tenant\.checkout\.taxPresentation\)/);
    assert.match(catalogue, /Course fee/);
    assert.match(catalogue, /paymentPlanCourseFeeCents/);
    const bela = fs.readFileSync(
      path.join(srcRoot, "lib/nz-enrolment/tenants.ts"),
      "utf8",
    );
    const belaBlock = bela.slice(bela.indexOf('slug: "bela-nz"'), bela.indexOf('slug: "studentpay-internal-e13"'));
    assert.doesNotMatch(belaBlock, /taxPresentation/);
  });

  it("does not change Stripe or Direct Debit collection amounts", () => {
    const files = [
      "lib/nz-enrolment/pay-in-full-flow.ts",
      "lib/nz-enrolment/pay-in-full-stripe.ts",
      "lib/nz-enrolment/canonical.ts",
      "app/api/enrolment-checkout/route.ts",
      "app/api/enrolment-checkout/confirm/route.ts",
    ];
    for (const file of files) {
      const text = fs.readFileSync(path.join(srcRoot, file), "utf8");
      assert.doesNotMatch(text, /exclusiveCents|exGst|gstCents|taxPresentation/);
    }
  });
});
