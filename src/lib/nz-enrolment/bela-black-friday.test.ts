import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  listAuthoritativeHostedCourses,
  resolveAuthoritativeHostedCourseBySlug,
} from "./api-catalogue-overlay.ts";
import { getNzCourse } from "./courses.ts";
import {
  NZ_PAYMENT_PLAN_COPY,
  checkoutStudentForDisplay,
  planSectionLead,
} from "./checkout-ui.ts";
import { kitDisclosureForPolicy } from "./kit-policy.ts";
import { getHostedProductMode } from "./environment.ts";
import { derivePlanFromRegularInstalment } from "./plan-math.ts";
import { isNzHostedReviewMode } from "./review-mode.ts";
import { getNzTenantBySlug } from "./tenants.ts";

const managed = [
  "HOSTED_PRODUCT_MODE",
  "STUDENTPAY_ENV",
  "NZ_STUDENTPAY_API_BASE_URL",
  "NZ_CATALOGUE_AUTHORITY_BELA_NZ",
  "PROVIDER_API_KEY_BELA_NZ",
  "NZ_HOSTED_TENANT_SLUG",
  "NZ_HOSTED_REVIEW_MODE",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_BRANCH_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
];
const previous: Record<string, string | undefined> = {};

const agreement = {
  type: "provider_student_agreement",
  title: "Bela Beauty College — Provider Student Payment Plan Terms",
  version: "nz-provider-student-2026-10-01-v3",
  key: "BELA_NZ|Sandbox|Provider_Student_Agreement|nz-provider-student-2026-10-01-v3",
  content_hash: "b".repeat(64),
  html: "<p>Kit policy: KIT_NOT_INCLUDED. Kit not included. Course access: 2 years. The payment plan is filled from the Active Salesforce price version.</p>",
};

function offer(input: {
  code: string;
  slug: string;
  name: string;
  price: number;
  count: number;
}) {
  return {
    course_code: input.code,
    slug: input.slug,
    name: input.name,
    enrolment_payment_options: ["payment_plan"],
    payment_in_full_course_fee_cents: input.price,
    payment_plan_course_fee_cents: input.price,
    frequency: "Weekly",
    plan_mode: "derived_regular",
    regular_instalment_cents: 1250,
    number_of_instalments: input.count,
    upfront_amount_cents: 0,
    description:
      "Kit not included. Course access is 2 years and is separate from the repayment term. The first weekly payment of NZD 12.50 is 7 days after enrolment.",
    provider_student_agreement: agreement,
  };
}

describe("Bela NZ Black Friday offers", { concurrency: false }, () => {
  beforeEach(() => {
    for (const name of managed) {
      previous[name] = process.env[name];
      delete process.env[name];
    }
  });
  afterEach(() => {
    for (const name of managed) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });

  test("sandbox catalogue shows the two offers without changing the live Lash plan", async () => {
    process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
    process.env.STUDENTPAY_ENV = "sandbox";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://sandbox-api.studentpay.co.nz";
    process.env.NZ_CATALOGUE_AUTHORITY_BELA_NZ = "salesforce";
    process.env.PROVIDER_API_KEY_BELA_NZ = "test-key";

    const tenant = getNzTenantBySlug("bela-nz")!;
    assert.equal(kitDisclosureForPolicy(tenant.kitPolicy), "Payment plan covers course tuition only. Kit not included in this payment plan.");
    const listed = await listAuthoritativeHostedCourses(tenant, async () => {
      return new Response(
        JSON.stringify({
          courses: [
            offer({
              code: "BELA_NAIL_BUNDLE_BLACK_FRIDAY",
              slug: "nail-bundle-black-friday",
              name: "Nail Bundle — Black Friday",
              price: 385_000,
              count: 308,
            }),
            offer({
              code: "BELA_LASH_BUNDLE_BLACK_FRIDAY",
              slug: "lash-bundle-black-friday",
              name: "Lash Bundle — Black Friday",
              price: 280_000,
              count: 224,
            }),
            {
              course_code: "BELA_LASH_BUSINESS_BUNDLE",
              slug: "lash-business-bundle",
              name: "Lash Business Bundle",
              enrolment_payment_options: ["payment_plan"],
              payment_in_full_course_fee_cents: 280_000,
              payment_plan_course_fee_cents: 280_000,
              frequency: "Weekly",
              plan_mode: "derived_regular",
              regular_instalment_cents: 1_500,
              number_of_instalments: 186,
              upfront_amount_cents: 1_000,
              provider_student_agreement: agreement,
            },
          ],
          provider_config: {
            provider_code: "BELA_NZ",
            brand_name: "Bela Beauty College",
            support_email: "support@belabeautycollege.com",
            support_phone: "+64 9 888 6459",
            privacy_url: "https://belabeautycollege.com/policies/privacy-policy",
            pay_in_full_enabled: false,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    assert.equal(listed.status, "ok");
    if (listed.status !== "ok") return;

    const nail = listed.courses.find((course) => course.slug === "nail-bundle-black-friday");
    const lashOffer = listed.courses.find((course) => course.slug === "lash-bundle-black-friday");
    const liveLash = listed.courses.find((course) => course.slug === "lash-business-bundle");
    assert.equal(nail?.legalGateClosed, undefined);
    assert.equal(lashOffer?.legalGateClosed, undefined);
    assert.equal(nail?.paymentPlanCourseFeeCents, 385_000);
    assert.equal(lashOffer?.paymentPlanCourseFeeCents, 280_000);
    assert.match(nail?.description || "", /Course access is 2 years/);
    assert.match(nail?.description || "", /separate from the repayment term/);
    assert.match(lashOffer?.description || "", /separate from the repayment term/);
    for (const course of [nail, lashOffer]) {
      assert.equal(course?.planPolicy.mode, "derived_regular");
      if (course?.planPolicy.mode !== "derived_regular") continue;
      const preview = derivePlanFromRegularInstalment({
        coursePriceCents: course.paymentPlanCourseFeeCents,
        upfrontAmountCents: course.planPolicy.upfrontAmountCents,
        regularInstalmentCents: course.planPolicy.regularInstalmentCents,
        frequency: "Weekly",
        firstPaymentDate: "2026-11-23",
      });
      assert.equal(preview.regularInstalmentAmountCents, 1_250);
      assert.equal(preview.upfrontAmountCents, 0);
      assert.equal(preview.finalInstalmentAmountCents, null);
      assert.equal(
        preview.numberOfInstalments * preview.regularInstalmentAmountCents,
        course.paymentPlanCourseFeeCents,
      );
    }
    assert.equal(liveLash?.paymentPlanCourseFeeCents, 280_000);
    if (liveLash?.planPolicy.mode === "derived_regular") {
      assert.equal(liveLash.planPolicy.regularInstalmentCents, 1_500);
      assert.equal(liveLash.planPolicy.upfrontAmountCents, 1_000);
    }
    assert.equal(
      planSectionLead({
        courseCode: "BELA_NAIL_BUNDLE_BLACK_FRIDAY",
        showPaymentMethodRadios: false,
        paymentChoiceLead: "Choose the payment option that works best for you.",
        paymentSectionLead: NZ_PAYMENT_PLAN_COPY.intro,
      }),
      "",
    );
    assert.equal(
      planSectionLead({
        courseCode: "BELA_LASH_BUNDLE_BLACK_FRIDAY",
        showPaymentMethodRadios: false,
        paymentChoiceLead: "Choose the payment option that works best for you.",
        paymentSectionLead: NZ_PAYMENT_PLAN_COPY.intro,
      }),
      "",
    );
    assert.equal(
      planSectionLead({
        courseCode: "BELA_LASH_BUSINESS_BUNDLE",
        showPaymentMethodRadios: false,
        paymentChoiceLead: "Choose the payment option that works best for you.",
        paymentSectionLead: NZ_PAYMENT_PLAN_COPY.intro,
      }),
      NZ_PAYMENT_PLAN_COPY.intro,
    );
    assert.equal(
      planSectionLead({
        courseCode: "OLI_TEST_001",
        showPaymentMethodRadios: true,
        paymentChoiceLead: "Choose the payment option that works best for you.",
        paymentSectionLead: NZ_PAYMENT_PLAN_COPY.intro,
      }),
      "Choose the payment option that works best for you.",
    );
    const fresh = checkoutStudentForDisplay(
      {
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
      },
      null,
    );
    assert.equal(fresh.country, "New Zealand");
    const blankDraft = checkoutStudentForDisplay(fresh, { ...fresh, country: "" });
    assert.equal(blankDraft.country, "New Zealand");
    const international = checkoutStudentForDisplay(fresh, { ...fresh, country: "Japan" });
    assert.equal(international.country, "Japan");
    const edited = checkoutStudentForDisplay(
      { ...fresh, firstName: "Aroha", country: "Fiji" },
      { ...fresh, country: "New Zealand" },
    );
    assert.equal(edited.country, "Fiji");
    assert.equal(getNzCourse("bela-nz", "nail-bundle")?.catalogueOnly, true);
    assert.equal(getNzCourse("bela-nz", "nail-bundle-black-friday"), undefined);
    assert.equal(getNzCourse("bela-nz", "lash-bundle-black-friday"), undefined);
    assert.equal(getNzTenantBySlug("bela-nz")?.checkout.summaryPresentation, "course_card");
    assert.equal(getNzTenantBySlug("oli")?.checkout.summaryPresentation, undefined);
    const checkout = readFileSync(
      new URL("../../components/nz-enrolment/EnrolmentCheckout.tsx", import.meta.url),
      "utf8",
    );
    assert.match(checkout, /summaryPresentation === "course_card"/);
    assert.match(checkout, /Enrolment summary/);
    assert.match(checkout, /data-testid="nz-bela-plan-card"/);
    assert.match(checkout, /kitDisclosureForPolicy\(tenant\.kitPolicy\)/);
    assert.doesNotMatch(checkout, /280000|385000|224 payments|308 payments/);
    assert.doesNotMatch(checkout, /providerSlug === "bela-nz"|slug === "bela-nz"/);
  });

  test("preview review serves the Black Friday plans when the provider key is absent", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "studentpay-nz-bela-enrolment-git-review.vercel.app";
    assert.equal(getHostedProductMode(), "nz_enrolment");
    assert.equal(isNzHostedReviewMode(), true);
    const tenant = getNzTenantBySlug("bela-nz");
    assert.ok(tenant);
    assert.equal(getNzTenantBySlug("oli"), undefined);
    let called = false;
    const lash = await resolveAuthoritativeHostedCourseBySlug(
      tenant!,
      "lash-bundle-black-friday",
      async () => {
        called = true;
        throw new Error("review preview must not call the provider API");
      },
    );
    const nail = await resolveAuthoritativeHostedCourseBySlug(
      tenant!,
      "nail-bundle-black-friday",
      async () => {
        called = true;
        throw new Error("review preview must not call the provider API");
      },
    );
    assert.equal(called, false);
    assert.equal(lash.status, "ok");
    assert.equal(nail.status, "ok");
    if (lash.status !== "ok" || nail.status !== "ok") return;
    assert.equal(lash.source, "local");
    assert.equal(lash.course.paymentPlanCourseFeeCents, 280_000);
    assert.equal(nail.course.paymentPlanCourseFeeCents, 385_000);
    assert.equal(lash.course.legalGateClosed, true);
    assert.equal(lash.course.providerStudentAgreement, undefined);
    for (const course of [lash.course, nail.course]) {
      assert.equal(course.planPolicy.mode, "derived_regular");
      if (course.planPolicy.mode !== "derived_regular") continue;
      const preview = derivePlanFromRegularInstalment({
        coursePriceCents: course.paymentPlanCourseFeeCents,
        upfrontAmountCents: course.planPolicy.upfrontAmountCents,
        regularInstalmentCents: course.planPolicy.regularInstalmentCents,
        frequency: "Weekly",
        firstPaymentDate: "2026-11-23",
      });
      assert.equal(preview.regularInstalmentAmountCents, 1_250);
      assert.equal(preview.upfrontAmountCents, 0);
      assert.equal(
        preview.numberOfInstalments,
        course.courseCode === "BELA_LASH_BUNDLE_BLACK_FRIDAY" ? 224 : 308,
      );
    }
    process.env.VERCEL_ENV = "production";
    assert.equal(isNzHostedReviewMode(), false);
    const production = await resolveAuthoritativeHostedCourseBySlug(
      tenant!,
      "lash-bundle-black-friday",
      async () => {
        throw new Error("production must not use the review fixture");
      },
    );
    assert.equal(production.status, "not_found");
  });

  test("an authorised catalogue still wins over the review fixture", async () => {
    process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
    process.env.STUDENTPAY_ENV = "sandbox";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://sandbox-api.studentpay.co.nz";
    process.env.NZ_CATALOGUE_AUTHORITY_BELA_NZ = "salesforce";
    process.env.PROVIDER_API_KEY_BELA_NZ = "test-key";
    process.env.NZ_HOSTED_TENANT_SLUG = "bela-nz";
    process.env.NZ_HOSTED_REVIEW_MODE = "true";
    process.env.VERCEL_ENV = "preview";
    const tenant = getNzTenantBySlug("bela-nz")!;
    let called = false;
    const resolved = await resolveAuthoritativeHostedCourseBySlug(
      tenant,
      "lash-bundle-black-friday",
      async () => {
        called = true;
        return new Response(
          JSON.stringify({
            courses: [
              offer({
                code: "BELA_LASH_BUNDLE_BLACK_FRIDAY",
                slug: "lash-bundle-black-friday",
                name: "Lash Bundle — Black Friday",
                price: 280_000,
                count: 224,
              }),
            ],
            provider_config: {
              provider_code: "BELA_NZ",
              brand_name: "Bela Beauty College",
              support_email: "support@belabeautycollege.com",
              support_phone: "+64 9 888 6459",
              privacy_url: "https://belabeautycollege.com/policies/privacy-policy",
              pay_in_full_enabled: false,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    );
    assert.equal(called, true);
    assert.equal(resolved.status, "ok");
    if (resolved.status !== "ok") return;
    assert.equal(resolved.source, "api");
    const denied = await resolveAuthoritativeHostedCourseBySlug(
      tenant,
      "nail-bundle-black-friday",
      async () => new Response("unauthorized", { status: 401 }),
    );
    assert.equal(denied.status, "ok");
    if (denied.status !== "ok") return;
    assert.equal(denied.source, "local");
    assert.equal(denied.course.paymentPlanCourseFeeCents, 385_000);
  });
});
