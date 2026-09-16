import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NZ_CHECKOUT_SECTIONS,
  NZ_CONFIRM_CTA,
  NZ_DIRECT_DEBIT_CTA,
  NZ_REMOVED_STEPPER_LABELS,
  NZ_STUDENT_DETAILS_COPY,
  confirmEnabled,
  declarationsAccepted,
  isConfirmedCheckoutStatus,
  isPayInFullChoiceVisible,
  payNowChoiceBody,
  payNowSavingFromCatalogue,
  paymentPlanChoiceCopy,
  planDisplay,
  sectionStatus,
  shouldConfirmCheckout,
  shouldCreateCheckout,
  shouldPollDirectDebitStatus,
  studentDetailsAreValid,
} from "./checkout-ui.ts";
import { getNzCourse } from "./courses.ts";
import { previewCoursePlan } from "./canonical.ts";
import { getNzTenantBySlug, toPublicTenant } from "./tenants.ts";

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
      false,
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
