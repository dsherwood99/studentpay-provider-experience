import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  dedicatedHostHidesGenericDemoChrome,
  dedicatedHostPlatformBrand,
  dedicatedProductionHomePath,
  getDedicatedProductionProvider,
  isDedicatedBelaProductionHost,
  isDedicatedCatalogueProductionHost,
} from "./host-isolation.ts";
import { isProviderSlugBlockedByDeployment } from "./provider-bindings.ts";

const managed = [
  "STUDENTPAY_PROVIDER_CODE",
  "ACADEMY_PROVIDER_CODE",
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
});
