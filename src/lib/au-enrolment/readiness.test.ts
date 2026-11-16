import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AU_ENROLMENT_SUBMISSIONS_ENABLED,
  academyAuEnrolmentBlockers,
  academyAuEnrolmentReady,
} from "./readiness.ts";
import { isAuPaymentPlanCheckoutBlocked } from "./courses.ts";

describe("Academy Australia enrolment readiness", () => {
  it("keeps live submission closed", () => {
    assert.equal(AU_ENROLMENT_SUBMISSIONS_ENABLED, false);
    assert.equal(academyAuEnrolmentReady(), false);
    assert.deepEqual(
      academyAuEnrolmentBlockers.map((blocker) => blocker.code),
      [
        "agreement_not_approved",
        "settlement_not_verified",
        "provider_not_allowlisted",
        "submission_not_approved",
      ],
    );
    assert.equal(
      isAuPaymentPlanCheckoutBlocked(
        "academy-australia",
        "bridal-freelancer-bundle",
      ),
      true,
    );
  });

  it("does not let an environment flag open submission", () => {
    const previous = process.env.AU_ENROLMENT_SUBMISSIONS_ENABLED;
    process.env.AU_ENROLMENT_SUBMISSIONS_ENABLED = "true";
    try {
      assert.equal(academyAuEnrolmentReady(), false);
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
