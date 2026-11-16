import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { buildCanonicalConfirmPayload } from "./canonical.ts";
import {
  checkoutDetailsRecoveryNotice,
  checkoutFormRecovery,
  restoredCheckoutStudent,
} from "./checkout-ui.ts";
import { renderStudentAgreementDocument } from "./legal-branding.ts";
import type { NzStudentDetails, NzTenant } from "./types.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));

const student: NzStudentDetails = {
  firstName: "Aroha",
  lastName: "Ngata",
  email: "aroha@example.com",
  mobile: "021234567",
  dateOfBirth: "2000-01-02",
  streetAddress: "1 Queen Street",
  suburb: "Auckland Central",
  city: "Auckland",
  postcode: "1010",
  region: "Auckland",
  country: "New Zealand",
};

const blank: NzStudentDetails = {
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  dateOfBirth: "",
  streetAddress: "",
  suburb: "",
  city: "",
  postcode: "",
  region: "",
  country: "New Zealand",
};

describe("checkout session recovery", () => {
  it("restores the signed session student and first payment date for the same course", () => {
    const recovery = checkoutFormRecovery({
      providerSlug: "bela-nz",
      courseSlug: "lash-bundle-black-friday",
      expectedProviderSlug: "bela-nz",
      expectedCourseSlug: "lash-bundle-black-friday",
      student,
      firstPaymentDate: "2026-12-03",
    });
    assert.equal(recovery?.student.email, "aroha@example.com");
    assert.equal(recovery?.firstPaymentDate, "2026-12-03");
    assert.equal(restoredCheckoutStudent(blank, recovery?.student).firstName, "Aroha");
  });

  it("does not replace details the student is already editing", () => {
    const editing = { ...student, firstName: "Edited" };
    assert.equal(restoredCheckoutStudent(editing, student).firstName, "Edited");
  });

  it("fails closed for another course, an empty session, and a blank student", () => {
    assert.equal(
      checkoutFormRecovery({
        providerSlug: "bela-nz",
        courseSlug: "nail-bundle-black-friday",
        expectedProviderSlug: "bela-nz",
        expectedCourseSlug: "lash-bundle-black-friday",
        student,
        firstPaymentDate: "2026-12-03",
      }),
      null,
    );
    assert.equal(
      checkoutFormRecovery({
        providerSlug: "oli",
        courseSlug: "lash-bundle-black-friday",
        expectedProviderSlug: "bela-nz",
        expectedCourseSlug: "lash-bundle-black-friday",
        student,
      }),
      null,
    );
    assert.equal(
      checkoutFormRecovery({
        expectedProviderSlug: "bela-nz",
        expectedCourseSlug: "lash-bundle-black-friday",
        student: null,
      }),
      null,
    );
    assert.equal(
      checkoutFormRecovery({
        providerSlug: "bela-nz",
        courseSlug: "lash-bundle-black-friday",
        expectedProviderSlug: "bela-nz",
        expectedCourseSlug: "lash-bundle-black-friday",
        student: blank,
      }),
      null,
    );
  });

  it("explains an authorised checkout whose student details cannot be recovered", () => {
    const notice = checkoutDetailsRecoveryNotice({
      setupComplete: true,
      studentStarted: false,
      recovered: false,
    });
    assert.match(notice || "", /Bank authorisation is already complete/);
    assert.match(notice || "", /new application has not been created/);
    assert.equal(
      checkoutDetailsRecoveryNotice({
        setupComplete: true,
        studentStarted: true,
        recovered: true,
      }),
      null,
    );
    assert.equal(
      checkoutDetailsRecoveryNotice({
        setupComplete: false,
        studentStarted: false,
        recovered: false,
      }),
      null,
    );
  });

  it("returns recovery from the checkout status route and keeps confirmation on the original checkout", () => {
    const status = fs.readFileSync(
      path.join(srcRoot, "app/api/enrolment-checkout/status/route.ts"),
      "utf8",
    );
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    assert.match(status, /checkoutFormRecovery/);
    assert.match(status, /session\.student/);
    assert.match(status, /session\.plan\?\.firstPaymentDate/);
    assert.match(checkout, /restoredCheckoutStudent/);
    assert.doesNotMatch(checkout, /localStorage/);
    const payload = buildCanonicalConfirmPayload({
      tenant: { providerCode: "BELA_NZ" } as NzTenant,
      providerOrderId: "HOSTED-BELA_NZ-existing",
      checkoutId: "HOSTED-BELA_NZ-existing",
      checkoutToken: "token",
      opportunityId: "006RE00000gTaj3YAC",
      ddaId: "a0BRE000009Ssmg2AC",
      firstPaymentDate: "2026-12-03",
      declarations: {
        payment_plan_accepted: true,
        information_confirmed: true,
        privacy_consent_accepted: true,
        provider_student_agreement_accepted: true,
      },
    });
    assert.equal(payload.checkout.checkout_id, "HOSTED-BELA_NZ-existing");
    assert.equal(payload.checkout.dda_id, "a0BRE000009Ssmg2AC");
    assert.equal(payload.payment.first_payment_date, "2026-12-03");
    assert.equal("student" in payload, false);
  });
});

describe("student agreement document", () => {
  it("renders the authoritative agreement with its version and hash", () => {
    const html = renderStudentAgreementDocument({
      title: "Bela Beauty College — Provider Student Payment Plan Terms",
      version: "nz-provider-student-2026-10-01-v3",
      contentHash: "abc123",
      html: "<h1>Bela Beauty College — Provider Student Payment Plan Terms</h1><p>Kit not included.</p>",
    });
    assert.match(html, /Provider Student Payment Plan Terms/);
    assert.match(html, /nz-provider-student-2026-10-01-v3/);
    assert.match(html, /Document hash abc123/);
    assert.match(html, /Kit not included/);
    assert.doesNotMatch(html, /aroha@example.com|HOSTED-BELA_NZ|006RE/);
    assert.doesNotMatch(html, /#agreements/);
  });

  it("serves that document from the legal route without using the agreements hash", () => {
    const route = fs.readFileSync(
      path.join(srcRoot, "app/api/enrolment-checkout/legal/route.ts"),
      "utf8",
    );
    assert.match(route, /student-agreement/);
    assert.match(route, /renderStudentAgreementDocument/);
    assert.match(route, /agreement\.content_hash/);
    assert.doesNotMatch(route, /#agreements/);
    assert.doesNotMatch(route, /session\.student/);
  });
});
