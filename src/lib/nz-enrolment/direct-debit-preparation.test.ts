import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  DIRECT_DEBIT_PREPARATION_DEBOUNCE_MS,
  DirectDebitPreparationQueue,
  directDebitPreparationKey,
  claimPreparationRevision,
  hostedCheckoutAttemptOrderId,
  preparationRevisionIsCurrent,
  shouldPrepareDirectDebit,
  shouldWritePreparedSession,
} from "./direct-debit-preparation.ts";

const student = {
  firstName: "Alex",
  lastName: "Taylor",
  email: "Alex@example.com",
  mobile: "021000000",
  dateOfBirth: "2000-01-02",
  streetAddress: "1 Queen Street",
  suburb: "Auckland Central",
  city: "Auckland",
  region: "Auckland",
  postcode: "1010",
  country: "New Zealand",
};

const plan = {
  upfrontAmountCents: 0,
  frequency: "Weekly",
  numberOfInstalments: 73,
  firstPaymentDate: "2026-11-18",
};

describe("direct debit preparation", () => {
  it("starts only when the Direct Debit button is eligible", () => {
    assert.equal(DIRECT_DEBIT_PREPARATION_DEBOUNCE_MS, 650);
    assert.equal(
      shouldPrepareDirectDebit({
        studentValid: true,
        alreadyCreated: false,
        payInFull: false,
        reviewMode: false,
        setupComplete: false,
      }),
      true,
    );
    assert.equal(
      shouldPrepareDirectDebit({
        studentValid: false,
        alreadyCreated: false,
        payInFull: false,
        reviewMode: false,
        setupComplete: false,
      }),
      false,
    );
    assert.equal(
      shouldPrepareDirectDebit({
        studentValid: true,
        alreadyCreated: false,
        payInFull: true,
        reviewMode: false,
        setupComplete: false,
      }),
      false,
    );
    assert.equal(
      shouldPrepareDirectDebit({
        studentValid: true,
        alreadyCreated: true,
        payInFull: false,
        reviewMode: false,
        setupComplete: false,
      }),
      false,
    );
  });

  it("changes the preparation key when identity or the plan changes", () => {
    const original = directDebitPreparationKey({ student, plan });
    assert.equal(
      directDebitPreparationKey({
        student: { ...student, email: "alex@example.com" },
        plan,
      }),
      original,
    );
    assert.notEqual(
      directDebitPreparationKey({
        student: { ...student, email: "jamie@example.com" },
        plan,
      }),
      original,
    );
    assert.notEqual(
      directDebitPreparationKey({
        student,
        plan: { ...plan, firstPaymentDate: "2026-11-20" },
      }),
      original,
    );
  });

  it("keeps the newest overlapping preparation for one browser tab", () => {
    const browserId = `tab-${Date.now()}`;
    assert.equal(claimPreparationRevision({ browserId, revision: 1 }), true);
    assert.equal(claimPreparationRevision({ browserId, revision: 2 }), true);
    assert.equal(claimPreparationRevision({ browserId, revision: 1 }), false);
    assert.equal(preparationRevisionIsCurrent({ browserId, revision: 1 }), false);
    assert.equal(preparationRevisionIsCurrent({ browserId, revision: 2 }), true);
    assert.equal(claimPreparationRevision({ browserId: null, revision: 1 }), true);
  });

  it("does not let an older preparation replace a newer session", () => {
    assert.equal(
      shouldWritePreparedSession({ existingRevision: 2, requestRevision: 1 }),
      false,
    );
    assert.equal(
      shouldWritePreparedSession({ existingRevision: 2, requestRevision: 2 }),
      true,
    );
    assert.equal(
      shouldWritePreparedSession({ existingRevision: null, requestRevision: 1 }),
      true,
    );
    assert.equal(
      shouldWritePreparedSession({ existingRevision: 2, requestRevision: null }),
      true,
    );
  });

  it("reuses one in-flight prepare and does not cache a failure", async () => {
    const queue = new DirectDebitPreparationQueue();
    let calls = 0;
    let release: (value: { ok: true; setupUrl: string; checkoutId: string | null }) => void =
      () => {};
    const first = queue.request("alex", () => {
      calls += 1;
      return new Promise((resolve) => {
        release = resolve;
      });
    });
    const second = queue.request("alex", () => {
      calls += 1;
      return Promise.resolve({
        ok: true,
        setupUrl: "https://pay.gocardless.com/billing/BRQ_OTHER",
        checkoutId: "other",
      });
    });
    assert.equal(calls, 1);
    release({
      ok: true,
      setupUrl: "https://pay.gocardless.com/billing/BRQ_READY",
      checkoutId: "chk_1",
    });
    assert.equal(await first, await second);
    assert.equal((await first).ok && (await first).setupUrl, "https://pay.gocardless.com/billing/BRQ_READY");
    const reused = await queue.request("alex", () => {
      calls += 1;
      return Promise.resolve({
        ok: true,
        setupUrl: "https://pay.gocardless.com/billing/BRQ_NEW",
        checkoutId: "chk_2",
      });
    });
    assert.equal(calls, 1);
    assert.equal(reused.ok && reused.setupUrl, "https://pay.gocardless.com/billing/BRQ_READY");
  });

  it("prepares the latest details after an in-flight create and retries a failure", async () => {
    const queue = new DirectDebitPreparationQueue();
    let calls = 0;
    const seen: string[] = [];
    let releaseAlex: (value: { ok: false; message: string }) => void = () => {};
    const alex = queue.request("alex", () => {
      calls += 1;
      seen.push("alex");
      return new Promise((resolve) => {
        releaseAlex = resolve;
      });
    });
    const jamie = queue.request("jamie", () => {
      calls += 1;
      seen.push("jamie");
      return Promise.resolve({
        ok: true,
        setupUrl: "https://pay.gocardless.com/billing/BRQ_JAMIE",
        checkoutId: "chk_jamie",
      });
    });
    assert.deepEqual(seen, ["alex"]);
    releaseAlex({ ok: false, message: "Salesforce is unavailable." });
    assert.equal((await alex).ok, false);
    const jamieResult = await jamie;
    assert.equal(jamieResult.ok && jamieResult.setupUrl, "https://pay.gocardless.com/billing/BRQ_JAMIE");
    assert.deepEqual(seen, ["alex", "jamie"]);
    const retry = await queue.request("alex", () => {
      calls += 1;
      seen.push("alex-retry");
      return Promise.resolve({
        ok: true,
        setupUrl: "https://pay.gocardless.com/billing/BRQ_ALEX",
        checkoutId: "chk_alex",
      });
    });
    assert.equal(retry.ok && retry.setupUrl, "https://pay.gocardless.com/billing/BRQ_ALEX");
    assert.equal(calls, 3);
  });

  it("drops a superseded waiter when the details change again before the first create finishes", async () => {
    const queue = new DirectDebitPreparationQueue();
    let releaseAlex: (value: { ok: true; setupUrl: string; checkoutId: null }) => void = () => {};
    const alex = queue.request("alex", () => new Promise((resolve) => {
      releaseAlex = resolve;
    }));
    const jamie = queue.request("jamie", () =>
      Promise.resolve({
        ok: true,
        setupUrl: "https://pay.gocardless.com/billing/BRQ_JAMIE",
        checkoutId: "chk_jamie",
      }),
    );
    const sam = queue.request("sam", () =>
      Promise.resolve({
        ok: true,
        setupUrl: "https://pay.gocardless.com/billing/BRQ_SAM",
        checkoutId: "chk_sam",
      }),
    );
    releaseAlex({
      ok: true,
      setupUrl: "https://pay.gocardless.com/billing/BRQ_ALEX",
      checkoutId: null,
    });
    assert.equal((await alex).ok && (await alex).setupUrl, "https://pay.gocardless.com/billing/BRQ_ALEX");
    const dropped = await jamie;
    assert.equal(dropped.ok, false);
    assert.equal(dropped.ok === false && dropped.superseded, true);
    const kept = await sam;
    assert.equal(kept.ok && kept.setupUrl, "https://pay.gocardless.com/billing/BRQ_SAM");
  });

  it("starts the existing checkout create from the eligible form and opens GoCardless only on click", () => {
    const root = fileURLToPath(new URL("../../", import.meta.url));
    const checkout = fs.readFileSync(
      path.join(root, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    const route = fs.readFileSync(
      path.join(root, "app/api/enrolment-checkout/route.ts"),
      "utf8",
    );
    const confirm = fs.readFileSync(
      path.join(root, "app/api/enrolment-checkout/confirm/route.ts"),
      "utf8",
    );
    const effect = checkout.slice(
      checkout.indexOf("DIRECT_DEBIT_PREPARATION_DEBOUNCE_MS"),
      checkout.indexOf("function updateStudent"),
    );
    assert.match(effect, /preparationQueueRef\.current/);
    assert.doesNotMatch(effect, /window\.open/);
    assert.match(checkout, /onClick=\{\(\) => void startDirectDebitSetup\(\)\}/);
    assert.match(route, /claimPreparationRevision/);
    assert.match(route, /idempotencyKey: paymentPlanOrderId/);
    assert.match(route, /requireTenantKey\(tenant\)/);
    assert.doesNotMatch(route, /PROVIDER_API_KEY_OLI_NZ/);
    assert.match(checkout, /nz-student-privacy-link/);
    assert.doesNotMatch(checkout, /nz-details-preparation-notice/);
    assert.doesNotMatch(checkout, /Completing these details sends them/);
    assert.match(route, /hostedCheckoutAttemptOrderId/);
    assert.match(checkout, /checkoutAttemptId: checkoutAttemptId\(\)/);
    assert.match(route, /shouldWritePreparedSession/);
    assert.match(route, /session_superseded/);
    assert.match(route, /sessionKey !== requestKey/);
    assert.doesNotMatch(confirm, /directDebitPreparationKey/);
    assert.doesNotMatch(confirm, /preparationRevision/);
  });

  it("builds the order id from a browser UUID and this provider", () => {
    const attempt = "585db66c-6eaf-49f0-a30b-9447a8d5731c";
    assert.equal(
      hostedCheckoutAttemptOrderId({ attemptId: attempt, providerCode: "OLI_NZ" }),
      `HOSTED-OLI_NZ-${attempt}`,
    );
    assert.equal(
      hostedCheckoutAttemptOrderId({ attemptId: attempt, providerCode: "BELA_NZ" }),
      `HOSTED-BELA_NZ-${attempt}`,
    );
    assert.equal(
      hostedCheckoutAttemptOrderId({
        attemptId: `HOSTED-OLI_NZ-${attempt}`,
        providerCode: "OLI_NZ",
      }),
      null,
    );
  });
});
