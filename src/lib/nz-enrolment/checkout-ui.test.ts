import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  NZ_CHECKOUT_SECTIONS,
  NZ_CONFIRM_CTA,
  NZ_DIRECT_DEBIT_COPY,
  NZ_DIRECT_DEBIT_CTA,
  NZ_REMOVED_STEPPER_LABELS,
  NZ_STUDENT_DETAILS_COPY,
  combinedDetailsPrivacyAccepted,
  compactPaymentPlanSummary,
  confirmEnabled,
  declarationsAccepted,
  decorateConfirmationRows,
  isConfirmedCheckoutStatus,
  isPayInFullChoiceVisible,
  paymentPlanConfirmationRows,
  payNowChoiceBody,
  payNowSavingFromCatalogue,
  paymentPlanChoiceCopy,
  planDisplay,
  sectionStatus,
  setCombinedDetailsPrivacyDeclaration,
  shouldConfirmCheckout,
  shouldCreateCheckout,
  shouldPollDirectDebitStatus,
  studentDetailsAreValid,
  usesCompactPlanSummary,
} from "./checkout-ui.ts";
import { getNzCourse } from "./courses.ts";
import { previewCoursePlan } from "./canonical.ts";
import { kitDisclosureForPolicy } from "./kit-policy.ts";
import { getNzTenantBySlug, toPublicTenant } from "./tenants.ts";
import type { NzCourse } from "./types.ts";

const validStudent = {
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

describe("single-page checkout presentation helpers", () => {
  it("exposes four numbered sections instead of the old visual stepper", () => {
    assert.deepEqual(
      NZ_CHECKOUT_SECTIONS.map((section) => section.title),
      ["Your payment plan", "Your details", "Direct debit", "Review & confirm"],
    );
    assert.deepEqual([...NZ_REMOVED_STEPPER_LABELS], [
      "Payment option",
      "Your plan",
      "Agreement",
      "Complete",
    ]);
    assert.match(NZ_STUDENT_DETAILS_COPY.lead, /enrolment and StudentPay payment plan/);
    assert.equal(NZ_DIRECT_DEBIT_CTA, "Set up Direct Debit");
    assert.equal(NZ_CONFIRM_CTA, "Confirm enrolment & activate payment plan");
    assert.equal(
      NZ_DIRECT_DEBIT_COPY.waitingBody,
      "Complete your Direct Debit setup in the secure window.",
    );
  });

  it("does not create a checkout on render or while typing", () => {
    assert.equal(
      shouldCreateCheckout({
        studentValid: true,
        alreadyCreated: false,
        userClickedDirectDebit: false,
        busy: false,
      }),
      false,
    );
    assert.equal(
      shouldCreateCheckout({
        studentValid: false,
        alreadyCreated: false,
        userClickedDirectDebit: true,
        busy: false,
      }),
      false,
    );
    assert.equal(
      shouldCreateCheckout({
        studentValid: true,
        alreadyCreated: true,
        userClickedDirectDebit: true,
        busy: false,
      }),
      false,
    );
    assert.equal(
      shouldCreateCheckout({
        studentValid: true,
        alreadyCreated: false,
        userClickedDirectDebit: true,
        busy: false,
      }),
      true,
    );
  });

  it("keeps confirm gated on student details, Direct Debit, and declarations", () => {
    const declarations = {
      payment_plan_accepted: true,
      information_confirmed: true,
      privacy_consent_accepted: true,
    };
    assert.equal(studentDetailsAreValid(validStudent), true);
    assert.equal(declarationsAccepted(declarations), true);
    assert.equal(
      confirmEnabled({
        studentValid: true,
        setupComplete: true,
        declarationsAccepted: true,
        busy: false,
      }),
      true,
    );
    assert.equal(
      confirmEnabled({
        studentValid: true,
        setupComplete: false,
        declarationsAccepted: true,
        busy: false,
      }),
      false,
    );
    assert.equal(
      confirmEnabled({
        studentValid: true,
        setupComplete: true,
        declarationsAccepted: false,
        busy: false,
      }),
      false,
    );
    assert.equal(
      shouldConfirmCheckout({
        studentValid: true,
        setupComplete: true,
        declarationsAccepted: true,
        userClickedConfirm: false,
        busy: false,
        alreadyConfirmed: false,
      }),
      false,
    );
    assert.equal(
      shouldConfirmCheckout({
        studentValid: true,
        setupComplete: true,
        declarationsAccepted: true,
        userClickedConfirm: true,
        busy: false,
        alreadyConfirmed: true,
      }),
      false,
    );
    assert.deepEqual(setCombinedDetailsPrivacyDeclaration(true), {
      information_confirmed: true,
      privacy_consent_accepted: true,
    });
    assert.equal(
      combinedDetailsPrivacyAccepted({
        information_confirmed: true,
        privacy_consent_accepted: false,
      }),
      false,
    );
  });

  it("polls Direct Debit status only after create or a GoCardless return", () => {
    assert.equal(
      shouldPollDirectDebitStatus({ hasCheckoutSession: false, ddaReturn: null }),
      false,
    );
    assert.equal(
      shouldPollDirectDebitStatus({ hasCheckoutSession: true, ddaReturn: null }),
      true,
    );
    assert.equal(
      shouldPollDirectDebitStatus({
        hasCheckoutSession: false,
        ddaReturn: "return",
      }),
      true,
    );
  });

  it("marks sections without forcing a wizard", () => {
    assert.equal(
      sectionStatus({
        section: "plan",
        planReady: true,
        studentValid: false,
        studentStarted: false,
        studentErrors: false,
        hasCheckoutSession: false,
        setupComplete: false,
        ddaCancelled: false,
        confirmed: false,
      }),
      "complete",
    );
    assert.equal(
      sectionStatus({
        section: "dda",
        planReady: true,
        studentValid: true,
        studentStarted: true,
        studentErrors: false,
        hasCheckoutSession: false,
        setupComplete: false,
        ddaCancelled: false,
        confirmed: false,
      }),
      "ready",
    );
    assert.equal(
      sectionStatus({
        section: "dda",
        planReady: true,
        studentValid: true,
        studentStarted: true,
        studentErrors: false,
        hasCheckoutSession: true,
        setupComplete: true,
        ddaCancelled: false,
        confirmed: false,
      }),
      "complete",
    );
    assert.equal(
      sectionStatus({
        section: "review",
        planReady: true,
        studentValid: true,
        studentStarted: true,
        studentErrors: false,
        hasCheckoutSession: true,
        setupComplete: true,
        ddaCancelled: false,
        confirmed: false,
      }),
      "ready",
    );
  });

  it("treats confirmed refresh as an idempotent completion state", () => {
    assert.equal(isConfirmedCheckoutStatus("confirmed"), true);
    assert.equal(isConfirmedCheckoutStatus("CONFIRMED"), true);
    assert.equal(isConfirmedCheckoutStatus("setup_complete"), false);
  });

  it("hides Pay in Full when tenant availability already marks it unavailable", () => {
    assert.equal(
      isPayInFullChoiceVisible({ enabled: false, comingSoon: true }),
      false,
    );
    assert.equal(
      isPayInFullChoiceVisible({ enabled: false, comingSoon: false }),
      false,
    );
    assert.equal(
      isPayInFullChoiceVisible({ enabled: true, comingSoon: true }),
      false,
    );
    assert.equal(
      isPayInFullChoiceVisible({ enabled: true, comingSoon: false }),
      true,
    );
    const oli = toPublicTenant(getNzTenantBySlug("oli")!);
    assert.equal(
      isPayInFullChoiceVisible(oli.checkout.paymentOptions.pay_in_full),
      true,
    );
  });
});

describe("plan section maths display", () => {
  it("shows PSY101 residual without inventing a fake equal instalment", () => {
    process.env.STUDENTPAY_ENV = "production";
    const course = getNzCourse("oli", "certificate-in-psychology-counselling")!;
    const preview = previewCoursePlan(course, { firstPaymentDate: "2026-10-01" });
    const display = planDisplay(preview);
    assert.equal(preview.fullRegularInstalmentCount, 73);
    assert.equal(preview.finalInstalmentAmountCents, 925);
    assert.equal(preview.numberOfInstalments, 74);
    assert.match(display.regularLabel, /\$25\.00 per week/);
    assert.match(display.upfrontLabel, /\$0\.00 upfront/);
    assert.match(display.regularCountLabel, /73 weekly payments of \$25\.00/);
    assert.equal(display.finalPaymentLabel, "Final payment of $9.25");
    assert.match(display.totalLabel, /\$1,834\.25/);
  });

  it("shows BEA101 as exact-divisible weekly payments with no residual", () => {
    process.env.STUDENTPAY_ENV = "production";
    const course = getNzCourse("oli", "manicure-pedicure-nail-technology")!;
    const preview = previewCoursePlan(course, { firstPaymentDate: "2026-10-01" });
    const display = planDisplay(preview);
    assert.equal(preview.numberOfInstalments, 161);
    assert.equal(preview.hasResidualFinal, false);
    assert.equal(display.finalPaymentLabel, null);
    assert.match(display.regularCountLabel, /161 weekly payments of \$25\.00/);
    assert.match(display.totalLabel, /\$4,025\.00/);
  });
});

describe("payment-choice card copy", () => {
  it("calculates ADM101 Pay Now saving from catalogue amounts, not a hardcoded discount", () => {
    process.env.STUDENTPAY_ENV = "production";
    const course = getNzCourse("oli", "certificate-in-business-administration")!;
    const saving = payNowSavingFromCatalogue({
      paymentInFullCourseFeeCents: course.paymentInFullCourseFeeCents,
      paymentPlanCourseFeeCents: course.paymentPlanCourseFeeCents,
    });
    assert.equal(course.paymentInFullCourseFeeCents, 160425);
    assert.equal(course.paymentPlanCourseFeeCents, 183425);
    assert.equal(saving?.savingCents, 23000);
    assert.equal(saving?.percent, 13);
    assert.equal(
      payNowChoiceBody({
        paymentInFullCourseFeeCents: course.paymentInFullCourseFeeCents,
        paymentPlanCourseFeeCents: course.paymentPlanCourseFeeCents,
      }),
      "Pay your course fee today and save 13% ($230.00) under our current Pay Now promotion.",
    );
  });

  it("uses residual weekly schedule for ADM101 Payment Plan copy", () => {
    process.env.STUDENTPAY_ENV = "production";
    const course = getNzCourse("oli", "certificate-in-business-administration")!;
    const preview = previewCoursePlan(course, { firstPaymentDate: "2026-10-01" });
    const copy = paymentPlanChoiceCopy(preview);
    assert.equal(copy.weeklyAmountLabel, "$25.00");
    assert.equal(copy.periodSuffix, "/ week");
    assert.equal(
      copy.body,
      "Interest-free payment plan of 73 weekly payments of $25.00 and a final payment of $9.25.",
    );
    assert.equal(copy.totalLine, "Total paid over time: $1,834.25");
  });

  it("omits a residual clause when weekly payments divide exactly", () => {
    process.env.STUDENTPAY_ENV = "production";
    const course = getNzCourse("oli", "manicure-pedicure-nail-technology")!;
    const copy = paymentPlanChoiceCopy(
      previewCoursePlan(course, { firstPaymentDate: "2026-10-01" }),
    );
    assert.equal(
      copy.body,
      "Interest-free payment plan of 161 weekly payments of $25.00.",
    );
    assert.equal(copy.totalLine, "Total paid over time: $4,025.00");
  });
});

describe("confirmation summary presentation", () => {
  it("formats ADM101 payment-plan confirmation as polished user-facing rows", () => {
    process.env.STUDENTPAY_ENV = "production";
    const course = getNzCourse("oli", "certificate-in-business-administration")!;
    const preview = previewCoursePlan(course, { firstPaymentDate: "2026-09-24" });
    const display = planDisplay(preview);
    const rows = paymentPlanConfirmationRows({
      courseName: course.name,
      courseFeeLabel: display.rows[0]?.value || "",
      paymentPlanLabel: `${display.regularLabel} · ${display.finalPaymentLabel}`,
      firstPaymentDate: preview.firstPaymentDate,
      agreementNumber: "PPA-000004",
      checkoutId: "chk_example_ref",
    });
    assert.equal(course.name, "Certificate in Business Administration");
    assert.deepEqual(
      rows.map((row) => `${row.label}: ${row.value}`),
      [
        "Course: Certificate in Business Administration",
        "Course fee: $1,834.25",
        "Payment plan: $25.00 per week · Final payment of $9.25",
        "First payment date: 24 Sep 2026",
        "Payment Plan Agreement: PPA-000004",
        "Checkout: chk_example_ref",
      ],
    );
    assert.equal(rows.find((row) => row.label === "Checkout")?.tone, "reference");
    assert.equal(rows.find((row) => row.label === "Checkout")?.group, "references");
    assert.equal(rows.find((row) => row.label === "Course")?.group, "course");
    assert.equal(rows.find((row) => row.label === "Payment plan")?.group, "payments");
  });

  it("mutes Pay Now reference rows without changing the success fields", () => {
    const rows = decorateConfirmationRows([
      { label: "Course", value: "Certificate in Business Administration" },
      { label: "Provider", value: "Online Learning Institute" },
      { label: "Payment received", value: "$1,604.25" },
      { label: "Payment method", value: "Card" },
      { label: "Reference", value: "OLI-REF" },
    ]);
    assert.deepEqual(
      rows.map((row) => row.label),
      ["Course", "Provider", "Payment received", "Payment method", "Reference"],
    );
    assert.equal(rows.at(-1)?.tone, "reference");
    assert.equal(rows.at(-1)?.group, "references");
  });

  it("uses a confirmation card and a two-column Direct Debit layout in EnrolmentCheckout", () => {
    const checkout = fs.readFileSync(
      path.join(fileURLToPath(new URL("../../", import.meta.url)), "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    assert.match(checkout, /paymentPlanConfirmationRows/);
    assert.match(checkout, /decorateConfirmationRows/);
    assert.match(checkout, /styles\.confirmationCard/);
    assert.match(checkout, /styles\.ddaLayout/);
    assert.match(checkout, /styles\.ddaStatusPanel/);
    assert.match(checkout, /formatEnrolmentDisplayDate\(resolvedFirstPaymentDate\)/);
    assert.match(checkout, /data-testid="nz-enrolment-confirmed-summary"/);
    assert.match(checkout, /Keep an eye on/);
    assert.match(checkout, /onClick=\{\(\) => void startDirectDebitSetup\(\)\}/);
    assert.doesNotMatch(checkout, /<dd>\{preview\.firstPaymentDate\}<\/dd>/);
  });
});

function belaDerivedCourse(input: {
  name: string;
  feeCents: number;
  upfrontCents: number;
  regularCents: number;
}): NzCourse {
  return {
    courseCode: "BELA_SUMMARY_FIXTURE",
    slug: "bela-summary-fixture",
    providerSlug: "bela-nz",
    name: input.name,
    description: "Presentation fixture. Amounts are the authoritative course fee inputs.",
    paymentInFullCourseFeeCents: input.feeCents,
    paymentPlanCourseFeeCents: input.feeCents,
    status: "active",
    planPolicy: {
      mode: "derived_regular",
      frequency: "Weekly",
      regularInstalmentCents: input.regularCents,
      upfrontAmountCents: input.upfrontCents,
    },
  };
}

function summaryLines(course: NzCourse): string[] {
  const preview = previewCoursePlan(course, { firstPaymentDate: "2026-10-02" });
  assert.equal(preview.totalPayableCents, course.paymentPlanCourseFeeCents);
  const rows = compactPaymentPlanSummary({
    courseName: course.name,
    courseFeeCents: course.paymentPlanCourseFeeCents,
    preview,
  });
  return rows.map((row) =>
    row.detail ? `${row.label}: ${row.value} | ${row.detail}` : `${row.label}: ${row.value}`,
  );
}

describe("Bela compact payment-plan summary", () => {
  it("keeps the compact layout on Bela and off OLI", () => {
    process.env.STUDENTPAY_ENV = "sandbox";
    const bela = toPublicTenant(getNzTenantBySlug("bela-nz")!);
    const oli = toPublicTenant(getNzTenantBySlug("oli")!);
    assert.equal(usesCompactPlanSummary(bela.checkout), true);
    assert.equal(bela.checkout.planSummaryLayout, "compact");
    assert.equal(usesCompactPlanSummary(oli.checkout), false);
    assert.equal(oli.checkout.planSummaryLayout, undefined);
    assert.equal(oli.checkout.taxPresentation?.mode, "gst_inclusive_breakdown");
    assert.equal(
      kitDisclosureForPolicy(bela.kitPolicy),
      "Payment plan covers course tuition only. Kit not included in this payment plan.",
    );
    assert.equal(kitDisclosureForPolicy(oli.kitPolicy), null);
  });

  it("presents Nail Bundle residual, Lash equal instalments, Full Beauty residual, and the small residual", () => {
    const nail = summaryLines(
      belaDerivedCourse({
        name: "Nail Bundle + Kits",
        feeCents: 308_000,
        upfrontCents: 1_000,
        regularCents: 2_000,
      }),
    );
    assert.deepEqual(nail, [
      "Course: Nail Bundle + Kits",
      "Course fee: $3,080.00",
      "Upfront payment: $10.00",
      "Weekly payment: $20.00",
      "Payment schedule: 153 weekly payments of $20.00 | Final payment of $10.00",
      "Total course fee: $3,080.00",
    ]);

    const lash = summaryLines(
      belaDerivedCourse({
        name: "Lash Business Bundle",
        feeCents: 280_000,
        upfrontCents: 1_000,
        regularCents: 1_500,
      }),
    );
    assert.deepEqual(lash, [
      "Course: Lash Business Bundle",
      "Course fee: $2,800.00",
      "Upfront payment: $10.00",
      "Weekly payment: $15.00",
      "Payment schedule: 186 weekly payments of $15.00",
      "Total course fee: $2,800.00",
    ]);
    assert.equal(lash.some((line) => line.includes("Final payment")), false);

    const fullBeauty = summaryLines(
      belaDerivedCourse({
        name: "Full Beauty Bundle + Kits",
        feeCents: 960_000,
        upfrontCents: 1_000,
        regularCents: 2_500,
      }),
    );
    assert.deepEqual(fullBeauty, [
      "Course: Full Beauty Bundle + Kits",
      "Course fee: $9,600.00",
      "Upfront payment: $10.00",
      "Weekly payment: $25.00",
      "Payment schedule: 383 weekly payments of $25.00 | Final payment of $15.00",
      "Total course fee: $9,600.00",
    ]);

    const mastery = summaryLines(
      belaDerivedCourse({
        name: "Beauty Business Mastery",
        feeCents: 9_700,
        upfrontCents: 1_000,
        regularCents: 2_000,
      }),
    );
    assert.deepEqual(mastery, [
      "Course: Beauty Business Mastery",
      "Course fee: $97.00",
      "Upfront payment: $10.00",
      "Weekly payment: $20.00",
      "Payment schedule: 4 weekly payments of $20.00 | Final payment of $7.00",
      "Total course fee: $97.00",
    ]);
  });

  it("labels the total from the authoritative course fee, not a summed instalment display", () => {
    const course = belaDerivedCourse({
      name: "Nail Bundle + Kits",
      feeCents: 308_000,
      upfrontCents: 1_000,
      regularCents: 2_000,
    });
    const preview = previewCoursePlan(course, { firstPaymentDate: "2026-10-02" });
    const rows = compactPaymentPlanSummary({
      courseName: course.name,
      courseFeeCents: 308_000,
      preview: { ...preview, totalPayableCents: 1 },
    });
    assert.equal(rows.find((row) => row.emphasis === "total")?.value, "$3,080.00");
    assert.equal(rows.filter((row) => row.detail).length, 1);
  });

  it("keeps OLI Section 1 on the spread review list and stacks the compact summary on mobile", () => {
    const root = path.join(fileURLToPath(new URL("../../", import.meta.url)));
    const checkout = fs.readFileSync(
      path.join(root, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    const css = fs.readFileSync(
      path.join(root, "components/nz-enrolment/enrolment-checkout.module.css"),
      "utf8",
    );
    assert.match(checkout, /usesCompactPlanSummary/);
    assert.match(checkout, /data-testid="nz-plan-summary"/);
    assert.match(checkout, /<dt>Payment plan<\/dt>/);
    assert.match(checkout, /<dt>Schedule<\/dt>/);
    assert.match(checkout, /<dt>Total<\/dt>/);
    assert.match(checkout, /className=\{styles\.review\}/);
    assert.match(css, /\.review \{\s*grid-template-columns: 1fr auto;/);
    assert.match(css, /\.planSummaryRow,\s*\.planSummaryTotal \{\s*display: grid;\s*grid-template-columns: 200px minmax\(0, 1fr\);/);
    assert.match(css, /@media \(max-width: 720px\) \{[\s\S]*\.planSummaryRow,\s*\.planSummaryTotal \{\s*grid-template-columns: 1fr;/);
    assert.match(checkout, /nz-kit-disclosure/);
  });
});
