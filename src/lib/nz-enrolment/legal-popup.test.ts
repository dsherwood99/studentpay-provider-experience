import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  LEGAL_POPUP_HEIGHT,
  LEGAL_POPUP_NAME,
  LEGAL_POPUP_WIDTH,
  hostedLegalDocumentHref,
  legalPopupFeatures,
  openLegalAgreementDocument,
  shouldUseDesktopLegalPopup,
} from "./legal-popup.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("hosted legal agreement popup", () => {
  it("opens a centred named popup on desktop and reuses the window name", () => {
    const calls: string[] = [];
    const popup = { focused: 0, focus() { this.focused += 1; } };
    const first = openLegalAgreementDocument({
      href: hostedLegalDocumentHref("payment-plan"),
      preferDesktopPopup: true,
      screen: { screenX: 100, screenY: 40, outerWidth: 1600, outerHeight: 1000 },
      openWindow(url, name, features) {
        calls.push(`${name}:${url}:${features}`);
        assert.equal(name, LEGAL_POPUP_NAME);
        assert.match(features || "", new RegExp(`width=${LEGAL_POPUP_WIDTH}`));
        assert.match(features || "", new RegExp(`height=${LEGAL_POPUP_HEIGHT}`));
        return popup;
      },
      event: { preventDefault() {}, button: 0 },
    });
    const second = openLegalAgreementDocument({
      href: hostedLegalDocumentHref("direct-debit"),
      preferDesktopPopup: true,
      screen: { screenX: 100, screenY: 40, outerWidth: 1600, outerHeight: 1000 },
      openWindow(url, name) {
        calls.push(`${name}:${url}`);
        return popup;
      },
      event: { preventDefault() {}, button: 0 },
    });
    assert.equal(first, "popup");
    assert.equal(second, "popup");
    assert.equal(popup.focused, 2);
    assert.match(calls[0] || "", /kind=payment-plan/);
    assert.match(calls[0] || "", /view=popup/);
    assert.match(calls[1] || "", /kind=direct-debit/);
    assert.equal(LEGAL_POPUP_NAME, "studentpay-legal-agreement");
    assert.match(legalPopupFeatures({ outerWidth: 1600, outerHeight: 1000 }), /left=/);
  });

  it("falls back to a normal tab when the popup is blocked", () => {
    const calls: string[] = [];
    const result = openLegalAgreementDocument({
      href: hostedLegalDocumentHref("payment-plan"),
      preferDesktopPopup: true,
      screen: { outerWidth: 1400, outerHeight: 900 },
      openWindow(url, name, features) {
        calls.push(`${name}:${url}:${features || ""}`);
        return null;
      },
      event: { preventDefault() {}, button: 0 },
    });
    assert.equal(result, "tab");
    assert.equal(calls[0]?.startsWith(`${LEGAL_POPUP_NAME}:`), true);
    assert.match(calls[1] || "", /^_blank:/);
    assert.doesNotMatch(calls[1] || "", /view=popup/);
  });

  it("uses a new tab on mobile instead of a desktop popup", () => {
    assert.equal(
      shouldUseDesktopLegalPopup({ innerWidth: 1280, userAgent: "Mozilla/5.0" }),
      true,
    );
    assert.equal(
      shouldUseDesktopLegalPopup({
        innerWidth: 390,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      }),
      false,
    );
    const calls: string[] = [];
    const result = openLegalAgreementDocument({
      href: hostedLegalDocumentHref("direct-debit"),
      preferDesktopPopup: false,
      screen: { outerWidth: 390, outerHeight: 844 },
      openWindow(url, name) {
        calls.push(`${name}:${url}`);
        return { focus() {} };
      },
      event: { preventDefault() {}, button: 0 },
    });
    assert.equal(result, "tab");
    assert.equal(calls[0]?.startsWith("_blank:"), true);
    assert.doesNotMatch(calls[0] || "", /view=popup/);
  });

  it("wires EnrolmentCheckout legal links to the popup helper without changing DDA or Pay Now", () => {
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    assert.match(checkout, /openLegalAgreementDocument/);
    assert.match(checkout, /hostedLegalDocumentHref\("payment-plan"\)|hostedLegalDocumentHref\(kind\)/);
    assert.match(checkout, /runDdaSetupClick/);
    assert.match(checkout, /onClick=\{\(\) => void startDirectDebitSetup\(\)\}/);
    assert.match(checkout, /PayInFullCardForm/);
    assert.doesNotMatch(checkout, /studentpay:dda-return/);
    assert.doesNotMatch(checkout, /LEGAL_POPUP_NAME/);

    const dda = fs.readFileSync(path.join(srcRoot, "lib/nz-enrolment/dda-popup.ts"), "utf8");
    assert.match(dda, /studentpay:dda-return/);
    assert.doesNotMatch(dda, /legal-popup/);
    assert.doesNotMatch(dda, /studentpay-legal-agreement/);

    for (const file of [
      "lib/nz-enrolment/pay-in-full.ts",
      "lib/nz-enrolment/pay-in-full-flow.ts",
      "lib/nz-enrolment/pay-in-full-stripe.ts",
    ]) {
      const text = fs.readFileSync(path.join(srcRoot, file), "utf8");
      assert.doesNotMatch(text, /legal-popup/);
      assert.doesNotMatch(text, /legal-branding/);
    }
  });
});
