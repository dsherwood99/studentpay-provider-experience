import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATALOGUE_NOT_ENABLED,
  catalogueCourseFromHttp,
  catalogueListFromHttp,
  catalogueUnavailableCopy,
} from "./catalogue-availability.ts";
import { getCoursesByProvider } from "../../config/courses.ts";
import { toCatalogueCourseView, formatAudFromCents, formatCataloguePlanCopy } from "./catalogue-view.ts";
import type { PublicCatalogueCourse } from "../../types/catalogue.ts";

function publicCourse(): PublicCatalogueCourse {
  return {
    course_id: "a2Fbridal",
    course_code: "BRIDAL_FREELANCER_BUNDLE",
    course_name: "Bridal Freelancer Bundle",
    status: "active",
    currency: "AUD",
    kit_included: false,
    kit_disclosure: "Kit not included",
    price_version: {
      price_version_id: "a2Ebridal",
      version_number: 1,
      status: "active",
      effective_from: "2026-08-01",
      frequency: "weekly",
    },
    commercial: {
      course_price_cents: 350000,
      standard_recurring_amount_cents: 2300,
      operational_upfront_payment_cents: 400,
      recurring_instalment_count: 152,
    },
  };
}

describe("catalogue fail-closed behaviour", () => {
  it("treats a disabled PIC as unavailable and does not invent courses", () => {
    const parsed = catalogueListFromHttp(404, {
      success: false,
      error: {
        code: CATALOGUE_NOT_ENABLED,
        message: "Catalogue is not enabled for this provider",
      },
    });

    assert.equal(parsed.status, "unavailable");
    if (parsed.status !== "unavailable") {
      throw new Error("expected unavailable");
    }
    assert.equal(parsed.code, CATALOGUE_NOT_ENABLED);
    assert.equal("courses" in parsed, false);

    const copy = catalogueUnavailableCopy(parsed.code, "Bela Beauty College");
    assert.match(copy.title, /not available yet/);
    assert.doesNotMatch(copy.body.toLowerCase(), /academy/);
    assert.doesNotMatch(copy.body.toLowerCase(), /sandbox/);
  });

  it("does not fall back to Academy or sandbox courses", () => {
    const parsed = catalogueListFromHttp(404, {
      error: { code: CATALOGUE_NOT_ENABLED },
    });
    const academyTitles = getCoursesByProvider("ACADEMY_AUSTRALIA").map(
      (course) => course.title,
    );

    assert.equal(parsed.status, "unavailable");
    assert.ok(academyTitles.includes("Criminal Psychology"));
    assert.ok(
      academyTitles.some((title) => title.includes("Makeup Artistry")),
    );
    assert.equal("courses" in parsed, false);
    assert.notEqual(parsed.status, "ready");
  });

  it("maps a disabled PIC course lookup to unavailable, not a fake course", () => {
    const parsed = catalogueCourseFromHttp(
      404,
      { error: { code: CATALOGUE_NOT_ENABLED } },
      "CLASSIC_LASH",
    );
    assert.equal(parsed.status, "unavailable");
  });

  it("maps a missing enabled-catalogue course to missing", () => {
    const parsed = catalogueCourseFromHttp(
      404,
      { error: { code: "COURSE_NOT_FOUND" } },
      "CLASSIC_LASH",
    );
    assert.equal(parsed.status, "missing");
  });
});

describe("API-derived Bela production catalogue values", () => {
  it("renders Bridal from mocked API cents for provider code BELA", () => {
    const view = toCatalogueCourseView("BELA", publicCourse());
    assert.equal(view.providerCode, "BELA");
    assert.equal(formatAudFromCents(view.coursePriceCents), "$3,500");
    assert.equal(
      formatCataloguePlanCopy(view),
      "$4 upfront then 152 weekly payments of $23",
    );
    assert.equal(view.kitDisclosure, "Kit not included");
    assert.notEqual(view.providerCode, "ACADEMY_AUSTRALIA");
    assert.notEqual(view.providerCode, "BELA_BEAUTY_SANDBOX");
  });

  it("renders Classic without a $0 upfront line for provider code BELA", () => {
    const view = toCatalogueCourseView("BELA", {
      ...publicCourse(),
      course_code: "CLASSIC_LASH",
      course_name: "Classic Lash",
      commercial: {
        course_price_cents: 180000,
        standard_recurring_amount_cents: 2400,
        operational_upfront_payment_cents: 0,
        recurring_instalment_count: 75,
      },
    });
    assert.equal(formatAudFromCents(view.coursePriceCents), "$1,800");
    assert.equal(formatCataloguePlanCopy(view), "75 weekly payments of $24");
    assert.equal(formatCataloguePlanCopy(view).includes("$0"), false);
    assert.equal(view.kitDisclosure, "Kit not included");
  });
});
