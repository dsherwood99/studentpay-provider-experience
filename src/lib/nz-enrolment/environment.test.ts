import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getNzCourse, getNzCoursesForProvider } from "./courses.ts";
import {
  GENERIC_MAX_RECURRING_INSTALMENTS,
  getHostedProductMode,
  isNzEnrolmentProductAvailable,
  requireNzEnrolmentSessionSecret,
  resolveNzApiBaseUrl,
} from "./environment.ts";
import { getNzTenantBySlug } from "./tenants.ts";
import { getTenantApiKey } from "./secrets.ts";

const managed = [
  "HOSTED_PRODUCT_MODE",
  "STUDENTPAY_ENV",
  "NZ_STUDENTPAY_API_BASE_URL",
  "NZ_ENROLMENT_SESSION_SECRET",
  "ENROLMENT_CHECKOUT_SESSION_SECRET",
  "STUDENTPAY_PROVIDER_CODE",
  "ACADEMY_PROVIDER_CODE",
  "PROVIDER_API_KEY_OLI_NZ",
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

beforeEach(snapshotEnv);
afterEach(restoreEnv);

describe("NZ hosted product and environment isolation", () => {
  it("A. nz_enrolment sandbox + sandbox API is available", () => {
    process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
    process.env.STUDENTPAY_ENV = "sandbox";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://sandbox-api.studentpay.co.nz";
    process.env.NZ_ENROLMENT_SESSION_SECRET = "sandbox-session-secret-key";

    assert.equal(isNzEnrolmentProductAvailable(), true);
    assert.equal(resolveNzApiBaseUrl().url, "https://sandbox-api.studentpay.co.nz");
    assert.ok(getNzCourse("oli", "certification-course"));
    assert.ok(getNzTenantBySlug("fixture-institute"));
  });

  it("B. nz_enrolment production exposes approved OLI catalogue", () => {
    process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://api.studentpay.co.nz";

    const courses = getNzCoursesForProvider("oli");
    assert.equal(courses.length, 64);
    assert.ok(getNzCourse("oli", "certificate-in-psychology-counselling"));
    assert.equal(getNzCourse("oli", "certification-course"), undefined);
  });

  it("C. Bela deployment mode does not enable NZ product", () => {
    process.env.STUDENTPAY_PROVIDER_CODE = "BELA";
    assert.equal(getHostedProductMode(), "bela");
    assert.equal(isNzEnrolmentProductAvailable(), false);
    assert.equal(resolveNzApiBaseUrl().error, "NZ_HOSTED_PRODUCT_DISABLED");
  });

  it("D. Academy deployment mode does not enable NZ product", () => {
    process.env.ACADEMY_PROVIDER_CODE = "ACADEMYAU";
    assert.equal(getHostedProductMode(), "academy");
    assert.equal(isNzEnrolmentProductAvailable(), false);
  });

  it("E. production NZ mode + sandbox API fails closed", () => {
    process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://sandbox-api.studentpay.co.nz";
    assert.equal(resolveNzApiBaseUrl().error, "NZ_API_PRODUCTION_SANDBOX_MISMATCH");
  });

  it("F. production NZ mode + missing API base fails closed", () => {
    process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
    process.env.STUDENTPAY_ENV = "production";
    assert.equal(resolveNzApiBaseUrl().error, "NZ_API_BASE_REQUIRED");
  });

  it("G. production NZ mode + missing session secret fails closed", () => {
    process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
    process.env.STUDENTPAY_ENV = "production";
    assert.equal(requireNzEnrolmentSessionSecret().error, "SESSION_NOT_CONFIGURED");
  });

  it("H. missing provider key fails closed", () => {
    process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
    process.env.STUDENTPAY_ENV = "sandbox";
    const tenant = getNzTenantBySlug("oli");
    assert.ok(tenant);
    assert.equal(getTenantApiKey(tenant!), "");
  });

  it("I. fixture-institute is unavailable in production", () => {
    process.env.STUDENTPAY_ENV = "production";
    assert.equal(getNzTenantBySlug("fixture-institute"), undefined);
    assert.equal(getNzCourse("fixture-institute", "example-certificate"), undefined);
  });

  it("J. sandbox certification fixture is unavailable in production", () => {
    process.env.STUDENTPAY_ENV = "production";
    assert.equal(getNzCourse("oli", "certification-course"), undefined);
  });

  it("uses a generic Salesforce-aligned instalment ceiling, not an OLI 52-week demo cap", () => {
    assert.equal(GENERIC_MAX_RECURRING_INSTALMENTS, 400);
  });
});
