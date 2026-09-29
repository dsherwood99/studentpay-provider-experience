import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { listAuthoritativeHostedCourses } from "./api-catalogue-overlay.ts";
import belaWebsite from "./catalogues/bela-website-courses.json" with { type: "json" };
import { getNzCourse, getNzCoursesForProvider } from "./courses.ts";
import { courseEnrolmentPaymentOptions } from "./pay-in-full.ts";
import { getNzTenantBySlug } from "./tenants.ts";

const managed = [
  "HOSTED_PRODUCT_MODE",
  "STUDENTPAY_ENV",
  "NZ_STUDENTPAY_API_BASE_URL",
  "NZ_CATALOGUE_AUTHORITY_BELA_NZ",
  "PROVIDER_API_KEY_BELA_NZ",
  "NZ_HOSTED_TENANT_SLUG",
];

const previous: Record<string, string | undefined> = {};

function snapshotEnv() {
  for (const name of managed) {
    previous[name] = process.env[name];
    delete process.env[name];
  }
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

describe("Bela website catalogue", { concurrency: false }, () => {
  beforeEach(snapshotEnv);
  afterEach(restoreEnv);

test("Bela course list follows the published website catalogue", () => {
  process.env.STUDENTPAY_ENV = "sandbox";
  const courses = getNzCoursesForProvider("bela-nz");
  assert.equal(courses.length, belaWebsite.courses.length);
  assert.equal(courses.length, 26);
  assert.equal(new Set(courses.map((course) => course.slug)).size, 26);
  assert.deepEqual(
    courses.map((course) => course.slug),
    belaWebsite.courses.map((course) =>
      "studentPaySlug" in course && course.studentPaySlug
        ? course.studentPaySlug
        : course.handle,
    ),
  );

  const lash = getNzCourse("bela-nz", "lash-business-bundle");
  assert.ok(lash);
  assert.equal(lash?.courseCode, "BELA_LASH_BUSINESS_BUNDLE");
  assert.equal(lash?.paymentPlanCourseFeeCents, 280_000);
  assert.equal(lash?.catalogueOnly, undefined);
  assert.deepEqual(courseEnrolmentPaymentOptions(lash!), ["payment_plan"]);
  assert.equal(
    courses.filter((course) => course.slug === "lash-business-bundle").length,
    1,
  );

  const makeup = getNzCourse("bela-nz", "makeup-artistry-course");
  assert.equal(makeup?.catalogueOnly, true);
  assert.equal(makeup?.paymentPlanCourseFeeCents, 240_000);
  assert.deepEqual(courseEnrolmentPaymentOptions(makeup!), []);
  assert.equal(makeup?.websiteUrl, "https://belabeautycollege.com/products/makeup-artistry-course");

  const closed = courses.filter((course) => course.catalogueOnly);
  assert.equal(closed.length, 25);
  const oli = getNzCoursesForProvider("oli");
  assert.equal(oli.filter((course) => !course.sandboxOnly).length, 64);
  assert.equal(oli.length, 66);
});

test("Salesforce authority keeps website courses listed without opening a plan", async () => {
  const previous = {
    HOSTED_PRODUCT_MODE: process.env.HOSTED_PRODUCT_MODE,
    STUDENTPAY_ENV: process.env.STUDENTPAY_ENV,
    NZ_STUDENTPAY_API_BASE_URL: process.env.NZ_STUDENTPAY_API_BASE_URL,
    NZ_CATALOGUE_AUTHORITY_BELA_NZ: process.env.NZ_CATALOGUE_AUTHORITY_BELA_NZ,
    PROVIDER_API_KEY_BELA_NZ: process.env.PROVIDER_API_KEY_BELA_NZ,
    NZ_HOSTED_TENANT_SLUG: process.env.NZ_HOSTED_TENANT_SLUG,
  };
  process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
  process.env.STUDENTPAY_ENV = "sandbox";
  process.env.NZ_STUDENTPAY_API_BASE_URL = "https://sandbox-api.studentpay.co.nz";
  process.env.NZ_CATALOGUE_AUTHORITY_BELA_NZ = "salesforce";
  process.env.PROVIDER_API_KEY_BELA_NZ = "test-key";
  delete process.env.NZ_HOSTED_TENANT_SLUG;

  try {
    const tenant = getNzTenantBySlug("bela-nz")!;
    const listed = await listAuthoritativeHostedCourses(tenant, async () => {
      return new Response(
        JSON.stringify({
          courses: [],
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
    assert.equal(listed.courses.length, 26);
    const lash = listed.courses.find((course) => course.slug === "lash-business-bundle");
    assert.equal(lash?.catalogueOnly, true);
    assert.equal(lash?.paymentPlanCourseFeeCents, 280_000);
    assert.equal(
      listed.courses.find((course) => course.slug === "full-beauty-bundle")?.catalogueOnly,
      true,
    );
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Salesforce plan economics override local prices and keep enrolment closed", async () => {
  process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
  process.env.STUDENTPAY_ENV = "sandbox";
  process.env.NZ_STUDENTPAY_API_BASE_URL = "https://sandbox-api.studentpay.co.nz";
  process.env.NZ_CATALOGUE_AUTHORITY_BELA_NZ = "salesforce";
  process.env.PROVIDER_API_KEY_BELA_NZ = "test-key";

  const tenant = getNzTenantBySlug("bela-nz")!;
  const listed = await listAuthoritativeHostedCourses(tenant, async () => {
    return new Response(
      JSON.stringify({
        courses: [
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
          },
          {
            course_code: "BELA_MAKEUP_ARTISTRY_COURSE",
            slug: "makeup-artistry-course",
            name: "Makeup Artistry Course",
            enrolment_payment_options: ["payment_plan", "pay_in_full"],
            payment_in_full_course_fee_cents: 240_000,
            payment_plan_course_fee_cents: 240_000,
            frequency: "Weekly",
            plan_mode: "derived_regular",
            regular_instalment_cents: 2_000,
            number_of_instalments: 120,
            upfront_amount_cents: 1_000,
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
  const lash = listed.courses.find((course) => course.slug === "lash-business-bundle");
  assert.equal(lash?.legalGateClosed, true);
  assert.equal(lash?.catalogueOnly, undefined);
  assert.equal(lash?.paymentPlanCourseFeeCents, 280_000);
  assert.equal(lash?.planPolicy.mode, "derived_regular");
  if (lash?.planPolicy.mode === "derived_regular") {
    assert.equal(lash.planPolicy.regularInstalmentCents, 1_500);
    assert.equal(lash.planPolicy.upfrontAmountCents, 1_000);
  }
  assert.deepEqual(courseEnrolmentPaymentOptions(lash!), []);

  const makeup = listed.courses.find((course) => course.slug === "makeup-artistry-course");
  assert.equal(makeup?.legalGateClosed, true);
  assert.equal(makeup?.paymentPlanCourseFeeCents, 240_000);
  if (makeup?.planPolicy.mode === "derived_regular") {
    assert.equal(makeup.planPolicy.regularInstalmentCents, 2_000);
  }
  assert.equal(makeup?.enrolmentPaymentOptions?.includes("pay_in_full"), false);

  const fullBeauty = listed.courses.find((course) => course.slug === "full-beauty-bundle");
  assert.equal(fullBeauty?.catalogueOnly, true);
  assert.equal(fullBeauty?.paymentPlanCourseFeeCents, 960_000);
  assert.equal(listed.courses.length, 26);
  assert.deepEqual(
    listed.courses.map((course) => course.slug),
    belaWebsite.courses.map((course) =>
      "studentPaySlug" in course && course.studentPaySlug
        ? course.studentPaySlug
        : course.handle,
    ),
  );
});

test("a dedicated Bela host lists every website course with only the approved plan open", () => {
  process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
  process.env.STUDENTPAY_ENV = "production";
  process.env.NZ_STUDENTPAY_API_BASE_URL = "https://api.studentpay.co.nz";
  process.env.NZ_HOSTED_TENANT_SLUG = "bela-nz";

  const courses = getNzCoursesForProvider("bela-nz");
  assert.equal(courses.length, 26);
  assert.equal(getNzCourse("bela-nz", "lash-business-bundle")?.catalogueOnly, undefined);
  assert.equal(getNzCourse("bela-nz", "full-beauty-bundle")?.catalogueOnly, true);
  assert.equal(getNzCoursesForProvider("oli").length, 0);
});
});
