import assert from "node:assert/strict";
import test from "node:test";
import belaWebsite from "./catalogues/bela-website-courses.json" with { type: "json" };
import { describeDerivedWeeklyPlan } from "./plan-math.ts";

const MAX_INSTALMENTS = 400;

test("Bela default weekly plans reconcile from catalogue prices", () => {
  assert.equal(belaWebsite.courses.length, 26);
  const slugs = belaWebsite.courses.map(
    (course) => course.studentPaySlug || course.handle,
  );
  assert.equal(new Set(slugs).size, 26);

  for (const course of belaWebsite.courses) {
    const slug = course.studentPaySlug || course.handle;
    const lash = slug === "lash-business-bundle";
    const coursePriceCents = lash ? 280_000 : course.publishedPriceCents;
    const regularInstalmentCents = lash ? 1_500 : 2_000;
    const described = describeDerivedWeeklyPlan({
      coursePriceCents,
      upfrontAmountCents: 1_000,
      regularInstalmentCents,
    });

    if (slug === "full-beauty-bundle") {
      assert.equal(described, null);
      const financed = coursePriceCents - 1_000;
      assert.equal(Math.floor(financed / regularInstalmentCents) + 1, 480);
      continue;
    }

    assert.ok(described);
    const preview = described!.preview;
    assert.equal(preview.upfrontAmountCents, 1_000);
    assert.equal(preview.regularInstalmentAmountCents, regularInstalmentCents);
    assert.equal(preview.frequency, "Weekly");
    const residual = preview.finalInstalmentAmountCents;
    const recurring =
      residual == null
        ? preview.numberOfInstalments * preview.regularInstalmentAmountCents
        : preview.fullRegularInstalmentCount * preview.regularInstalmentAmountCents +
          residual;
    assert.equal(preview.upfrontAmountCents + recurring, coursePriceCents);
    assert.notEqual(coursePriceCents, coursePriceCents + 6_000);
    assert.ok(preview.numberOfInstalments <= MAX_INSTALMENTS);
    if (residual == null) {
      assert.equal(
        preview.numberOfInstalments * preview.regularInstalmentAmountCents,
        preview.amountToFinanceCents,
      );
    } else {
      assert.ok(residual > 0);
      assert.ok(residual < preview.regularInstalmentAmountCents);
    }
    if (!lash) {
      assert.equal(preview.regularInstalmentAmountCents, 2_000);
      assert.equal(coursePriceCents, course.publishedPriceCents);
    }
  }

  const lash = describeDerivedWeeklyPlan({
    coursePriceCents: 280_000,
    upfrontAmountCents: 1_000,
    regularInstalmentCents: 1_500,
  });
  assert.equal(lash?.preview.amountToFinanceCents, 279_000);
  assert.equal(lash?.preview.numberOfInstalments, 186);
  assert.equal(lash?.preview.finalInstalmentAmountCents, null);
  assert.equal(
    lash?.summary,
    "$10.00 upfront, then $15.00 weekly for 186 weeks",
  );

  const makeup = describeDerivedWeeklyPlan({
    coursePriceCents: 240_000,
    upfrontAmountCents: 1_000,
    regularInstalmentCents: 2_000,
  });
  assert.equal(makeup?.preview.numberOfInstalments, 120);
  assert.equal(makeup?.preview.finalInstalmentAmountCents, 1_000);
  assert.equal(
    makeup?.summary,
    "$10.00 upfront, then $20.00 weekly, final payment $10.00",
  );

  const exact = describeDerivedWeeklyPlan({
    coursePriceCents: 3_000,
    upfrontAmountCents: 1_000,
    regularInstalmentCents: 2_000,
  });
  assert.equal(exact?.preview.finalInstalmentAmountCents, null);
  assert.equal(exact?.preview.numberOfInstalments, 1);
  assert.equal(exact?.preview.upfrontAmountCents + 2_000, 3_000);
});
