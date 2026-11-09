import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  draftStorageKey,
  isOliRecoverableCheckoutId,
  parseCheckoutIdPrefix,
  recoveryDeniedMessage,
  studentFromRecoveryPayload,
} from "./checkout-recovery.ts";
import { getNzCourseByCode } from "./courses.ts";

const srcRoot = path.join(fileURLToPath(new URL("../../", import.meta.url)));

describe("OLI checkout recovery helpers", () => {
  it("accepts only OLI_NZ checkout ids as locators", () => {
    assert.equal(parseCheckoutIdPrefix("OLI_NZ-1788954262042-IAOQ07WB"), "OLI_NZ");
    assert.equal(isOliRecoverableCheckoutId("OLI_NZ-1788954262042-IAOQ07WB"), true);
    assert.equal(isOliRecoverableCheckoutId("BELA_NZ-1788954262042-IAOQ07WB"), false);
    assert.equal(isOliRecoverableCheckoutId("not-a-checkout"), false);
  });

  it("does not treat a checkout id as authentication", () => {
    const route = fs.readFileSync(
      path.join(srcRoot, "app/api/enrolment-checkout/recovery/route.ts"),
      "utf8",
    );
    assert.match(route, /isOliRecoverableCheckoutId/);
    assert.match(route, /dateOfBirth/);
    assert.match(route, /canonicalRecover/);
    assert.doesNotMatch(route, /writeNzSession\(\{[\s\S]*checkoutId,\s*\}\)/);
  });

  it("maps recovered student fields into the existing draft shape", () => {
    const student = studentFromRecoveryPayload({
      first_name: "Ada",
      last_name: "Student",
      email: "ada@example.com",
      mobile: "0210000000",
      date_of_birth: "1990-05-01",
      address: {
        street_address: "1 Queen Street",
        suburb: "Auckland",
        state: "Auckland",
        postcode: "1010",
        country: "New Zealand",
      },
    });
    assert.equal(student.firstName, "Ada");
    assert.equal(student.dateOfBirth, "1990-05-01");
    assert.equal(draftStorageKey("oli", "admin"), "nz-enrolment-draft:oli:admin");
  });

  it("resolves recovered OLI course codes to the existing catalogue slug", () => {
    const course = getNzCourseByCode("oli", "PSY101");
    assert.equal(course?.slug, "certificate-in-psychology-counselling");
  });

  it("keeps recovery denial copy generic", () => {
    assert.match(recoveryDeniedMessage(), /email and date of birth/i);
    assert.doesNotMatch(recoveryDeniedMessage("RECOVERY_DENIED"), /not found/i);
  });

  it("does not adopt a course from the resume query string", () => {
    const resume = fs.readFileSync(
      path.join(srcRoot, "app/enrol/resume/page.tsx"),
      "utf8",
    );
    assert.match(resume, /searchParams/);
    assert.doesNotMatch(resume, /getNzCourse\(/);
    assert.match(resume, /OliCheckoutRecoveryForm/);
  });
});
