import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  dedicatedHostHidesGenericDemoChrome,
  dedicatedHostPlatformBrand,
  dedicatedNzEnrolmentHomePath,
  dedicatedNzHostedTenantRejected,
  dedicatedProductionHomePath,
  getDedicatedProductionProvider,
  isDedicatedBelaProductionHost,
  isDedicatedCatalogueProductionHost,
} from "./host-isolation.ts";
import { getNzCourse } from "../nz-enrolment/courses.ts";
import { getNzTenantBySlug } from "../nz-enrolment/tenants.ts";
import { isProviderSlugBlockedByDeployment } from "./provider-bindings.ts";

const managed = [
  "STUDENTPAY_PROVIDER_CODE",
  "ACADEMY_PROVIDER_CODE",
  "HOSTED_PRODUCT_MODE",
  "STUDENTPAY_ENV",
  "NZ_STUDENTPAY_API_BASE_URL",
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

beforeEach(snapshotEnv);
afterEach(restoreEnv);

describe("dedicated Bela production host isolation", () => {
  it("sends the dedicated Bela host home path to the Bela courses experience", () => {
    process.env.STUDENTPAY_PROVIDER_CODE = "BELA";

    assert.equal(isDedicatedBelaProductionHost(), true);
    assert.equal(isDedicatedCatalogueProductionHost(), true);
    assert.equal(
      dedicatedProductionHomePath(),
      "/providers/bela-beauty-college/courses",
    );
    assert.equal(getDedicatedProductionProvider()?.name, "Bela Beauty College");
    assert.equal(dedicatedHostPlatformBrand(), "bela-beauty-college");
    assert.equal(dedicatedHostHidesGenericDemoChrome(), true);
  });

  it("does not treat the sandbox PE or Academy demo as a Bela production host", () => {
    assert.equal(isDedicatedBelaProductionHost(), false);
    assert.equal(dedicatedProductionHomePath(), null);
    assert.equal(dedicatedHostPlatformBrand(), null);

    process.env.STUDENTPAY_PROVIDER_CODE = "ACADEMYAU";
    assert.equal(isDedicatedBelaProductionHost(), false);
    assert.equal(dedicatedProductionHomePath(), null);
    assert.equal(dedicatedHostPlatformBrand(), null);
    assert.equal(isProviderSlugBlockedByDeployment("bela-beauty-college"), true);
    assert.equal(isProviderSlugBlockedByDeployment("bela-beauty-sandbox"), true);
  });

  it("keeps Academy and sandbox Bela routes blocked on the dedicated Bela host", () => {
    process.env.STUDENTPAY_PROVIDER_CODE = "BELA";

    assert.equal(isProviderSlugBlockedByDeployment("bela-beauty-college"), false);
    assert.equal(isProviderSlugBlockedByDeployment("academy-australia"), true);
    assert.equal(isProviderSlugBlockedByDeployment("bela-beauty-sandbox"), true);
  });

  it("hides generic PE chrome on the NZ enrolment host and sends home to the tenant catalogue", () => {
    process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";

    assert.equal(dedicatedNzEnrolmentHomePath(), "/enrol/oli");
    assert.equal(dedicatedProductionHomePath(), "/enrol/oli");
    assert.equal(dedicatedHostHidesGenericDemoChrome(), true);
    assert.equal(isDedicatedBelaProductionHost(), false);
    assert.equal(dedicatedHostPlatformBrand(), null);
    assert.equal(dedicatedNzHostedTenantRejected(), false);
  });

  it("binds a dedicated NZ host to one tenant and rejects an unknown slug", () => {
    process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_STUDENTPAY_API_BASE_URL = "https://api.studentpay.co.nz";
    process.env.NZ_HOSTED_TENANT_SLUG = "bela-nz";

    assert.equal(dedicatedNzHostedTenantRejected(), false);
    assert.equal(dedicatedNzEnrolmentHomePath(), "/enrol/bela-nz");
    assert.equal(dedicatedProductionHomePath(), "/enrol/bela-nz");
    process.env.STUDENTPAY_PROVIDER_CODE = "BELA";
    assert.equal(dedicatedProductionHomePath(), "/enrol/bela-nz");
    delete process.env.STUDENTPAY_PROVIDER_CODE;
    assert.equal(getNzTenantBySlug("oli"), undefined);
    assert.equal(getNzTenantBySlug("bela-nz")?.providerCode, "BELA_NZ");
    assert.equal(
      getNzCourse("bela-nz", "lash-business-bundle")?.name,
      "Lash Business Bundle",
    );
    assert.equal(getNzCourse("oli", "certificate-in-psychology-counselling"), undefined);

    process.env.NZ_HOSTED_TENANT_SLUG = "oli";
    assert.equal(dedicatedNzEnrolmentHomePath(), "/enrol/oli");
    assert.equal(getNzTenantBySlug("bela-nz"), undefined);
    assert.equal(getNzCourse("oli", "studentpay-test-course"), undefined);

    process.env.NZ_HOSTED_TENANT_SLUG = "not-a-provider";
    assert.equal(dedicatedNzHostedTenantRejected(), true);
    assert.equal(dedicatedNzEnrolmentHomePath(), null);
    assert.equal(dedicatedProductionHomePath(), null);
  });
});
