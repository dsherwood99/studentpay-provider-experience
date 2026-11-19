import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AU_ENROLMENT_SUBMISSIONS_ENABLED,
  academyAuEnrolmentReady,
} from "./readiness.ts";
import { isAuPaymentPlanCheckoutBlocked } from "./courses.ts";

describe("Academy Australia enrolment readiness", () => {
  it("opens the Academy enrolment form and keeps the catalogue checkout closed", () => {
    assert.equal(AU_ENROLMENT_SUBMISSIONS_ENABLED, true);
    assert.equal(academyAuEnrolmentReady(), true);
    assert.equal(
      isAuPaymentPlanCheckoutBlocked(
        "academy-australia",
        "bridal-freelancer-bundle",
      ),
      true,
    );
  });

  it("does not let an environment flag move the catalogue checkout", () => {
    const previous = process.env.AU_ENROLMENT_SUBMISSIONS_ENABLED;
    process.env.AU_ENROLMENT_SUBMISSIONS_ENABLED = "false";
    try {
      assert.equal(academyAuEnrolmentReady(), true);
      assert.equal(
        isAuPaymentPlanCheckoutBlocked(
          "academy-australia",
          "bridal-freelancer-bundle",
        ),
        true,
      );
    } finally {
      if (previous === undefined) {
        delete process.env.AU_ENROLMENT_SUBMISSIONS_ENABLED;
      } else {
        process.env.AU_ENROLMENT_SUBMISSIONS_ENABLED = previous;
      }
    }
  });
});
