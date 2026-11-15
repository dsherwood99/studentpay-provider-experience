import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { getCoursesByProvider } from "../../config/courses.ts";
import {
  ACADEMY_NZ_TEST_CHECKOUT_PATH,
  ACADEMY_NZ_TEST_PAGE_PATH,
  academyNzTestCheckoutHref,
} from "./academy-nz-test.ts";
import { getNzCourse } from "./courses.ts";
import { getNzTenantBySlug } from "./tenants.ts";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("Academy Australia NZ checkout test", () => {
  it("stays off production hosts even when the slug is bound", () => {
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_HOSTED_TENANT_SLUG = "academy-nz-test";
    assert.equal(getNzTenantBySlug("academy-nz-test"), undefined);
    assert.equal(
      getNzCourse("academy-nz-test", "professional-photography-nz-test"),
      undefined,
    );
    delete process.env.NZ_HOSTED_TENANT_SLUG;
    process.env.STUDENTPAY_ENV = "sandbox";
    assert.equal(getNzTenantBySlug("academy-nz-test")?.providerCode, "ACADEMY_NZ_TEST");
    assert.equal(
      getNzCourse("academy-nz-test", "professional-photography-nz-test")?.courseCode,
      "ACADEMY_NZ_PHOTO_TEST",
    );
    assert.equal(getNzTenantBySlug("oli")?.providerCode, "OLI_NZ");
    delete process.env.STUDENTPAY_ENV;
  });

  it("is absent from the public Academy course directory and navigation", () => {
    const titles = getCoursesByProvider("ACADEMY_AUSTRALIA").map((course) => course.slug);
    assert.equal(titles.includes("professional-photography-nz-test"), false);
    assert.equal(titles.includes("professional-photography"), true);
    const home = source("src/components/home/AcademyAustraliaHomePage.tsx");
    const header = source("src/components/layout/AcademyAustraliaHeader.tsx");
    assert.equal(home.includes(ACADEMY_NZ_TEST_PAGE_PATH), false);
    assert.equal(header.includes("professional-photography-nz-test"), false);
  });

  it("keeps the live photography page on the Australian checkout", () => {
    const page = source("src/app/providers/[providerSlug]/courses/[courseSlug]/page.tsx");
    assert.match(page, /PhotographyCoursePage/);
    assert.equal(page.includes("AcademyNzTestEnrolment"), false);
    assert.equal(page.includes("professional-photography-nz-test"), false);
  });

  it("marks the test route noindex and points enrolment at the NZ checkout", () => {
    const page = source(
      "src/app/providers/academy-australia/courses/professional-photography-nz-test/page.tsx",
    );
    assert.match(page, /index:\s*false/);
    assert.match(page, /VERCEL_ENV === "production"/);
    assert.match(page, /AcademyNzTestEnrolment/);
    assert.equal(page.includes("SimpleEnrolmentCheckout"), false);
    delete process.env.NEXT_PUBLIC_ACADEMY_NZ_TEST_CHECKOUT_URL;
    assert.equal(
      academyNzTestCheckoutHref(),
      `${ACADEMY_NZ_TEST_CHECKOUT_PATH}?timings=1`,
    );
    assert.equal(academyNzTestCheckoutHref().includes("studentpay.com.au"), false);
  });
});
