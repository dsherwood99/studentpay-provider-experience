import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getCoursesByProvider } from "../../config/courses.ts";
import { getProviderByCode, getProviderBySlug } from "../../config/providers.ts";
import { getProviderCheckoutBinding } from "./catalogue-checkout.ts";
import { catalogueDdaBindingAllowsProvider } from "./catalogue-dda.ts";
import {
  getCatalogueBindingByCode,
  getCatalogueProductionBoundSlug,
  getProviderBindingByCode,
  getProviderBindingBySlug,
  isProviderSlugBlockedByDeployment,
  resolveCatalogueBinding,
} from "./provider-bindings.ts";

const managed = [
  "BELA_API_KEY",
  "BELA_BEAUTY_SANDBOX_API_KEY",
  "BELA_BEAUTY_SANDBOX_PROVIDER_ACCOUNT_ID",
  "STUDENTPAY_PROVIDER_ACCOUNT_ID",
  "STUDENTPAY_PROVIDER_CODE",
  "STUDENTPAY_API_BASE_URL",
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

describe("Bela production provider binding", () => {
  it("maps bela-beauty-college to BELA and BELA_API_KEY", () => {
    process.env.BELA_API_KEY = "prod-bela-key";
    process.env.BELA_BEAUTY_SANDBOX_API_KEY = "sandbox-bela-key";

    const provider = getProviderBySlug("bela-beauty-college");
    const binding = getProviderBindingBySlug("bela-beauty-college");
    const resolved = resolveCatalogueBinding("BELA");

    assert.equal(provider?.code, "BELA");
    assert.equal(provider?.catalogueEnabled, true);
    assert.equal(binding?.providerCode, "BELA");
    assert.equal(binding?.apiKeyEnv, "BELA_API_KEY");
    assert.equal(resolved?.apiKey, "prod-bela-key");
    assert.equal(resolved?.apiBaseUrl, "https://api.studentpay.com.au");
    assert.equal(resolved?.providerAccountId, "001Mp00000WkleDIAR");
  });

  it("keeps bela-beauty-sandbox on BELA_BEAUTY_SANDBOX", () => {
    process.env.BELA_API_KEY = "prod-bela-key";
    process.env.BELA_BEAUTY_SANDBOX_API_KEY = "sandbox-bela-key";

    const provider = getProviderBySlug("bela-beauty-sandbox");
    const resolved = resolveCatalogueBinding("BELA_BEAUTY_SANDBOX");

    assert.equal(provider?.code, "BELA_BEAUTY_SANDBOX");
    assert.equal(resolved?.apiKey, "sandbox-bela-key");
    assert.equal(resolved?.apiBaseUrl, "https://sandbox-api.studentpay.com.au");
    assert.notEqual(provider?.code, "BELA");
    assert.notEqual(getProviderBySlug("bela-beauty-college")?.code, "BELA_BEAUTY_SANDBOX");
  });

  it("does not let production and sandbox Bela keys cross-bind", () => {
    process.env.BELA_BEAUTY_SANDBOX_API_KEY = "sandbox-bela-key";

    assert.equal(resolveCatalogueBinding("BELA")?.apiKey, "");
    assert.equal(resolveCatalogueBinding("BELA_BEAUTY_SANDBOX")?.apiKey, "sandbox-bela-key");

    delete process.env.BELA_BEAUTY_SANDBOX_API_KEY;
    process.env.BELA_API_KEY = "prod-bela-key";

    assert.equal(resolveCatalogueBinding("BELA")?.apiKey, "prod-bela-key");
    assert.equal(resolveCatalogueBinding("BELA_BEAUTY_SANDBOX")?.apiKey, "");
  });

  it("does not use a sandbox API base for production BELA", () => {
    process.env.STUDENTPAY_API_BASE_URL = "https://sandbox-api.studentpay.com.au";
    process.env.BELA_API_KEY = "prod-bela-key";

    assert.equal(
      resolveCatalogueBinding("BELA")?.apiBaseUrl,
      "https://api.studentpay.com.au",
    );
    assert.equal(
      getProviderCheckoutBinding("BELA")?.apiBaseUrl,
      "https://api.studentpay.com.au",
    );
  });

  it("does not reuse the shared sandbox account id for production BELA", () => {
    process.env.STUDENTPAY_PROVIDER_ACCOUNT_ID = "0018r0000165S4mAAE";
    process.env.BELA_API_KEY = "prod-bela-key";

    assert.equal(
      resolveCatalogueBinding("BELA")?.providerAccountId,
      "001Mp00000WkleDIAR",
    );

    process.env.STUDENTPAY_PROVIDER_CODE = "BELA";
    process.env.STUDENTPAY_PROVIDER_ACCOUNT_ID = "001Mp00000WkleDIAR";
    assert.equal(
      resolveCatalogueBinding("BELA")?.providerAccountId,
      "001Mp00000WkleDIAR",
    );
  });

  it("binds a dedicated BELA deploy to the production slug only", () => {
    process.env.STUDENTPAY_PROVIDER_CODE = "BELA";

    assert.equal(getCatalogueProductionBoundSlug(), "bela-beauty-college");
    assert.equal(isProviderSlugBlockedByDeployment("bela-beauty-college"), false);
    assert.equal(isProviderSlugBlockedByDeployment("bela-beauty-sandbox"), true);
    assert.equal(isProviderSlugBlockedByDeployment("academy-australia"), true);
  });

  it("keeps a dedicated Academy production demo off Bela catalogue routes", () => {
    process.env.STUDENTPAY_PROVIDER_CODE = "ACADEMYAU";

    assert.equal(getCatalogueProductionBoundSlug(), null);
    assert.equal(isProviderSlugBlockedByDeployment("academy-australia"), false);
    assert.equal(isProviderSlugBlockedByDeployment("bela-beauty-college"), true);
    assert.equal(isProviderSlugBlockedByDeployment("bela-beauty-sandbox"), true);
  });
});

describe("catalogue provider isolation", () => {
  it("allows BELA and BELA_BEAUTY_SANDBOX through the hosted catalogue path", () => {
    assert.equal(catalogueDdaBindingAllowsProvider("BELA"), true);
    assert.equal(catalogueDdaBindingAllowsProvider("BELA_BEAUTY_SANDBOX"), true);
    assert.equal(catalogueDdaBindingAllowsProvider("ACADEMYAU"), false);
    assert.equal(catalogueDdaBindingAllowsProvider("ACADEMY_AUSTRALIA"), false);
    assert.equal(catalogueDdaBindingAllowsProvider("ONFIT"), false);
    assert.equal(catalogueDdaBindingAllowsProvider("OCA"), false);
  });

  it("does not put Bela on the Academy configured-course catalogue", () => {
    const academy = getProviderBySlug("academy-australia");
    assert.equal(academy?.catalogueEnabled === true, false);
    assert.equal(getProviderCheckoutBinding("ACADEMY_AUSTRALIA"), null);
    assert.equal(getProviderCheckoutBinding("ACADEMYAU"), null);
    assert.ok(getCoursesByProvider("ACADEMY_AUSTRALIA").length > 0);
    assert.equal(getCoursesByProvider("BELA").length, 0);
    assert.equal(getCoursesByProvider("BELA_BEAUTY_SANDBOX").length, 0);
    assert.ok(
      getCoursesByProvider("ACADEMY_AUSTRALIA").some(
        (course) => course.slug === "criminal-psychology",
      ),
    );
  });

  it("does not resolve BELA as the sandbox provider", () => {
    assert.equal(getProviderByCode("BELA")?.slug, "bela-beauty-college");
    assert.equal(getProviderBindingByCode("BELA")?.slug, "bela-beauty-college");
    assert.equal(
      getCatalogueBindingByCode("BELA")?.providerCode,
      "BELA",
    );
    assert.notEqual(getCatalogueBindingByCode("BELA")?.providerCode, "BELA_BEAUTY_SANDBOX");
  });
});
