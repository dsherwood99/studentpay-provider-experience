import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  HOSTED_LEGAL_CHROME_TEST_ID,
  HOSTED_LEGAL_CLOSE_TEST_ID,
  applyHostedLegalDocumentPresentation,
  hostedLegalViewIsPopup,
} from "./legal-branding.ts";
import { getNzTenantBySlug } from "./tenants.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));

const PURPLE_PPA = `<!DOCTYPE html>
<html lang="en-NZ"><head><title>Student Payment Plan Agreement | StudentPay NZ</title>
<style>:root{--doc-primary:#54215e;--doc-background:#f7f2fa;}</style></head>
<body><main class="document-shell"><h1>Student Payment Plan Agreement</h1>
<p>Version 1.0</p><p>PPA-000004</p></main></body></html>`;

const GREEN_DDSA = `<!DOCTYPE html>
<html lang="en-NZ"><head><title>Direct Debit Service Agreement | StudentPay NZ</title>
<style>:root{--brand-primary:#164c3f;--page-background:#f4f7f6;}</style></head>
<body><main class="page-shell"><h1>Direct Debit Service Agreement</h1>
<p>Version 1.0</p></main></body></html>`;

describe("hosted legal document branding", () => {
  it("applies OLI Hosted tenant branding to payment-plan and direct-debit HTML", () => {
    const oli = getNzTenantBySlug("oli")!;
    const ppa = applyHostedLegalDocumentPresentation({
      html: PURPLE_PPA,
      tenant: oli,
    });
    const ddsa = applyHostedLegalDocumentPresentation({
      html: GREEN_DDSA,
      tenant: oli,
    });
    for (const html of [ppa, ddsa]) {
      assert.match(html, /--doc-primary:\s*#3a8f8f/i);
      assert.match(html, /--brand-primary:\s*#3a8f8f/i);
      assert.match(html, /Online Learning Institute/);
      assert.match(html, /\/nz-enrolment\/oli\/logo\.png/);
      assert.match(html, new RegExp(HOSTED_LEGAL_CHROME_TEST_ID));
      assert.doesNotMatch(html, /primary=#ff0000/);
    }
    assert.match(ppa, /Student Payment Plan Agreement/);
    assert.match(ppa, /PPA-000004/);
    assert.match(ddsa, /Direct Debit Service Agreement/);
    assert.equal(ppa.includes("Version 1.0"), true);
    assert.equal(ddsa.includes("Version 1.0"), true);
  });

  it("leaves generic HTML unchanged without provider context", () => {
    const html = applyHostedLegalDocumentPresentation({
      html: PURPLE_PPA,
      tenant: null,
    });
    assert.equal(html, PURPLE_PPA);
    assert.match(html, /#54215e/);
    assert.doesNotMatch(html, /#3a8f8f/);
  });

  it("ignores arbitrary query-string colours because branding comes from the tenant", () => {
    const oli = getNzTenantBySlug("oli")!;
    const html = applyHostedLegalDocumentPresentation({
      html: `${PURPLE_PPA}<!-- primary=#ff00aa colour=#00ff00 -->`,
      tenant: oli,
    });
    assert.match(html, /--doc-primary:\s*#3a8f8f/i);
    assert.doesNotMatch(html, /--doc-primary:\s*#ff00aa/i);
    assert.equal(hostedLegalViewIsPopup("popup"), true);
    assert.equal(hostedLegalViewIsPopup("#3a8f8f"), false);
    assert.equal(hostedLegalViewIsPopup("primary"), false);
  });

  it("adds a print-hidden close control only for popup view", () => {
    const oli = getNzTenantBySlug("oli")!;
    const popup = applyHostedLegalDocumentPresentation({
      html: GREEN_DDSA,
      tenant: oli,
      popup: true,
    });
    const tab = applyHostedLegalDocumentPresentation({
      html: GREEN_DDSA,
      tenant: oli,
      popup: false,
    });
    assert.match(popup, new RegExp(HOSTED_LEGAL_CLOSE_TEST_ID));
    assert.match(popup, /Close and return to enrolment/);
    assert.match(popup, /window\.close\(\)/);
    assert.match(popup, /@media print/);
    assert.doesNotMatch(tab, new RegExp(HOSTED_LEGAL_CLOSE_TEST_ID));
    assert.match(popup, /Direct Debit Service Agreement/);
  });

  it("keeps the legal proxy session-backed and does not read colour query params", () => {
    const route = fs.readFileSync(
      path.join(srcRoot, "app/api/enrolment-checkout/legal/route.ts"),
      "utf8",
    );
    assert.match(route, /readNzSession/);
    assert.match(route, /applyHostedLegalDocumentPresentation/);
    assert.match(route, /resolved\.tenant/);
    assert.match(route, /hostedLegalViewIsPopup/);
    assert.doesNotMatch(route, /searchParams\.get\(["'](primary|colour|color|accent)["']\)/);
    assert.doesNotMatch(route, /#3a8f8f/);
  });
});
