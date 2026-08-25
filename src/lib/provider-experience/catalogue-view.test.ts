import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PublicCatalogueCourse } from "../../types/catalogue.ts";
import {
  courseCodeFromSlug,
  formatAudFromCents,
  formatCataloguePlanCopy,
  slugFromCourseCode,
  toCatalogueCourseView,
  uniqueActiveCatalogueCourses,
} from "./catalogue-view.ts";

function publicCourse(
  overrides: Partial<PublicCatalogueCourse> &
    Pick<PublicCatalogueCourse, "course_code" | "course_name">,
): PublicCatalogueCourse {
  return {
    course_id: overrides.course_id || "course-id",
    course_code: overrides.course_code,
    course_name: overrides.course_name,
    status: overrides.status || "active",
    currency: "AUD",
    kit_included: overrides.kit_included === true,
    kit_disclosure: overrides.kit_disclosure || "Kit not included",
    price_version: {
      price_version_id: "price-id",
      version_number: 1,
      status: "active",
      effective_from: null,
      frequency: overrides.price_version?.frequency || "weekly",
      ...overrides.price_version,
    },
    commercial: {
      course_price_cents: 180000,
      standard_recurring_amount_cents: 2400,
      operational_upfront_payment_cents: 0,
      recurring_instalment_count: 75,
      ...overrides.commercial,
    },
  };
}

const bridal = toCatalogueCourseView(
  "BELA_BEAUTY_SANDBOX",
  publicCourse({
    course_code: "BRIDAL_FREELANCER_BUNDLE",
    course_name: "Bridal Freelancer Bundle",
    commercial: {
      course_price_cents: 350000,
      standard_recurring_amount_cents: 2300,
      operational_upfront_payment_cents: 400,
      recurring_instalment_count: 152,
    },
  }),
);

const classic = toCatalogueCourseView(
  "BELA_BEAUTY_SANDBOX",
  publicCourse({
    course_code: "CLASSIC_LASH",
    course_name: "Classic Lash",
    commercial: {
      course_price_cents: 180000,
      standard_recurring_amount_cents: 2400,
      operational_upfront_payment_cents: 0,
      recurring_instalment_count: 75,
    },
  }),
);

describe("catalogue view mapping", () => {
  it("renders Bridal commercial copy from catalogue cents", () => {
    assert.equal(bridal.title, "Bridal Freelancer Bundle");
    assert.equal(bridal.slug, "bridal-freelancer-bundle");
    assert.equal(formatAudFromCents(bridal.coursePriceCents), "$3,500");
    assert.equal(formatCataloguePlanCopy(bridal), "$4 upfront then 152 weekly payments of $23");
    assert.equal(bridal.kitDisclosure, "Kit not included");
  });

  it("renders Classic zero-upfront copy without $0 upfront", () => {
    assert.equal(classic.title, "Classic Lash");
    assert.equal(formatAudFromCents(classic.coursePriceCents), "$1,800");
    assert.equal(formatCataloguePlanCopy(classic), "75 weekly payments of $24");
    assert.equal(classic.kitDisclosure, "Kit not included");
    assert.equal(formatCataloguePlanCopy(classic).includes("$0"), false);
    assert.equal(formatCataloguePlanCopy(classic).toLowerCase().includes("upfront"), false);
  });

  it("keeps Brow Mastery once in a 20-course catalogue", () => {
    const names = [
      "BRIDAL_FREELANCER_BUNDLE",
      "WAXING_MASTERY_BUNDLE",
      "BROW_MASTERY",
      "LASH_AND_BROW_BUNDLE",
      "LASH_BUNDLE",
      "HAIR_BUNDLE",
      "CLASSIC_LASH",
      "RUSSIAN_VOLUME",
      "MEGA_VOLUME",
      "LASH_LIFT_AND_TINT",
      "SPRAY_TAN",
      "HAIR_EXTENSION",
      "HAIR_STYLING",
      "MAKEUP",
      "BROW_LAMINATION",
      "BROW_WAX_AND_TINT",
      "MANICURE_AND_PEDICURE",
      "NAIL_ART",
      "NAIL_TECHNOLOGY",
      "BODY_WAXING",
      "BROW_MASTERY",
    ];

    const mapped = uniqueActiveCatalogueCourses(
      names.map((code, index) =>
        toCatalogueCourseView(
          "BELA_BEAUTY_SANDBOX",
          publicCourse({
            course_id: `id-${index}`,
            course_code: code,
            course_name: code === "BROW_MASTERY" ? "Brow Mastery" : code,
          }),
        ),
      ),
    );

    assert.equal(mapped.length, 20);
    assert.equal(
      mapped.filter((course) => course.code === "BROW_MASTERY").length,
      1,
    );
  });

  it("treats unknown, inactive, and mismatched courses as absent", () => {
    assert.equal(courseCodeFromSlug("does-not-exist"), "DOES_NOT_EXIST");
    assert.equal(slugFromCourseCode("CLASSIC_LASH"), "classic-lash");

    const inactive = uniqueActiveCatalogueCourses([
      toCatalogueCourseView(
        "BELA_BEAUTY_SANDBOX",
        publicCourse({
          course_code: "DRAFT_COURSE",
          course_name: "Draft Course",
          status: "draft",
        }),
      ),
    ]);
    assert.equal(inactive.length, 0);

    const belaCourse = toCatalogueCourseView(
      "BELA_BEAUTY_SANDBOX",
      publicCourse({
        course_code: "CLASSIC_LASH",
        course_name: "Classic Lash",
      }),
    );
    assert.equal(belaCourse.providerCode, "BELA_BEAUTY_SANDBOX");
    assert.notEqual(belaCourse.providerCode, "ACADEMY_AUSTRALIA");
  });
});
