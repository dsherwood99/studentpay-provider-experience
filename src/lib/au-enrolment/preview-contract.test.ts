import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

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
    assert.doesNotMatch(preview, /001Mp00000WkleDIAR/);
    assert.doesNotMatch(preview, /BELA_API_KEY/);
    assert.doesNotMatch(coursePage, /EnrolmentWizard|SimpleEnrolmentCheckout|CatalogueEnrolmentForm/);
    assert.match(checkoutRoute, /isAuPaymentPlanCheckoutBlocked/);
    assert.doesNotMatch(read("config/courses.ts"), /BRIDAL_FREELANCER_BUNDLE/);
    assert.doesNotMatch(read("config/courses.ts"), /bridal-freelancer-bundle/);
  });
});
