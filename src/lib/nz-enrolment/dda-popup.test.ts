import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DDA_POPUP_HEIGHT,
  DDA_POPUP_NAME,
  DDA_POPUP_WIDTH,
  DDA_RETURN_MESSAGE_TYPE,
  TRUSTED_DDA_RETURN_ORIGINS,
  ddaPopupFeatures,
  ddaPopupPreparingHtml,
  handleManuallyClosedDdaPopup,
  isTrustedDdaReturnOrigin,
  parseTrustedDdaReturnMessage,
  runDdaSetupClick,
  shouldCreateDdaSession,
  shouldRefreshStatusAfterDdaReturn,
  shouldUseDesktopDdaPopup,
} from "./dda-popup.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("Hosted DDA popup setup", () => {
  it("opens a blank popup before the async setup call and then navigates it", async () => {
    const calls: string[] = [];
    let createStarted = false;
    const popup = {
      closed: false,
      locationHref: "",
      assign(url: string) {
        this.locationHref = url;
      },
      focus() {},
      close() {
        this.closed = true;
      },
    };

    const result = await runDdaSetupClick({
      popupOpen: false,
      alreadyCreated: false,
      setupUrl: "",
      setupComplete: false,
      canCreate: true,
      preferDesktopPopup: true,
      screen: { screenX: 0, screenY: 0, outerWidth: 1400, outerHeight: 900 },
      openWindow(url, name, features) {
        calls.push(`open:${url}:${name}`);
        assert.equal(url, "");
        assert.equal(name, DDA_POPUP_NAME);
        assert.match(features, new RegExp(`width=${DDA_POPUP_WIDTH}`));
        assert.match(features, new RegExp(`height=${DDA_POPUP_HEIGHT}`));
        assert.equal(createStarted, false);
        return popup;
      },
      async createOrLoad() {
        createStarted = true;
        assert.equal(calls[0], `open::${DDA_POPUP_NAME}`);
        await Promise.resolve();
        return { setupUrl: "https://pay.gocardless.com/billing/static/flow?id=BRF123" };
      },
    });

    assert.equal(result.openedPopupBeforeCreate, true);
    assert.equal(result.createOrLoadCalled, true);
    assert.equal(
      result.navigatedPopupTo,
      "https://pay.gocardless.com/billing/static/flow?id=BRF123",
    );
    assert.equal(popup.locationHref, "https://pay.gocardless.com/billing/static/flow?id=BRF123");
    assert.equal(result.usedSameTabFallback, false);
  });

  it("reuses an existing setup_url without creating another DDA", async () => {
    let created = 0;
    const result = await runDdaSetupClick({
      popupOpen: false,
      alreadyCreated: true,
      setupUrl: "https://pay.gocardless.com/flow/existing",
      setupComplete: false,
      canCreate: false,
      preferDesktopPopup: true,
      screen: { outerWidth: 1200, outerHeight: 800 },
      openWindow: () => ({
        closed: false,
        locationHref: "",
        assign(url: string) {
          this.locationHref = url;
        },
      }),
      async createOrLoad() {
        created += 1;
        return { setupUrl: "https://example.test/new" };
      },
    });
    assert.equal(created, 0);
    assert.equal(result.createOrLoadCalled, false);
    assert.equal(result.skippedDuplicateCreate, true);
    assert.equal(result.navigatedPopupTo, "https://pay.gocardless.com/flow/existing");
  });

  it("does not create a duplicate DDA when the popup is already open", async () => {
    let opened = 0;
    let created = 0;
    const result = await runDdaSetupClick({
      popupOpen: true,
      alreadyCreated: true,
      setupUrl: "https://pay.gocardless.com/flow/existing",
      setupComplete: false,
      canCreate: true,
      preferDesktopPopup: true,
      screen: {},
      openWindow: () => {
        opened += 1;
        return { closed: false };
      },
      async createOrLoad() {
        created += 1;
        return { setupUrl: "https://example.test/new" };
      },
    });
    assert.equal(opened, 0);
    assert.equal(created, 0);
    assert.equal(result.focusedExistingPopup, true);
    assert.equal(result.skippedDuplicateCreate, true);
  });

  it("closes the blank popup when creation fails", async () => {
    const popup = {
      closed: false,
      close() {
        this.closed = true;
      },
    };
    const result = await runDdaSetupClick({
      popupOpen: false,
      alreadyCreated: false,
      setupUrl: "",
      setupComplete: false,
      canCreate: true,
      preferDesktopPopup: true,
      screen: {},
      openWindow: () => popup,
      async createOrLoad() {
        throw new Error("Unable to create this enrolment.");
      },
    });
    assert.equal(result.closedPopupOnError, true);
    assert.equal(popup.closed, true);
    assert.equal(result.navigatedPopupTo, null);
  });

  it("falls back to same-tab navigation when the popup is blocked", async () => {
    const result = await runDdaSetupClick({
      popupOpen: false,
      alreadyCreated: false,
      setupUrl: "",
      setupComplete: false,
      canCreate: true,
      preferDesktopPopup: true,
      screen: {},
      openWindow: () => null,
      async createOrLoad() {
        return { setupUrl: "https://pay.gocardless.com/flow/tab" };
      },
    });
    assert.equal(result.openedPopupBeforeCreate, true);
    assert.equal(result.usedSameTabFallback, true);
    assert.equal(result.navigatedPopupTo, "https://pay.gocardless.com/flow/tab");
  });

  it("does not force a sized desktop popup on mobile browsers", () => {
    assert.equal(
      shouldUseDesktopDdaPopup({
        innerWidth: 390,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      }),
      false,
    );
    assert.equal(
      shouldUseDesktopDdaPopup({
        innerWidth: 1440,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      }),
      true,
    );
  });

  it("rejects DDA return messages from unexpected origins", () => {
    assert.equal(isTrustedDdaReturnOrigin("https://evil.example"), false);
    assert.equal(
      parseTrustedDdaReturnMessage({
        origin: "https://evil.example",
        data: {
          type: DDA_RETURN_MESSAGE_TYPE,
          result: "success",
          dda_id: "a01",
        },
      }),
      null,
    );
    assert.deepEqual([...TRUSTED_DDA_RETURN_ORIGINS], [
      "https://api.studentpay.co.nz",
      "https://sandbox-api.studentpay.co.nz",
    ]);
  });

  it("accepts a valid return message and requires an authoritative status refresh", () => {
    const parsed = parseTrustedDdaReturnMessage({
      origin: "https://api.studentpay.co.nz",
      data: {
        type: DDA_RETURN_MESSAGE_TYPE,
        result: "success",
        dda_id: "a01DDA",
        checkout_id: "CHK-1",
      },
    });
    assert.deepEqual(parsed, {
      type: DDA_RETURN_MESSAGE_TYPE,
      result: "success",
      dda_id: "a01DDA",
      checkout_id: "CHK-1",
    });
    assert.equal(shouldRefreshStatusAfterDdaReturn(parsed), true);
    assert.equal(
      shouldRefreshStatusAfterDdaReturn(
        parseTrustedDdaReturnMessage({
          origin: "https://enrol.studentpay.co.nz",
          data: parsed,
        }),
      ),
      false,
    );
  });

  it("does not create another DDA when the popup is closed manually", () => {
    assert.deepEqual(handleManuallyClosedDdaPopup({ alreadyCreated: true }), {
      refreshStatusOnce: true,
      createAnotherDda: false,
    });
    assert.equal(shouldCreateDdaSession({
      alreadyCreated: true,
      popupOpen: false,
      setupComplete: false,
    }), false);
  });

  it("centres a 580x760 popup and shows a preparing state", () => {
    const features = ddaPopupFeatures({
      screenX: 100,
      screenY: 40,
      outerWidth: 1600,
      outerHeight: 1000,
    });
    assert.match(features, /width=580/);
    assert.match(features, /height=760/);
    assert.match(features, /left=610/);
    assert.match(ddaPopupPreparingHtml(), /Preparing Direct Debit setup/);
  });

  it("resumes a Hosted enrolment from the allowlisted /enrol/resume route", () => {
    const resume = fs.readFileSync(
      path.join(srcRoot, "app/enrol/resume/page.tsx"),
      "utf8",
    );
    assert.match(resume, /readNzSession/);
    assert.match(resume, /redirect\(`\/enrol\/\$\{tenant\.slug\}\/\$\{course\.slug\}\?dda=return`\)/);
    assert.doesNotMatch(resume, /searchParams/);
    assert.doesNotMatch(resume, /window\.location/);
  });

  it("keeps Payment Plan DDA wiring and does not touch Pay Now", () => {
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    assert.match(checkout, /runDdaSetupClick/);
    assert.match(checkout, /parseTrustedDdaReturnMessage/);
    assert.match(checkout, /\/api\/enrolment-checkout\/status/);
    assert.doesNotMatch(checkout, /href=\{setupUrl\}/);
    assert.match(checkout, /startDirectDebitSetup/);
    assert.match(checkout, /selectPaymentOption/);
    assert.match(checkout, /PayInFullCardForm/);
    assert.match(checkout, /confirmPayInFullElementsPayment/);
    assert.match(checkout, /onClick=\{\(\) => void createCheckout\(\)\}/);
    assert.match(checkout, /onClick=\{\(\) => void startDirectDebitSetup\(\)\}/);
    assert.match(checkout, /openWindow\(url, name, features\)/);
    assert.match(checkout, /if \(isPayInFull \|\| setupComplete\)/);

    const payNowFiles = [
      "lib/nz-enrolment/pay-in-full.ts",
      "lib/nz-enrolment/pay-in-full-flow.ts",
      "lib/nz-enrolment/pay-in-full-stripe.ts",
    ];
    for (const file of payNowFiles) {
      const full = path.join(srcRoot, file);
      if (!fs.existsSync(full)) {
        continue;
      }
      const text = fs.readFileSync(full, "utf8");
      assert.doesNotMatch(text, /dda-popup/);
      assert.doesNotMatch(text, /studentpay:dda-return/);
    }
  });
});
