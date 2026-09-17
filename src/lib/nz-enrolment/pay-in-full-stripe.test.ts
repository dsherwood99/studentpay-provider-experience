import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { confirmPayInFullElementsPayment } from "./pay-in-full-stripe.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));
const checkoutSource = fs.readFileSync(
  path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
  "utf8",
);

type Call = { name: "submit" | "confirmPayment"; at: number };

function createApi(options: {
  submitError?: { message: string } | null;
  confirmError?: { message: string } | null;
  confirmStatus?: string;
}) {
  const calls: Call[] = [];
  let seq = 0;
  const elements = {
    submit: async () => {
      calls.push({ name: "submit", at: ++seq });
      return options.submitError ? { error: options.submitError } : { error: undefined };
    },
  };
  const stripe = {
    confirmPayment: async () => {
      calls.push({ name: "confirmPayment", at: ++seq });
      if (options.confirmError) {
        return { error: options.confirmError };
      }
      return {
        paymentIntent: { status: options.confirmStatus || "succeeded" },
      };
    },
  };
  return { stripe, elements, calls };
}

describe("Pay in Full Stripe Payment Element sequence", () => {
  it("calls elements.submit before stripe.confirmPayment", async () => {
    const api = createApi({ confirmStatus: "succeeded" });
    const result = await confirmPayInFullElementsPayment({
      stripe: api.stripe as never,
      elements: api.elements as never,
      clientSecret: "pi_test_secret",
      returnUrl: "https://example.test/enrol/canary",
    });
    assert.deepEqual(
      api.calls.map((call) => call.name),
      ["submit", "confirmPayment"],
    );
    assert.equal(api.calls[0].at < api.calls[1].at, true);
    assert.equal(result.confirmCalled, true);
    assert.equal(result.error, undefined);
    assert.equal(result.paymentIntent?.status, "succeeded");
  });

  it("does not call confirmPayment when elements.submit fails", async () => {
    const api = createApi({
      submitError: { message: "Enter a complete card number." },
    });
    const result = await confirmPayInFullElementsPayment({
      stripe: api.stripe as never,
      elements: api.elements as never,
      clientSecret: "pi_test_secret",
      returnUrl: "https://example.test/enrol/canary",
    });
    assert.deepEqual(
      api.calls.map((call) => call.name),
      ["submit"],
    );
    assert.equal(result.confirmCalled, false);
    assert.equal(result.error?.message, "Enter a complete card number.");
  });

  it("calls confirmPayment exactly once after a successful submit", async () => {
    const api = createApi({ confirmStatus: "succeeded" });
    await confirmPayInFullElementsPayment({
      stripe: api.stripe as never,
      elements: api.elements as never,
      clientSecret: "pi_test_secret",
      returnUrl: "https://example.test/enrol/canary",
    });
    assert.equal(api.calls.filter((call) => call.name === "submit").length, 1);
    assert.equal(api.calls.filter((call) => call.name === "confirmPayment").length, 1);
  });

  it("wires EnrolmentCheckout to submit-then-confirm and does not confirm first", () => {
    assert.match(checkoutSource, /confirmPayInFullElementsPayment/);
    assert.match(checkoutSource, /from "@\/lib\/nz-enrolment\/pay-in-full-stripe"/);
    const payFn = checkoutSource.match(
      /async function payInFullNow\(\) \{[\s\S]*?\n  async function confirmCheckout/,
    );
    assert.ok(payFn);
    assert.match(payFn[0], /confirmPayInFullElementsPayment\(/);
    assert.doesNotMatch(payFn[0], /api\.stripe\.confirmPayment\(/);
    assert.match(payFn[0], /payingRef\.current = true/);
    const submitGuard = payFn[0].indexOf("payingRef.current = true");
    const confirmHelper = payFn[0].indexOf("confirmPayInFullElementsPayment");
    assert.equal(submitGuard >= 0 && confirmHelper > submitGuard, true);
  });
});
