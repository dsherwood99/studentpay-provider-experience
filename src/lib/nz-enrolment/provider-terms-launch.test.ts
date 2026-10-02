import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { belaNzSkeletonInput } from "./provider-terms-bela-fixture.ts";
import { composeProviderTermsSkeleton } from "./provider-terms.ts";
import {
  LAUNCH_AGREEMENT_VERSION,
  auditLaunchClauseRuntime,
  composeLaunchProviderStudentAgreement,
  launchAuditPassed,
} from "./provider-terms-launch.ts";

const ARTEFACT =
  "docs/provider-terms-architecture/artefacts/BELA_NZ_agreement_2026-10-01-v3.html";
const V2_ARTEFACT =
  "docs/provider-terms-architecture/artefacts/BELA_NZ_agreement_skeleton.html";

function belaLaunchInput() {
  const base = belaNzSkeletonInput();
  return {
    ...base,
    effectiveDate: "2026-10-01" as const,
    payer: {
      ...base.payer,
      failedPaymentFeeCollection: "end_of_plan" as const,
    },
  };
}

test("Bela launch agreement is v3 and leaves the v2 skeleton unchanged", () => {
  const v2 = composeProviderTermsSkeleton(belaNzSkeletonInput());
  assert.equal(readFileSync(V2_ARTEFACT, "utf8"), v2.html);
  assert.equal(v2.version, "nz-provider-student-2026-09-30-v2");
  assert.equal(v2.contentHash, "ddb6aa7a3f9c4a4fe9becb72db9ab688503b8236ebdbd6de189575de50ccef78");

  const launch = composeLaunchProviderStudentAgreement(belaLaunchInput());
  assert.equal(launch.version, LAUNCH_AGREEMENT_VERSION);
  assert.equal(launch.status, "ACTIVE");
  assert.equal(launch.activationPermitted, true);
  assert.equal(launch.availableForStudentAcceptance, true);
  assert.equal(launch.effectiveDate, "2026-10-01");
  assert.equal(
    launch.agreementKey,
    "BELA_NZ|Production|Provider_Student_Agreement|nz-provider-student-2026-10-01-v3",
  );
  assert.ok(launch.agreementKey.length <= 80);
  assert.equal(readFileSync(ARTEFACT, "utf8"), launch.html);
  assert.notEqual(launch.contentHash, v2.contentHash);
  assert.doesNotMatch(launch.html, /<html|<head|<body|<article|<script|data-/i);
});

test("Bela launch clause and runtime audit passes", () => {
  const input = belaLaunchInput();
  const launch = composeLaunchProviderStudentAgreement(input);
  const audit = auditLaunchClauseRuntime(launch, input);
  assert.equal(launchAuditPassed(audit), true);
  for (const [id, result] of Object.entries(audit)) {
    assert.equal(result, "PASS", id);
  }
  assert.doesNotMatch(launch.html, /4-day|automatic catch-up|last business day|kits are financed/i);
  assert.equal(input.course.courseFeeCents, 280_000);
  assert.equal(input.course.upfrontCents, 1_000);
  assert.equal(input.course.financedCents, 279_000);
  assert.equal(input.course.instalmentCount, 186);
  assert.equal(input.course.regularInstalmentCents, 1_500);
  assert.equal(input.course.residualCents, null);
});
