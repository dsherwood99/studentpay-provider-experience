import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCanonicalInvariants,
  centsToApiAmount,
  derivePlanFromRegularInstalment,
  dollarsToCents,
  previewEqualInstalmentPlan,
  previewPlan,
} from "./plan-math.ts";

describe("generic residual and equal plan maths", () => {
  it("CASE 1 — existing Bela equal plan $2,800 / $10 / 186 × $15", () => {
    const preview = previewPlan({
      coursePriceCents: dollarsToCents(2800),
      upfrontAmountCents: dollarsToCents(10),
      frequency: "Weekly",
      regularInstalmentCents: dollarsToCents(15),
      firstPaymentDate: "2026-10-01",
    });
    assert.equal(preview.amountToFinanceCents, 279_000);
    assert.equal(preview.fullRegularInstalmentCount, 186);
    assert.equal(preview.numberOfInstalments, 186);
    assert.equal(preview.regularInstalmentAmountCents, 1500);
    assert.equal(preview.finalInstalmentAmountCents, null);
    assert.equal(preview.hasResidualFinal, false);
    assertCanonicalInvariants(preview);
  });

  it("CASE 2 — OLI residual $1,834.25 → 73 × $25 + $9.25", () => {
    const preview = derivePlanFromRegularInstalment({
      coursePriceCents: dollarsToCents("1834.25"),
      upfrontAmountCents: 0,
      regularInstalmentCents: 2500,
      frequency: "Weekly",
      firstPaymentDate: "2026-10-01",
    });
    assert.equal(preview.fullRegularInstalmentCount, 73);
    assert.equal(preview.finalInstalmentAmountCents, 925);
    assert.equal(preview.numberOfInstalments, 74);
    assert.equal(
      preview.fullRegularInstalmentCount * 2500 + preview.finalInstalmentAmountCents!,
      preview.amountToFinanceCents,
    );
  });

  it("CASE 3 — OLI large residual $4,249.25 → 169 × $25 + $24.25", () => {
    const preview = derivePlanFromRegularInstalment({
      coursePriceCents: dollarsToCents("4249.25"),
      upfrontAmountCents: 0,
      regularInstalmentCents: 2500,
      frequency: "Weekly",
      firstPaymentDate: "2026-10-01",
    });
    assert.equal(preview.fullRegularInstalmentCount, 169);
    assert.equal(preview.finalInstalmentAmountCents, 2425);
    assert.equal(preview.numberOfInstalments, 170);
  });

  it("CASE 4 — OLI exact division $4,025 → 161 × $25", () => {
    const preview = derivePlanFromRegularInstalment({
      coursePriceCents: dollarsToCents(4025),
      upfrontAmountCents: 0,
      regularInstalmentCents: 2500,
      frequency: "Weekly",
      firstPaymentDate: "2026-10-01",
    });
    assert.equal(preview.numberOfInstalments, 161);
    assert.equal(preview.finalInstalmentAmountCents, null);
  });

  it("CASE 5 — $5,175 → 207 × $25", () => {
    const preview = derivePlanFromRegularInstalment({
      coursePriceCents: dollarsToCents(5175),
      upfrontAmountCents: 0,
      regularInstalmentCents: 2500,
      frequency: "Weekly",
      firstPaymentDate: "2026-10-01",
    });
    assert.equal(preview.numberOfInstalments, 207);
    assert.equal(preview.finalInstalmentAmountCents, null);
  });

  it("CASE 6 — cent-edge validation uses integer cents", () => {
    assert.equal(dollarsToCents("1834.25"), 183425);
    assert.equal(centsToApiAmount(183425), 1834.25);
    assert.throws(() => dollarsToCents("1834.251"));
    assert.throws(() =>
      previewEqualInstalmentPlan({
        coursePriceCents: 120_000,
        upfrontAmountCents: 100,
        frequency: "Weekly",
        numberOfInstalments: 48,
        firstPaymentDate: "2026-10-01",
      }),
    );
  });

  it("keeps backward-compatible equal previewPlan(numberOfInstalments)", () => {
    const preview = previewPlan({
      coursePriceCents: 120_000,
      upfrontAmountCents: 0,
      frequency: "Weekly",
      numberOfInstalments: 48,
      firstPaymentDate: "2026-10-01",
    });
    assert.equal(preview.instalmentAmountCents, 2500);
    assert.equal(preview.hasResidualFinal, false);
  });
});
