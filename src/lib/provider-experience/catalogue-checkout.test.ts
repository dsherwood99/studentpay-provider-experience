import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BRIDAL_AUTHORITATIVE_SNAPSHOT,
  CLASSIC_AUTHORITATIVE_SNAPSHOT,
  TAMPERED_COMMERCIAL,
  buildCatalogueCheckoutPayload,
  getProviderCheckoutBinding,
} from "./catalogue-checkout.ts";

const belaProductionProvider = {
  code: "BELA",
  slug: "bela-beauty-college",
  name: "Bela Beauty College",
  shortName: "Bela Beauty",
  description: "Production",
  logoPath: "",
  supportEmail: "support@belabeautycollege.com",
  catalogueEnabled: true,
  theme: {
    primaryColour: "#C45C7A",
    secondaryColour: "#111111",
    accentColour: "#C45C7A",
    backgroundColour: "#FFF7FA",
    surfaceColour: "#FFFFFF",
    textColour: "#1A1A1A",
    mutedTextColour: "#5C5458",
  },
};

const belaProvider = {
  code: "BELA_BEAUTY_SANDBOX",
  slug: "bela-beauty-sandbox",
  name: "Bela Beauty College",
  shortName: "Bela Beauty",
  description: "Sandbox",
  logoPath: "",
  supportEmail: "support@belabeautycollege.com",
  catalogueEnabled: true,
  theme: {
    primaryColour: "#C45C7A",
    secondaryColour: "#111111",
    accentColour: "#C45C7A",
    backgroundColour: "#FFF7FA",
    surfaceColour: "#FFFFFF",
    textColour: "#1A1A1A",
    mutedTextColour: "#5C5458",
  },
};

const student = {
  firstName: "Phase3D1",
  lastName: "BRIDAL",
  email: "phase3d1.bridal@studentpay.test",
  mobile: "0400000011",
  dateOfBirth: "1998-06-15",
  addressLine1: "11 Sandbox Lane",
  suburb: "Melbourne",
  state: "VIC",
  postcode: "3000",
};

describe("catalogue checkout payload", () => {
  it("identifies Bridal by course_code and does not send catalogue prices as authority", () => {
    const payload = buildCatalogueCheckoutPayload({
      provider: belaProvider,
      course: {
        code: BRIDAL_AUTHORITATIVE_SNAPSHOT.course_code,
        title: "Bridal Freelancer Bundle",
      },
      student,
      providerOrderId: "BELA-P3D1-BRIDAL",
      binding: {
        apiKey: "test",
        providerCode: "BELA_BEAUTY_SANDBOX",
        providerAccountId: "0018r000017BAHFAA4",
        apiBaseUrl: "https://sandbox-api.studentpay.com.au",
      },
    });

    assert.equal(payload.provider.provider_code, "BELA_BEAUTY_SANDBOX");
    assert.equal(payload.course.course_code, "BRIDAL_FREELANCER_BUNDLE");
    assert.equal(payload.pricing.course_price, TAMPERED_COMMERCIAL.course_price);
    assert.equal(JSON.stringify(payload).includes("apiKey"), false);
    assert.equal(JSON.stringify(payload).includes("BELA_API_KEY"), false);
    assert.equal(JSON.stringify(payload).includes("prod-bela-key"), false);
    assert.equal(payload.pricing.upfront_payment, TAMPERED_COMMERCIAL.upfront_payment);
    assert.equal(payload.plan.number_of_instalments, TAMPERED_COMMERCIAL.number_of_instalments);
    assert.notEqual(payload.pricing.course_price, BRIDAL_AUTHORITATIVE_SNAPSHOT.course_price);
    assert.equal(BRIDAL_AUTHORITATIVE_SNAPSHOT.course_price, 3500);
    assert.equal(BRIDAL_AUTHORITATIVE_SNAPSHOT.upfront, 4);
    assert.equal(BRIDAL_AUTHORITATIVE_SNAPSHOT.recurring, 23);
    assert.equal(BRIDAL_AUTHORITATIVE_SNAPSHOT.count, 152);
  });

  it("identifies Classic by course_code with dummy browser commercial values", () => {
    const payload = buildCatalogueCheckoutPayload({
      provider: belaProvider,
      course: {
        code: CLASSIC_AUTHORITATIVE_SNAPSHOT.course_code,
        title: "Classic Lash",
      },
      student: { ...student, lastName: "CLASSIC" },
      providerOrderId: "BELA-P3D1-CLASSIC",
      binding: {
        apiKey: "test",
        providerCode: "BELA_BEAUTY_SANDBOX",
        providerAccountId: "0018r000017BAHFAA4",
        apiBaseUrl: "https://sandbox-api.studentpay.com.au",
      },
    });

    assert.equal(payload.course.course_code, "CLASSIC_LASH");
    assert.equal(payload.pricing.course_price, 1);
    assert.equal(CLASSIC_AUTHORITATIVE_SNAPSHOT.course_price, 1800);
    assert.equal(CLASSIC_AUTHORITATIVE_SNAPSHOT.upfront, 0);
    assert.equal(CLASSIC_AUTHORITATIVE_SNAPSHOT.recurring, 24);
    assert.equal(CLASSIC_AUTHORITATIVE_SNAPSHOT.count, 75);
  });

  it("accepts production BELA on the hosted catalogue checkout path", () => {
    const payload = buildCatalogueCheckoutPayload({
      provider: belaProductionProvider,
      course: {
        code: BRIDAL_AUTHORITATIVE_SNAPSHOT.course_code,
        title: "Bridal Freelancer Bundle",
      },
      student,
      providerOrderId: "BELA-PROD-BRIDAL",
      binding: {
        apiKey: "prod-bela-key",
        providerCode: "BELA",
        providerAccountId: "001Mp00000WkleDIAR",
        apiBaseUrl: "https://api.studentpay.com.au",
      },
    });

    assert.equal(payload.provider.provider_code, "BELA");
    assert.equal(payload.course.course_code, "BRIDAL_FREELANCER_BUNDLE");
    assert.equal(JSON.stringify(payload).includes("apiKey"), false);
    assert.equal(JSON.stringify(payload).includes("prod-bela-key"), false);
    assert.equal(JSON.stringify(payload).includes("BELA_API_KEY"), false);
    assert.notEqual(payload.provider.provider_code, "BELA_BEAUTY_SANDBOX");
    assert.notEqual(payload.provider.provider_code, "ACADEMYAU");
  });

  it("does not bind another provider to Bela checkout credentials", () => {
    assert.equal(getProviderCheckoutBinding("ACADEMY_AUSTRALIA"), null);
    assert.equal(getProviderCheckoutBinding("ONFIT"), null);
    assert.equal(getProviderCheckoutBinding("OCA"), null);
    assert.equal(
      getProviderCheckoutBinding("BELA_BEAUTY_SANDBOX")?.providerCode,
      "BELA_BEAUTY_SANDBOX",
    );
    assert.equal(getProviderCheckoutBinding("BELA")?.providerCode, "BELA");
  });

  it("keeps Academy on the non-catalogue checkout path", () => {
    assert.equal(getProviderCheckoutBinding("ACADEMY_AUSTRALIA"), null);
    assert.notEqual("ACADEMY_AUSTRALIA", "BELA_BEAUTY_SANDBOX");
  });
});
