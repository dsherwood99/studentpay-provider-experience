import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  overlayNzCourseFromApi,
  resolveAuthoritativeHostedCourse,
  type NzApiPublicCourse,
} from "./api-catalogue-overlay.ts";
import {
  SANDBOX_DEFAULT_SALESFORCE_CANARY_COURSES,
  isSalesforceAuthorityCourse,
  parseSalesforceCanaryCourses,
  resolveSalesforceCanaryCoursesConfig,
} from "./catalogue-authority.ts";
import { getNzCourse } from "./courses.ts";
import { getNzTenantBySlug } from "./tenants.ts";

const managed = [
  "HOSTED_PRODUCT_MODE",
  "STUDENTPAY_ENV",
  "NZ_STUDENTPAY_API_BASE_URL",
  "NZ_ENROLMENT_SESSION_SECRET",
  "NZ_CATALOGUE_SALESFORCE_CANARY_COURSES",
  "NZ_CATALOGUE_OVERLAY_FORCE_UNAVAILABLE",
  "PROVIDER_API_KEY_OLI_NZ",
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
  process.env.NZ_ENROLMENT_SESSION_SECRET = "unit-test-session-secret-key";
  process.env.PROVIDER_API_KEY_OLI_NZ = "spnz_test_overlay_key";
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

const apiSuccess: NzApiPublicCourse = {
  course_code: "OLI_TEST_001",
  slug: "studentpay-test-course",
  name: "OLI Test Course – StudentPay",
  description: "Authoritative sandbox terms.",
  status: "active",
  enrolment_payment_options: ["payment_plan", "pay_in_full"],
  payment_in_full_course_fee_cents: 1000,
  payment_plan_course_fee_cents: 1000,
  frequency: "Weekly",
  plan_mode: "derived_regular",
  regular_instalment_cents: 250,
  number_of_instalments: 4,
  upfront_amount_cents: 0,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Hosted Salesforce catalogue authority", () => {
  it("defaults the sandbox canary list to OLI_NZ:OLI_TEST_001 without a literal backslash", () => {
    assert.equal(
      SANDBOX_DEFAULT_SALESFORCE_CANARY_COURSES,
      "OLI_NZ:OLI_TEST_001",
    );
    assert.equal(SANDBOX_DEFAULT_SALESFORCE_CANARY_COURSES.includes("\\"), false);
    assert.deepEqual(parseSalesforceCanaryCourses(undefined), []);
    assert.equal(
      resolveSalesforceCanaryCoursesConfig(),
      "OLI_NZ:OLI_TEST_001",
    );
    const tenant = getNzTenantBySlug("oli")!;
    const course = getNzCourse("oli", "studentpay-test-course")!;
    assert.equal(isSalesforceAuthorityCourse(tenant, course), true);
    const psy = getNzCourse("oli", "certificate-in-psychology-counselling")!;
    assert.equal(isSalesforceAuthorityCourse(tenant, psy), false);
  });

  it("expands the allowlist from env without UI course hardcoding", () => {
    process.env.NZ_CATALOGUE_SALESFORCE_CANARY_COURSES =
      "OLI_NZ:OLI_TEST_001,OLI_NZ:PSY101";
    const tenant = getNzTenantBySlug("oli")!;
    assert.equal(
      isSalesforceAuthorityCourse(tenant, getNzCourse("oli", "studentpay-test-course")!),
      true,
    );
    assert.equal(
      isSalesforceAuthorityCourse(
        tenant,
        getNzCourse("oli", "certificate-in-psychology-counselling")!,
      ),
      true,
    );
    process.env.NZ_CATALOGUE_SALESFORCE_CANARY_COURSES = "none";
    assert.equal(resolveSalesforceCanaryCoursesConfig(), "");
    assert.equal(
      isSalesforceAuthorityCourse(tenant, getNzCourse("oli", "studentpay-test-course")!),
      false,
    );
  });

  it("renders Salesforce-authority terms on API success and does not keep local prices", async () => {
    const tenant = getNzTenantBySlug("oli")!;
    const local = getNzCourse("oli", "studentpay-test-course")!;
    const fetchImpl: typeof fetch = async () =>
      jsonResponse(200, {
        course: {
          ...apiSuccess,
          name: "OLI Test Course – Salesforce Authority",
          payment_in_full_course_fee_cents: 2000,
          payment_plan_course_fee_cents: 2000,
          regular_instalment_cents: 500,
        },
      });
    const resolved = await resolveAuthoritativeHostedCourse(
      tenant,
      local,
      fetchImpl,
    );
    assert.equal(resolved.status, "ok");
    if (resolved.status !== "ok") {
      return;
    }
    assert.equal(resolved.source, "api");
    assert.equal(resolved.course.name, "OLI Test Course – Salesforce Authority");
    assert.equal(resolved.course.paymentInFullCourseFeeCents, 2000);
    assert.equal(resolved.course.paymentPlanCourseFeeCents, 2000);
    assert.notEqual(resolved.course.paymentInFullCourseFeeCents, local.paymentInFullCourseFeeCents);
  });

  it("fail-closes when API configuration is missing", async () => {
    delete process.env.NZ_STUDENTPAY_API_BASE_URL;
    delete process.env.PROVIDER_API_KEY_OLI_NZ;
    const tenant = getNzTenantBySlug("oli")!;
    const local = getNzCourse("oli", "studentpay-test-course")!;
    const resolved = await resolveAuthoritativeHostedCourse(tenant, local, async () => {
      throw new Error("fetch must not run when config is missing");
    });
    assert.deepEqual(resolved, { status: "unavailable", reason: "missing_config" });
  });

  it("fail-closes when the API fetch throws", async () => {
    const tenant = getNzTenantBySlug("oli")!;
    const local = getNzCourse("oli", "studentpay-test-course")!;
    const resolved = await resolveAuthoritativeHostedCourse(
      tenant,
      local,
      async () => {
        throw new Error("network down");
      },
    );
    assert.deepEqual(resolved, { status: "unavailable", reason: "fetch_error" });
  });

  it("fail-closes when the API returns non-OK", async () => {
    const tenant = getNzTenantBySlug("oli")!;
    const local = getNzCourse("oli", "studentpay-test-course")!;
    const resolved = await resolveAuthoritativeHostedCourse(
      tenant,
      local,
      async () => jsonResponse(500, { success: false }),
    );
    assert.deepEqual(resolved, { status: "unavailable", reason: "http_error" });
  });

  it("fail-closes on a malformed or null API payload", async () => {
    const tenant = getNzTenantBySlug("oli")!;
    const local = getNzCourse("oli", "studentpay-test-course")!;
    const nullBody = await resolveAuthoritativeHostedCourse(
      tenant,
      local,
      async () => jsonResponse(200, { course: null }),
    );
    assert.deepEqual(nullBody, { status: "unavailable", reason: "malformed" });

    const missingFees = await resolveAuthoritativeHostedCourse(
      tenant,
      local,
      async () =>
        jsonResponse(200, {
          course: {
            course_code: "OLI_TEST_001",
            name: "Broken",
          },
        }),
    );
    assert.deepEqual(missingFees, { status: "unavailable", reason: "malformed" });
    assert.equal(overlayNzCourseFromApi(local, null), null);
    assert.equal(
      overlayNzCourseFromApi(local, {
        course_code: "OLI_TEST_001",
        payment_in_full_course_fee_cents: 1000,
      }),
      null,
    );
  });

  it("leaves legacy course behaviour unchanged and does not fetch", async () => {
    const tenant = getNzTenantBySlug("oli")!;
    const psy = getNzCourse("oli", "certificate-in-psychology-counselling")!;
    let fetched = false;
    const resolved = await resolveAuthoritativeHostedCourse(
      tenant,
      psy,
      async () => {
        fetched = true;
        return jsonResponse(500, {});
      },
    );
    assert.equal(fetched, false);
    assert.equal(resolved.status, "ok");
    if (resolved.status !== "ok") {
      return;
    }
    assert.equal(resolved.source, "local");
    assert.equal(resolved.course.courseCode, "PSY101");
    assert.equal(resolved.course.paymentPlanCourseFeeCents, 183425);
    assert.equal(resolved.course.paymentInFullCourseFeeCents, 160425);
  });

  it("keeps the Production sandbox-only course unavailable", () => {
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://api.studentpay.co.nz";
    assert.equal(getNzCourse("oli", "studentpay-test-course"), undefined);
    assert.equal(resolveSalesforceCanaryCoursesConfig(), "");
  });

  it("honours the sandbox-only injected overlay failure without substituting local prices", async () => {
    process.env.NZ_CATALOGUE_OVERLAY_FORCE_UNAVAILABLE = "true";
    const tenant = getNzTenantBySlug("oli")!;
    const local = getNzCourse("oli", "studentpay-test-course")!;
    const resolved = await resolveAuthoritativeHostedCourse(
      tenant,
      local,
      async () => jsonResponse(200, { course: apiSuccess }),
    );
    assert.deepEqual(resolved, {
      status: "unavailable",
      reason: "forced_unavailable",
    });
  });
});

describe("Hosted unavailable enrolment chrome", () => {
  it("keeps a provider-native unavailable state without internal details or checkout actions", () => {
    const source = fs.readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../components/nz-enrolment/CourseConfigurationUnavailable.tsx",
      ),
      "utf8",
    );
    assert.match(source, /Enrolment options unavailable/);
    assert.match(source, /unable to load the current enrolment options/);
    assert.match(source, /ProviderNativeHeader/);
    assert.match(source, /Choose a course/);
    assert.doesNotMatch(source, /Salesforce/i);
    assert.doesNotMatch(source, /\bAPI\b/);
    assert.doesNotMatch(source, /JSON/);
    assert.doesNotMatch(source, /NZ_CATALOGUE/);
    assert.doesNotMatch(source, /stack/i);
    assert.doesNotMatch(source, /Pay Now/);
    assert.doesNotMatch(source, /Start payment plan/);
    assert.doesNotMatch(source, /Create checkout/i);
  });
});
