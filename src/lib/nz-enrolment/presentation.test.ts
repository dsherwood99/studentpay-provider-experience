import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { NZ_ENROLMENT_STEPS, NZ_STUDENT_DETAILS_COPY } from "./checkout-ui.ts";
import { buildCourseLinkMapping } from "./course-links.ts";
import { getNzCourse, getNzCoursesForProvider } from "./courses.ts";
import {
  currentCourseDeepLink,
  futureCourseDeepLink,
  providerCourseWebsiteUrl,
  safeProviderUrl,
  safeReturnToProviderUrl,
} from "./presentation.ts";
import { getDefaultProductionNzTenantSlug, getNzTenantBySlug, toPublicTenant } from "./tenants.ts";

const managed = ["STUDENTPAY_ENV", "HOSTED_PRODUCT_MODE"];
const previous: Record<string, string | undefined> = {};

function snapshotEnv() {
  for (const name of managed) {
    previous[name] = process.env[name];
    delete process.env[name];
  }
  process.env.STUDENTPAY_ENV = "production";
  process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
}

function restoreEnv() {
  for (const name of managed) {
    if (previous[name] === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous[name];
    }
  }
}

beforeEach(snapshotEnv);
afterEach(restoreEnv);

describe("generic provider branding and presentation", () => {
  it("exposes OLI branding tokens and provider-native chrome from config", () => {
    const oli = getNzTenantBySlug("oli")!;
    const pub = toPublicTenant(oli);
    assert.equal(pub.presentation.chrome, "provider-native");
    assert.equal(
      pub.presentation.attributionLabel,
      "Payment plan powered by StudentPay NZ",
    );
    assert.equal(pub.branding.primaryColour, "#3a8f8f");
    assert.equal(pub.branding.backgroundColour, "#f9f7f3");
    assert.equal(pub.websiteUrl, "https://onlinelearninginstitute.co.nz/");
    assert.equal(pub.supportEmail, "info@onlinelearninginstitute.co.nz");
    assert.equal("apiKeyEnv" in pub, false);
    assert.equal("providerCode" in pub, false);
  });

  it("keeps fixture-institute presentation generic and sandbox-only", () => {
    process.env.STUDENTPAY_ENV = "sandbox";
    const fixture = getNzTenantBySlug("fixture-institute")!;
    assert.equal(fixture.presentation.chrome, "provider-native");
    assert.notEqual(fixture.branding.primaryColour, "#3a8f8f");
  });
});

describe("course-specific deep links", () => {
  it("resolves a valid OLI course slug without asking the student to choose again", () => {
    const course = getNzCourse("oli", "certificate-in-animal-grooming");
    assert.ok(course);
    assert.equal(course?.courseCode, "ANI101");
    assert.equal(course?.name, "Certificate in Animal Grooming");
    const tenant = toPublicTenant(getNzTenantBySlug("oli")!);
    assert.equal(
      currentCourseDeepLink(tenant, course!),
      "https://enrol.studentpay.co.nz/enrol/oli/certificate-in-animal-grooming",
    );
    assert.equal(
      futureCourseDeepLink(tenant, course!),
      "https://enrol.onlinelearninginstitute.co.nz/certificate-in-animal-grooming",
    );
  });

  it("fails safely for an invalid course slug", () => {
    assert.equal(getNzCourse("oli", "not-a-real-course"), undefined);
    assert.equal(getNzCourse("oli", "../academy-australia"), undefined);
  });

  it("keeps the 64-course catalogue as a fallback, not the primary entry", () => {
    const courses = getNzCoursesForProvider("oli");
    assert.equal(courses.length, 64);
    assert.equal(
      getDefaultProductionNzTenantSlug([getNzTenantBySlug("oli")!]),
      "oli",
    );
  });

  it("maps PSY101 and BEA101 without changing certified prices", () => {
    const psy = getNzCourse("oli", "certificate-in-psychology-counselling")!;
    const bea = getNzCourse("oli", "manicure-pedicure-nail-technology")!;
    assert.equal(psy.courseCode, "PSY101");
    assert.equal(psy.paymentPlanCourseFeeCents, 183425);
    assert.equal(psy.paymentInFullCourseFeeCents, 160425);
    assert.equal(bea.courseCode, "BEA101");
    assert.equal(bea.paymentPlanCourseFeeCents, 402500);
  });
});

describe("safe return-to-provider URLs", () => {
  it("allows only configured provider hosts", () => {
    const tenant = toPublicTenant(getNzTenantBySlug("oli")!);
    assert.equal(
      safeReturnToProviderUrl(tenant),
      "https://onlinelearninginstitute.co.nz/",
    );
    assert.equal(
      safeProviderUrl("https://evil.example/steal", tenant),
      null,
    );
    assert.equal(
      safeProviderUrl("http://onlinelearninginstitute.co.nz/", tenant),
      null,
    );
    assert.equal(
      safeProviderUrl("https://onlinelearninginstitute.co.nz/contact/", tenant),
      "https://onlinelearninginstitute.co.nz/contact/",
    );
  });

  it("only links to OLI course pages that exist on the public website", () => {
    const tenant = toPublicTenant(getNzTenantBySlug("oli")!);
    const grooming = getNzCourse("oli", "certificate-in-animal-grooming")!;
    const beauty = getNzCourse("oli", "manicure-pedicure-nail-technology")!;
    assert.equal(
      providerCourseWebsiteUrl(tenant, grooming),
      "https://onlinelearninginstitute.co.nz/course/certificate-in-animal-grooming/",
    );
    assert.equal(providerCourseWebsiteUrl(tenant, beauty), null);
  });
});

describe("provider-native checkout copy", () => {
  it("uses the preferred enrolment step labels", () => {
    assert.deepEqual(
      NZ_ENROLMENT_STEPS.map((step) => step.label),
      [
        "Your details",
        "Payment option",
        "Your plan",
        "Review",
        "Direct debit",
        "Agreement",
        "Complete",
      ],
    );
    assert.match(NZ_STUDENT_DETAILS_COPY.lead, /Tell us about yourself/);
  });
});

describe("OLI 64-course website integration mapping", () => {
  it("exports a mapping row for every catalogue course", () => {
    process.env.STUDENTPAY_ENV = "production";
    const tenant = getNzTenantBySlug("oli")!;
    const rows = buildCourseLinkMapping(tenant);
    assert.equal(rows.length, 64);
    const grooming = rows.find(
      (row) => row.studentPaySlug === "certificate-in-animal-grooming",
    );
    assert.ok(grooming);
    assert.equal(grooming?.courseCode, "ANI101");
    assert.equal(
      grooming?.currentDeepLink,
      "https://enrol.studentpay.co.nz/enrol/oli/certificate-in-animal-grooming",
    );
    assert.equal(
      grooming?.futureProviderDomainDeepLink,
      "https://enrol.onlinelearninginstitute.co.nz/certificate-in-animal-grooming",
    );
    const tra = rows.filter((row) => row.courseCode === "TRA101");
    assert.equal(tra.length, 2);
    assert.equal(new Set(tra.map((row) => row.studentPaySlug)).size, 2);
  });
});
