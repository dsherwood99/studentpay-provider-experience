import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  NZ_CHECKOUT_SECTIONS,
  NZ_CONFIRM_CTA,
  NZ_CONFIRMATION_COPY,
  NZ_PAY_IN_FULL_CONFIRMATION_NEXT_STEPS,
  NZ_DIRECT_DEBIT_COPY,
  NZ_DIRECT_DEBIT_CTA,
  directDebitActionLabel,
  directDebitHelpCopy,
  isGoCardlessHostedAuthorisationUrl,
  NZ_REMOVED_STEPPER_LABELS,
  NZ_STUDENT_DETAILS_COPY,
  studentDetailsPreparationNotice,
  combinedDetailsPrivacyAccepted,
  confirmEnabled,
  declarationsAccepted,
  decorateConfirmationRows,
  isConfirmedCheckoutStatus,
  isPayInFullChoiceVisible,
  confirmationStudentName,
  paymentPlanConfirmationNarrative,
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
} from "./checkout-ui.ts";
import { getNzCourse } from "./courses.ts";
import { previewCoursePlan } from "./canonical.ts";
import { gstInclusiveDisplayRows } from "./tax-presentation.ts";
import { NZ_TENANTS, getNzTenantBySlug, toPublicTenant } from "./tenants.ts";

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
    const notice = studentDetailsPreparationNotice("Bela Beauty College");
    assert.match(notice.beforeLink, /sends them to Bela Beauty College and StudentPay NZ/);
    assert.equal(notice.linkLabel, "privacy information");
    assert.match(notice.afterLink, /accept the payment plan separately/);
    assert.equal(NZ_DIRECT_DEBIT_CTA, "Set up Direct Debit");
    assert.equal(NZ_CONFIRM_CTA, "Confirm enrolment & activate payment plan");
    assert.equal(
      NZ_DIRECT_DEBIT_COPY.preparingTitle,
      "Preparing your secure bank authorisation…",
    );
    assert.equal(
      NZ_DIRECT_DEBIT_COPY.waitingBody,
      "Complete authorisation in the secure GoCardless window. This page stays open.",
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
      providerName: "Online Learning Institute",
      studentName: "Alex Taylor",
      courseFeeLabel: display.rows[0]?.value || "",
      agreementNumber: "PPA-000004",
      checkoutId: "chk_example_ref",
    });
    const narrative = paymentPlanConfirmationNarrative(preview);
    assert.equal(course.name, "Certificate in Business Administration");
    assert.equal(display.heroLabel, "$25.00 / week");
    assert.equal(narrative?.heroLabel, "$25.00 / week");
    assert.equal(narrative?.firstPaymentLabel, "24 Sep 2026");
    assert.equal(narrative?.totalLabel, display.totalLabel);
    assert.equal(
      narrative?.scheduleSentence,
      `${preview.fullRegularInstalmentCount} regular weekly instalments and one final instalment of $9.25.`,
    );
    assert.deepEqual(
      rows.map((row) => `${row.label}: ${row.value}`),
      [
        "Course: Certificate in Business Administration",
        "Provider: Online Learning Institute",
        "Student: Alex Taylor",
        "Course fee: $1,834.25",
        "Payment Plan Agreement: PPA-000004",
        "Checkout reference: chk_example_ref",
      ],
    );
    assert.equal(rows.find((row) => row.label === "Checkout reference")?.tone, "reference");
    assert.equal(rows.find((row) => row.label === "Checkout reference")?.group, "references");
    assert.equal(rows.find((row) => row.label === "Course")?.group, "course");
    assert.equal(rows.find((row) => row.label === "Student")?.group, "course");
  });

  it("builds a non-weekly schedule only from confirmed plan fields", () => {
    const narrative = paymentPlanConfirmationNarrative({
      coursePriceCents: 120000,
      upfrontAmountCents: 0,
      amountToFinanceCents: 120000,
      frequency: "Monthly",
      numberOfInstalments: 12,
      instalmentAmountCents: 10000,
      regularInstalmentAmountCents: 10000,
      finalInstalmentAmountCents: null,
      fullRegularInstalmentCount: 12,
      hasResidualFinal: false,
      firstPaymentDate: "2026-12-01",
      totalPayableCents: 120000,
    });
    assert.equal(narrative?.heroLabel, "$100.00 / month");
    assert.equal(narrative?.firstPaymentLabel, "1 Dec 2026");
    assert.equal(narrative?.scheduleSentence, "12 monthly instalments of $100.00.");
    assert.equal(narrative?.upfrontLabel, null);
    assert.doesNotMatch(narrative?.scheduleSentence || "", /week/i);
    assert.equal(paymentPlanConfirmationNarrative({
      coursePriceCents: 120000,
      upfrontAmountCents: 0,
      amountToFinanceCents: 120000,
      frequency: "Monthly",
      numberOfInstalments: 12,
      instalmentAmountCents: 10000,
      regularInstalmentAmountCents: Number.NaN,
      finalInstalmentAmountCents: null,
      fullRegularInstalmentCount: 12,
      hasResidualFinal: false,
      firstPaymentDate: "2026-12-01",
      totalPayableCents: 120000,
    }), null);
    assert.equal(confirmationStudentName({ firstName: "  ", lastName: "" }), null);
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
    const root = fileURLToPath(new URL("../../", import.meta.url));
    const checkout = fs.readFileSync(
      path.join(root, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    const confirmation = fs.readFileSync(
      path.join(root, "components/nz-enrolment/EnrolmentConfirmation.tsx"),
      "utf8",
    );
    assert.match(checkout, /paymentPlanConfirmationRows/);
    assert.match(checkout, /paymentPlanConfirmationNarrative/);
    assert.match(checkout, /decorateConfirmationRows/);
    assert.match(checkout, /styles\.ddaLayout/);
    assert.match(checkout, /styles\.ddaStatusPanel/);
    assert.match(checkout, /formatEnrolmentDisplayDate\(resolvedFirstPaymentDate\)/);
    assert.match(checkout, /data-confirm-catalogue-ms/);
    assert.match(confirmation, /styles\.confirmationCard/);
    assert.match(confirmation, /data-testid="nz-enrolment-confirmed-summary"/);
    assert.match(confirmation, /data-testid="nz-confirmation-next-steps"/);
    assert.match(confirmation, /data-testid="nz-confirmation-repayment"/);
    assert.match(confirmation, /styles\.successMark/);
    assert.match(checkout, /NZ_CONFIRMATION_COPY\.nextSteps/);
    assert.match(checkout, /onClick=\{\(\) => void startDirectDebitSetup\(\)\}/);
    assert.doesNotMatch(checkout, /<dd>\{preview\.firstPaymentDate\}<\/dd>/);
    assert.match(checkout, /nz-dda-preparing/);
    assert.doesNotMatch(checkout, /Creating enrolment/);
    assert.doesNotMatch(checkout, /account number|BSB|bank account/i);
    assert.match(checkout, /NZ_CONFIRMATION_COPY\.lead/);
    assert.doesNotMatch(`${checkout}\n${confirmation}`, /now active|pdf-retry|refetchCatalogue/i);
  });

  it("does not claim the mandate is already active on confirmation", () => {
    assert.equal(NZ_CONFIRMATION_COPY.heading, "Enrolment confirmed");
    assert.equal(
      NZ_CONFIRMATION_COPY.lead,
      "Your enrolment and StudentPay payment plan have been confirmed.",
    );
    assert.doesNotMatch(NZ_CONFIRMATION_COPY.lead, /\bactive\b/i);
    assert.doesNotMatch(NZ_CONFIRMATION_COPY.lead, /collected|settled|taken/i);
    assert.deepEqual(NZ_CONFIRMATION_COPY.nextSteps, [
      "Keep this payment plan confirmation for your records.",
      "Your education provider will provide course access and enrolment information.",
      "StudentPay will manage payments in accordance with the agreed repayment schedule.",
    ]);
    assert.doesNotMatch(NZ_CONFIRMATION_COPY.nextSteps.join(" "), /email|pdf|sent|active|taken/i);
    assert.deepEqual(NZ_PAY_IN_FULL_CONFIRMATION_NEXT_STEPS, [
      "Keep this confirmation for your records.",
      "Your education provider will provide course access and enrolment information.",
    ]);
  });

  it("does not invent GST rows for Bela NZ confirmation", () => {
    const bela = NZ_TENANTS.find((tenant) => tenant.slug === "bela-nz");
    assert.ok(bela);
    assert.equal(bela?.checkout.taxPresentation, undefined);
    const gstRows = gstInclusiveDisplayRows(280_000, bela?.checkout.taxPresentation);
    assert.equal(gstRows, null);
    const rows = paymentPlanConfirmationRows({
      courseName: "Lash Business Bundle",
      providerName: bela?.displayName,
      courseFeeLabel: "$2,800.00",
      courseFeeRows: gstRows?.map((row) => ({ ...row, group: "payments" as const })),
      paymentPlanLabel: "186 weekly payments of $15.00",
      totalPayableLabel: "$2,800.00",
      firstPaymentDate: "2026-11-18",
      agreementNumber: "PPA-000018",
      checkoutId: "BELA_NZ-PREVIEW-CONFIRM",
    });
    assert.deepEqual(
      rows.map((row) => row.label),
      [
        "Course",
        "Provider",
        "Course fee",
        "Total amount payable",
        "Payment plan",
        "First payment date",
        "Payment Plan Agreement",
        "Checkout reference",
      ],
    );
    assert.equal(rows.some((row) => /Online Learning Institute|ADM101/i.test(row.value)), false);
    assert.equal(
      rows.some((row) => /gst|excl\.|incl\./i.test(`${row.label} ${row.value}`)),
      false,
    );
  });

  it("treats a ready GoCardless URL as immediately continuable", () => {
    assert.equal(
      isGoCardlessHostedAuthorisationUrl("https://pay.gocardless.com/billing/BRQ_NEW"),
      true,
    );
    assert.equal(
      isGoCardlessHostedAuthorisationUrl(
        "https://sandbox-api.studentpay.co.nz/api/dd-setup?token=dda",
      ),
      false,
    );
    assert.equal(
      directDebitActionLabel({
        busy: true,
        popupOpen: false,
        alreadyCreated: false,
        authorisationReady: false,
      }),
      "Preparing your secure bank authorisation…",
    );
    assert.equal(
      directDebitActionLabel({
        busy: false,
        popupOpen: false,
        alreadyCreated: true,
        authorisationReady: true,
      }),
      "Continue to bank authorisation",
    );
    assert.equal(
      directDebitHelpCopy({
        studentValid: true,
        alreadyCreated: false,
        authorisationReady: false,
      }),
      NZ_DIRECT_DEBIT_COPY.readyHelp,
    );
  });
});
