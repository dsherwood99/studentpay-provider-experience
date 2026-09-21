import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  parseHostedProviderStudentAgreement,
  paymentPlanAgreementAccepted,
  providerStudentAgreementAccepted,
} from "./hosted-agreement.ts";
import { hostedCheckoutConfirmDeclarations } from "./checkout-payment-mode.ts";
import { overlayNzCourseFromApi } from "./api-catalogue-overlay.ts";
import { toPublicCourse } from "./courses.ts";
import { getNzCourse } from "./courses.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));

const validAgreement = {
  type: "provider_student_agreement" as const,
  title: "Online Learning Institute – Terms And Conditions",
  version: "2025-12-23",
  key: "OLI_NZ|Sandbox|Provider_Student_Agreement|2025-12-23",
  content_hash: "b".repeat(64),
  html: "<h1>Online Learning Institute – Terms And Conditions</h1><p>These Terms and Conditions govern access to OLI courses and include the cooling-off period.</p>",
};

const managed = ["HOSTED_PRODUCT_MODE", "STUDENTPAY_ENV"];
const previous: Record<string, string | undefined> = {};

function snapshotEnv() {
  for (const name of managed) {
    previous[name] = process.env[name];
  }
  process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
  process.env.STUDENTPAY_ENV = "sandbox";
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

describe("Hosted Provider Student Agreement", () => {
  it("parses API agreement content and rejects executable markup", () => {
    const parsed = parseHostedProviderStudentAgreement(validAgreement);
    assert.ok(parsed);
    assert.equal(parsed.version, "2025-12-23");
    assert.equal(
      parseHostedProviderStudentAgreement({
        ...validAgreement,
        html: "<script>alert(1)</script><p>Enough wording to look complete for a student agreement.</p>",
      }),
      null,
    );
    assert.equal(
      parseHostedProviderStudentAgreement({
        ...validAgreement,
        html: "<p>short</p>",
      }),
      null,
    );
  });

  it("renders Hosted course agreement from the API overlay", () => {
    const local = getNzCourse("oli", "studentpay-test-course")!;
    const overlaid = overlayNzCourseFromApi(
      local,
      {
        course_code: "OLI_TEST_001",
        payment_in_full_course_fee_cents: 1000,
        payment_plan_course_fee_cents: 1000,
        enrolment_payment_options: ["payment_plan", "pay_in_full"],
        frequency: "Weekly",
        regular_instalment_cents: 250,
        number_of_instalments: 4,
        upfront_amount_cents: 0,
      },
      validAgreement,
    );
    assert.ok(overlaid);
    const pub = toPublicCourse(overlaid);
    assert.equal(pub.providerStudentAgreement?.version, "2025-12-23");
    assert.match(pub.providerStudentAgreement?.html || "", /cooling-off period/);
    assert.equal(pub.paymentInFullCourseFeeCents, 1000);
    assert.equal(overlaid.planPolicy.mode === "derived_regular" ? overlaid.planPolicy.regularInstalmentCents : 0, 250);
  });

  it("fail-closes Hosted when Salesforce-authority agreement acceptance is missing", () => {
    assert.equal(
      providerStudentAgreementAccepted({ required: true, accepted: false }),
      false,
    );
    assert.equal(
      providerStudentAgreementAccepted({ required: true, accepted: true }),
      true,
    );
    assert.equal(
      providerStudentAgreementAccepted({ required: false, accepted: false }),
      true,
    );
  });

  it("keeps Provider Student Agreement acceptance separate from Payment Plan Agreement", () => {
    assert.equal(
      providerStudentAgreementAccepted({ required: true, accepted: true }),
      true,
    );
    assert.equal(
      paymentPlanAgreementAccepted({ required: true, accepted: false }),
      false,
    );
    assert.equal(
      paymentPlanAgreementAccepted({ required: true, accepted: true }),
      true,
    );
    assert.equal(
      providerStudentAgreementAccepted({ required: true, accepted: false }),
      false,
    );

    const pif = hostedCheckoutConfirmDeclarations({
      selectedOption: "pay_in_full",
      declarations: {
        payment_plan_accepted: false,
        information_confirmed: true,
        privacy_consent_accepted: true,
        provider_student_agreement_accepted: true,
      },
      providerStudentAgreement: validAgreement,
    });
    assert.equal(pif && "payment_plan_accepted" in pif, false);
    assert.equal(pif?.provider_student_agreement_accepted, true);

    const plan = hostedCheckoutConfirmDeclarations({
      selectedOption: "interest_free_payment_plan",
      declarations: {
        payment_plan_accepted: true,
        information_confirmed: true,
        privacy_consent_accepted: true,
        provider_student_agreement_accepted: false,
      },
      providerStudentAgreement: validAgreement,
    });
    assert.equal(plan && "payment_plan_accepted" in plan && plan.payment_plan_accepted, true);
    assert.equal(plan?.provider_student_agreement_accepted, false);
    assert.equal(plan?.agreements?.provider_student?.version, validAgreement.version);
    assert.equal(plan?.agreements?.provider_student?.key, validAgreement.key);
    assert.equal(
      plan?.agreements?.provider_student?.content_hash,
      validAgreement.content_hash,
    );

    const confirmRoute = fs.readFileSync(
      new URL("../../app/api/enrolment-checkout/confirm/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(confirmRoute, /body\.declarations\?\.agreements/);
    assert.match(
      confirmRoute,
      /buildCanonicalConfirmPayload\(\{[\s\S]*declarations,/,
    );
  });

  it("does not replace a historically accepted version with a newer displayed version", () => {
    const accepted = {
      version: "2025-12-23",
      key: "OLI_NZ|Sandbox|Provider_Student_Agreement|2025-12-23",
      content_hash: validAgreement.content_hash,
    };
    const newer = {
      ...validAgreement,
      version: "2099-01-01",
      key: "OLI_NZ|Sandbox|Provider_Student_Agreement|2099-01-01",
    };
    assert.notEqual(accepted.version, newer.version);
    assert.equal(accepted.version, "2025-12-23");
  });

  it("shows a dedicated Provider Student Agreement checkbox in Hosted checkout", () => {
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    assert.match(checkout, /provider_student_agreement_accepted/);
    assert.match(checkout, /This is separate from the StudentPay Payment Plan Agreement/);
    assert.match(checkout, /dangerouslySetInnerHTML/);
    assert.match(checkout, /providerAgreement\.html/);
    assert.doesNotMatch(checkout, /providerAgreement\.key/);
    assert.doesNotMatch(checkout, /providerAgreement\.content_hash/);
    assert.doesNotMatch(checkout, /salesforce_course_id/);
  });
});
