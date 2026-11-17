import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildCanonicalCreatePayload, canonicalConfirm } from "./canonical.ts";
import { getNzCourse } from "./courses.ts";
import { getNzTenantBySlug } from "./tenants.ts";
import {
  approvedCheckoutSourceUrl,
  normaliseServicingMobile,
  sanitiseStudent,
  validateStudentDetails,
} from "./validation.ts";

const student = {
  firstName: "Aroha",
  lastName: "Ngata",
  email: "aroha@example.test",
  mobile: "021 555 0199",
  dateOfBirth: "2001-04-12",
  streetAddress: "1 Queen Street",
  suburb: "Auckland",
  city: "Auckland",
  postcode: "1010",
  region: "Auckland",
  country: "New Zealand",
};

test("hosted create payload records the website channel and an approved checkout URL", () => {
  const payload = buildCanonicalCreatePayload({
    tenant: getNzTenantBySlug("oli")!,
    course: getNzCourse("oli", "certificate-in-digital-marketing")!,
    student,
    plan: {
      paymentOption: "interest_free_payment_plan",
      upfrontAmountCents: 0,
      frequency: "Weekly",
      firstPaymentDate: "2026-11-23",
    },
    providerOrderId: "HOSTED-OLI_NZ-11111111-2222-4333-8444-555555555555",
    successUrl:
      "https://enrol.onlinelearninginstitute.co.nz/enrol/oli/certificate-in-digital-marketing?dda=return",
    cancelUrl:
      "https://enrol.onlinelearninginstitute.co.nz/enrol/oli/certificate-in-digital-marketing?dda=cancelled",
  });

  assert.equal(payload.provider.enrolment_channel, "website");
  assert.equal(payload.provider.source, "Website");
  assert.equal("sales_agent_name" in payload.provider, false);
  assert.equal("sales_agent_email" in payload.provider, false);
  assert.equal(
    payload.checkout?.source_url,
    "https://enrol.onlinelearninginstitute.co.nz/enrol/oli/certificate-in-digital-marketing",
  );
  assert.equal(
    JSON.stringify(payload).includes("tom@onlinelearninginstitute.com.au"),
    false,
  );
});

test("an unapproved checkout host is not sent as the source URL", () => {
  const previousEnv = process.env.STUDENTPAY_ENV;
  process.env.STUDENTPAY_ENV = "sandbox";
  try {
    const course = getNzCourse("bela-nz", "lash-business-bundle");
    assert.ok(course);
    const payload = buildCanonicalCreatePayload({
      tenant: getNzTenantBySlug("bela-nz")!,
      course,
      student,
      plan: {
        paymentOption: "interest_free_payment_plan",
        upfrontAmountCents: 0,
        frequency: "Weekly",
        firstPaymentDate: "2026-11-23",
      },
      providerOrderId: "HOSTED-BELA_NZ-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      successUrl: "https://preview.example/enrol/bela-nz/course?dda=return",
      cancelUrl: "https://preview.example/enrol/bela-nz/course?dda=cancelled",
    });
    assert.equal(payload.provider.provider_code, "BELA_NZ");
    assert.equal(payload.provider.enrolment_channel, "website");
    assert.equal(payload.checkout, undefined);
    assert.equal(
      JSON.stringify(payload).includes("tom@onlinelearninginstitute.com.au"),
      false,
    );
  } finally {
    if (previousEnv === undefined) delete process.env.STUDENTPAY_ENV;
    else process.env.STUDENTPAY_ENV = previousEnv;
  }
  assert.equal(
    approvedCheckoutSourceUrl("https://enrol.studentpay.co.nz/enrol/bela-nz/lash"),
    "https://enrol.studentpay.co.nz/enrol/bela-nz/lash",
  );
});

test("browser mobile validation accepts NZ and international numbers", () => {
  assert.equal(validateStudentDetails(student).mobile, undefined);
  assert.equal(normaliseServicingMobile("+61 412 345 678").e164, "+61412345678");
  const international = validateStudentDetails({ ...student, mobile: "+61 412 345 678" });
  assert.equal(international.mobile, undefined);
  assert.equal(sanitiseStudent({ ...student, mobile: "+61 412 345 678" }).mobile, "+61412345678");
  const invalid = validateStudentDetails({ ...student, mobile: "203423423" });
  assert.match(invalid.mobile || "", /valid mobile/i);
  const belaBlank = validateStudentDetails(
    { ...student, mobile: "" },
    { requireMobile: false },
  );
  assert.equal(belaBlank.mobile, undefined);
  assert.equal(belaBlank.firstName, undefined);
  const belaIncomplete = validateStudentDetails(
    { ...student, mobile: "203423423" },
    { requireMobile: false },
  );
  assert.equal(belaIncomplete.mobile, undefined);
  assert.equal(
    sanitiseStudent({ ...student, mobile: "203423423" }).mobile,
    "203423423",
  );
});

test("confirm forwards the browser user agent instead of the server runtime", async () => {
  const calls: Array<{ headers?: Record<string, string> }> = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    calls.push({ headers: init?.headers as Record<string, string> });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }) as typeof fetch;
  try {
    await canonicalConfirm({
      apiBaseUrl: "https://api.example.test",
      apiKey: "test-key",
      checkoutId: "HOSTED-OLI_NZ-1",
      userAgent: "Mozilla/5.0 (checkout)",
      payload: {
        payment_option: "pay_in_full",
        provider: { provider_code: "OLI_NZ", provider_order_id: "HOSTED-OLI_NZ-1" },
        checkout: { checkout_id: "HOSTED-OLI_NZ-1" },
        declarations: {
          information_confirmed: true,
          privacy_consent_accepted: true,
        },
      },
    });
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(calls[0]?.headers?.["x-original-user-agent"], "Mozilla/5.0 (checkout)");
  const confirmRoute = readFileSync(
    path.join(process.cwd(), "src/app/api/enrolment-checkout/confirm/route.ts"),
    "utf8",
  );
  assert.match(confirmRoute, /userAgent: request\.headers\.get\("user-agent"\)/);
});
