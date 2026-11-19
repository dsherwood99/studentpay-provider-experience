import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  ACADEMYAU_AGREEMENT_HASH,
  ACADEMYAU_AGREEMENT_HTML,
} from "./agreement.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));

function read(relativePath: string): string {
  return fs.readFileSync(path.join(srcRoot, relativePath), "utf8");
}

describe("Australian enrolment preview contract", () => {
  it("does not submit the demonstration enrolment", () => {
    const preview = read(
      "components/au-enrolment/AuPaymentPlanEnrolPreview.tsx",
    );
    const coursePage = read(
      "components/au-enrolment/AuPaymentPlanCoursePage.tsx",
    );
    const checkoutRoute = read("app/api/studentpay/provider-checkouts/route.ts");

    assert.match(preview, /disabled/);
    assert.doesNotMatch(preview, /<form[\s>]/);
    assert.doesNotMatch(preview, /fetch\s*\(/);
    assert.doesNotMatch(preview, /\/api\/studentpay/);
    const checkout = read("components/au-enrolment/AuEnrolmentCheckout.tsx");
    const liveRoute = read("app/api/studentpay/au-enrolments/route.ts");
    assert.match(checkout, /fetch\("\/api\/studentpay\/au-enrolments"/);
    assert.match(checkout, /coursePath/);
    assert.doesNotMatch(checkout, /providerSlug|student:\s*fields/);
    assert.match(checkout, /ACADEMYAU_AGREEMENT_HTML/);
    assert.match(liveRoute, /academyEnrolmentProxyAllowed/);
    assert.match(liveRoute, /prepareAcademyForwardBody/);
    assert.doesNotMatch(liveRoute, /AU_ENROLMENT_API_KEY\s*=/);
    assert.match(liveRoute, /readAcademyUpstream/);
    assert.equal(
      createHash("sha256").update(ACADEMYAU_AGREEMENT_HTML).digest("hex"),
      ACADEMYAU_AGREEMENT_HASH,
    );
    assert.equal(
      ACADEMYAU_AGREEMENT_HASH,
      "2fa546b9bd9580b2373f2756e9e863f228bb087ccd7e73d1c78791a278a31175",
    );
    assert.doesNotMatch(checkout, /name="bsb"|name="accountNumber"|name="BSB"/);
    const bank = read("components/au-enrolment/BankSourceCapture.tsx");
    assert.doesNotMatch(bank, /name="bsb"|name="accountNumber"/);
    assert.doesNotMatch(preview, /001Mp00000WkleDIAR/);
    assert.doesNotMatch(preview, /BELA_API_KEY/);
    assert.doesNotMatch(coursePage, /EnrolmentWizard|SimpleEnrolmentCheckout|CatalogueEnrolmentForm/);
    assert.match(checkoutRoute, /isAuPaymentPlanCheckoutBlocked/);
    assert.doesNotMatch(read("config/courses.ts"), /BRIDAL_FREELANCER_BUNDLE/);
    assert.doesNotMatch(read("config/courses.ts"), /bridal-freelancer-bundle/);
  });
});
