import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACADEMYAU_AGREEMENT_HASH,
  ACADEMYAU_AGREEMENT_VERSION,
} from "./agreement.ts";
import {
  academyEnrolmentProxyAllowed,
  exchangeAcademyResume,
  forwardAcademyEnrolment,
  prepareAcademyForwardBody,
} from "./forward.ts";

const student = {
  coursePath: "/academy-australia/bridal-freelancer-bundle",
  firstName: "Sarah",
  lastName: "Nguyen",
  dateOfBirth: "2000-01-02",
  email: "sarah@example.com",
  mobile: "0400000000",
  addressLine1: "1 Test Street",
  suburb: "Melbourne",
  state: "VIC",
  postcode: "3000",
  firstPaymentDate: "2026-12-01",
  abilityToRepay: "Yes",
};

describe("Academy enrolment forwarding", () => {
  it("accepts only the Academy host and the Academy course", () => {
    assert.equal(academyEnrolmentProxyAllowed("www.academyaustralia.com", "generic"), true);
    assert.equal(academyEnrolmentProxyAllowed("bela.studentpay.com.au", "bela"), false);
    assert.equal(academyEnrolmentProxyAllowed("enrol.onlinelearninginstitute.co.nz", "generic"), false);
    assert.equal(academyEnrolmentProxyAllowed("nz.example.com", "nz_enrolment"), false);
    const prepared = prepareAcademyForwardBody({
      ...student,
      providerAgreementVersion: "ACADEMYAU-DEMO-2026-08-22-v3",
      providerAgreementHash: "0".repeat(64),
      providerSlug: "bela-beauty-college",
      bsb: "000000",
    });
    assert.equal(prepared.ok, false);
  });

  it("forces the approved agreement and drops client identity fields", () => {
    const prepared = prepareAcademyForwardBody({
      ...student,
      providerAgreementVersion: "ACADEMYAU-DEMO-2026-08-22-v3",
      providerSlug: "bela-beauty-college",
    });
    assert.equal(prepared.ok, true);
    if (!prepared.ok) return;
    assert.equal(prepared.body.providerAgreementVersion, ACADEMYAU_AGREEMENT_VERSION);
    assert.equal(prepared.body.providerAgreementHash, ACADEMYAU_AGREEMENT_HASH);
    assert.equal("providerSlug" in prepared.body, false);
    assert.equal("bsb" in prepared.body, false);
  });

  it("does not call the API when the enrolment key is absent", async () => {
    let called = false;
    const result = await forwardAcademyEnrolment({
      body: student,
      idempotencyKey: "academyau-test-key",
      clientIp: "203.0.113.10",
      userAgent: "test",
      allowLiveCapture: false,
      env: {},
      fetchImpl: async () => {
        called = true;
        throw new Error("must not call");
      },
    });
    assert.equal(called, false);
    assert.equal(result.status, 409);
    assert.equal(result.body.activated, false);
  });

  it("forwards a valid application and keeps the recovery token out of the body", async () => {
    const calls: Array<{ url: string; authorization: string }> = [];
    const result = await forwardAcademyEnrolment({
      body: {
        ...student,
        providerAgreementVersion: ACADEMYAU_AGREEMENT_VERSION,
        providerAgreementHash: ACADEMYAU_AGREEMENT_HASH,
      },
      idempotencyKey: "academyau-test-key",
      clientIp: "203.0.113.10",
      userAgent: "test",
      allowLiveCapture: false,
      env: { AU_ENROLMENT_API_KEY: "server-only-test-key" },
      fetchImpl: async (url, init) => {
        const headers = new Headers(init?.headers);
        calls.push({ url: String(url), authorization: headers.get("authorization") || "" });
        return new Response(JSON.stringify({
          activated: false,
          enrolment_id: "enrol_0123456789abcdef0123",
          message: "Review the agreement.",
          recovery_token: "secret-recovery",
          provider_code: "ACADEMYAU",
          course_path: "/academy-australia/bridal-freelancer-bundle",
          agreement: { status: "shown", document_hash: "a".repeat(64), html: "<p>Plan</p>" },
        }), { status: 409, headers: { "content-type": "application/json" } });
      },
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "https://api.studentpay.com.au/api/au/enrolments");
    assert.equal(calls[0]?.authorization, "Bearer server-only-test-key");
    assert.equal(result.body.enrolmentId, "enrol_0123456789abcdef0123");
    assert.equal("recovery_token" in result.body, false);
    assert.equal(result.recoveryToken, "secret-recovery");
  });

  it("refuses a resumed application for another course", async () => {
    const result = await exchangeAcademyResume({
      credential: "enrol_0123456789abcdef0123.token-token-token",
      dateOfBirth: "2000-01-02",
      env: { AU_ENROLMENT_API_KEY: "server-only-test-key" },
      fetchImpl: async () => new Response(JSON.stringify({
        ok: true,
        enrolment_id: "enrol_0123456789abcdef0123",
        course_path: "/belabeautycollege/bridal-freelancer-bundle",
      }), { status: 200 }),
    });
    assert.equal(result.status, 404);
    assert.equal(result.enrolmentId, "");
  });
});
