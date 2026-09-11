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
  planDisplay,
  sectionStatus,
  shouldConfirmCheckout,
  shouldCreateCheckout,
  shouldPollDirectDebitStatus,
  studentDetailsAreValid,
} from "./checkout-ui.ts";
import { getNzCourse } from "./courses.ts";
import { previewCoursePlan } from "./canonical.ts";

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
