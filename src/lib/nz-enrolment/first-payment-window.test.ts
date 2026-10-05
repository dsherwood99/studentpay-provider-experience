import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { addCalendarDays } from "./plan-math.ts";
import { getNzTenantBySlug, toPublicTenant } from "./tenants.ts";
import {
  FIRST_PAYMENT_DATE_RANGE_MESSAGE,
  clampFirstPaymentDate,
  firstPaymentDateWindow,
  hostedFirstPaymentDateError,
  isFirstPaymentDateInWindow,
  resolveHostedFirstPaymentDate,
} from "./first-payment-window.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));
const TODAY = "2026-10-05";

describe("OLI first-payment date window", () => {
  it("enables a 7-day calendar cap for OLI only", () => {
    process.env.STUDENTPAY_ENV = "sandbox";
    const oli = toPublicTenant(getNzTenantBySlug("oli")!);
    assert.equal(oli.checkout.maxFirstPaymentDelayDays, 7);
    const fixture = toPublicTenant(getNzTenantBySlug("fixture-institute")!);
    assert.equal(fixture.checkout.maxFirstPaymentDelayDays, undefined);
    const bela = toPublicTenant(getNzTenantBySlug("bela-nz")!);
    assert.equal(bela.checkout.maxFirstPaymentDelayDays, undefined);
  });

  it("accepts Auckland today + 7 and rejects + 8", () => {
    const window = firstPaymentDateWindow({ today: TODAY, maxDelayDays: 7 });
    assert.equal(window.min, "2026-10-05");
    assert.equal(window.max, "2026-10-12");
    assert.equal(isFirstPaymentDateInWindow("2026-10-05", window), true);
    assert.equal(isFirstPaymentDateInWindow("2026-10-12", window), true);
    assert.equal(isFirstPaymentDateInWindow("2026-10-13", window), false);
    assert.equal(addCalendarDays(TODAY, 7), "2026-10-12");
    assert.equal(addCalendarDays(TODAY, 8), "2026-10-13");
  });

  it("rejects an invalid or out-of-range browser-submitted date on the Hosted BFF helper", () => {
    assert.equal(
      hostedFirstPaymentDateError({
        submittedDate: "2026-10-12",
        maxDelayDays: 7,
        today: TODAY,
      }),
      null,
    );
    assert.equal(
      hostedFirstPaymentDateError({
        submittedDate: "2026-10-13",
        maxDelayDays: 7,
        today: TODAY,
      }),
      FIRST_PAYMENT_DATE_RANGE_MESSAGE,
    );
    assert.equal(
      hostedFirstPaymentDateError({
        submittedDate: "not-a-date",
        maxDelayDays: 7,
        today: TODAY,
      }),
      FIRST_PAYMENT_DATE_RANGE_MESSAGE,
    );
    assert.equal(
      hostedFirstPaymentDateError({
        submittedDate: "2026-10-13",
        maxDelayDays: undefined,
        today: TODAY,
      }),
      null,
    );
  });

  it("does not submit a stale stored draft outside the OLI window", () => {
    const window = firstPaymentDateWindow({ today: TODAY, maxDelayDays: 7 });
    const resolved = resolveHostedFirstPaymentDate({
      selectedDate: "2026-10-12",
      storedDate: "2026-11-01",
      defaultDate: "2026-10-12",
      window,
      checkoutCreated: false,
    });
    assert.equal(resolved, "2026-10-12");
    assert.notEqual(resolved, "2026-11-01");
  });

  it("does not rewrite a locked created checkout date", () => {
    const window = firstPaymentDateWindow({ today: TODAY, maxDelayDays: 7 });
    assert.equal(
      resolveHostedFirstPaymentDate({
        selectedDate: "2026-10-12",
        storedDate: "2026-11-01",
        defaultDate: "2026-10-12",
        window,
        checkoutCreated: true,
      }),
      "2026-11-01",
    );
  });

  it("leaves uncapped tenants on the current date behaviour", () => {
    const window = firstPaymentDateWindow({ today: TODAY });
    assert.deepEqual(window, { min: null, max: null });
    assert.equal(isFirstPaymentDateInWindow("2026-12-01", window), true);
    assert.equal(clampFirstPaymentDate("2026-12-01", window), "2026-12-01");
    assert.equal(
      resolveHostedFirstPaymentDate({
        selectedDate: "2026-10-12",
        storedDate: "2026-12-01",
        defaultDate: "2026-10-12",
        window,
        checkoutCreated: false,
      }),
      "2026-12-01",
    );
  });

  it("wires Hosted UI max and BFF rejection without an OLI slug check", () => {
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    const route = fs.readFileSync(
      path.join(srcRoot, "app/api/enrolment-checkout/route.ts"),
      "utf8",
    );
    assert.match(checkout, /max=\{paymentDateWindow\.max/);
    assert.match(checkout, /min=\{paymentDateWindow\.min/);
    assert.match(checkout, /resolveHostedFirstPaymentDate/);
    assert.match(route, /hostedFirstPaymentDateError/);
    assert.doesNotMatch(checkout, /providerSlug\s*===\s*['"]oli['"]/);
    assert.doesNotMatch(route, /providerSlug\s*===\s*['"]oli['"]/);
  });
});
