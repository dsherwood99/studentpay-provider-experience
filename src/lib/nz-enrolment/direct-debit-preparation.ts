import type { NzPlanSelection, NzStudentDetails } from "./types.ts";
import { sanitiseStudent } from "./validation.ts";

/** Wait after details become valid before the existing checkout create runs. */
export const DIRECT_DEBIT_PREPARATION_DEBOUNCE_MS = 650;

const ATTEMPT_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The browser sends a UUID. This server adds the provider, so the order id cannot be chosen for another provider. */
export function hostedCheckoutAttemptOrderId(input: {
  attemptId?: string | null;
  providerCode: string;
}): string | null {
  const attemptId = input.attemptId?.trim() || "";
  const providerCode = input.providerCode.trim();
  if (!ATTEMPT_UUID.test(attemptId) || !/^[A-Z0-9_]+$/.test(providerCode)) {
    return null;
  }
  return `HOSTED-${providerCode}-${attemptId.toLowerCase()}`;
}

export function shouldPrepareDirectDebit(input: {
  studentValid: boolean;
  alreadyCreated: boolean;
  payInFull: boolean;
  reviewMode: boolean;
  setupComplete: boolean;
}): boolean {
  return (
    input.studentValid &&
    !input.alreadyCreated &&
    !input.payInFull &&
    !input.reviewMode &&
    !input.setupComplete
  );
}

export function directDebitPreparationKey(input: {
  student: Partial<NzStudentDetails>;
  plan: {
    upfrontAmountCents?: number;
    frequency?: string;
    numberOfInstalments?: number | null;
    firstPaymentDate?: string;
  };
}): string {
  const student = sanitiseStudent(input.student);
  return JSON.stringify({
    firstName: student.firstName.toLowerCase(),
    lastName: student.lastName.toLowerCase(),
    email: student.email.toLowerCase(),
    mobile: student.mobile,
    dateOfBirth: student.dateOfBirth,
    streetAddress: student.streetAddress.toLowerCase(),
    suburb: student.suburb.toLowerCase(),
    city: student.city.toLowerCase(),
    region: student.region.toLowerCase(),
    postcode: student.postcode,
    country: student.country.toLowerCase(),
    upfrontAmountCents: input.plan.upfrontAmountCents ?? 0,
    frequency: input.plan.frequency || "",
    numberOfInstalments: input.plan.numberOfInstalments ?? null,
    firstPaymentDate: input.plan.firstPaymentDate || "",
  });
}

const claimedPreparationRevision = new Map<string, number>();
const MAX_PREPARATION_CLAIMS = 500;

/**
 * Same-process guard for overlapping checkout creates.
 * A newer revision claims the browser tab. An older in-flight request
 * must not replace that tab's session cookie when it finishes.
 * Requests without a revision stay eligible so an ordinary click still saves.
 */
export function claimPreparationRevision(input: {
  browserId?: string | null;
  revision?: number | null;
}): boolean {
  const browserId = input.browserId?.trim() || "";
  const revision = input.revision;
  if (!browserId || revision == null || !Number.isInteger(revision)) {
    return true;
  }
  const current = claimedPreparationRevision.get(browserId);
  if (current != null && revision < current) {
    return false;
  }
  if (current == null || revision > current) {
    claimedPreparationRevision.set(browserId, revision);
    if (claimedPreparationRevision.size > MAX_PREPARATION_CLAIMS) {
      const oldest = claimedPreparationRevision.keys().next().value;
      if (oldest) claimedPreparationRevision.delete(oldest);
    }
  }
  return true;
}

export function preparationRevisionIsCurrent(input: {
  browserId?: string | null;
  revision?: number | null;
}): boolean {
  const browserId = input.browserId?.trim() || "";
  const revision = input.revision;
  if (!browserId || revision == null || !Number.isInteger(revision)) {
    return true;
  }
  const current = claimedPreparationRevision.get(browserId);
  return current == null || revision >= current;
}

export function shouldWritePreparedSession(input: {
  existingRevision?: number | null;
  requestRevision?: number | null;
}): boolean {
  if (input.requestRevision == null || !Number.isInteger(input.requestRevision)) {
    return true;
  }
  if (input.existingRevision == null || !Number.isInteger(input.existingRevision)) {
    return true;
  }
  return input.requestRevision >= input.existingRevision;
}

export type DirectDebitPreparationResult =
  | { ok: true; setupUrl: string; checkoutId: string | null }
  | { ok: false; message: string; superseded?: boolean };

type PendingPreparation = {
  key: string;
  start: () => Promise<DirectDebitPreparationResult>;
  resolve: (
    value: DirectDebitPreparationResult | PromiseLike<DirectDebitPreparationResult>,
  ) => void;
};

/**
 * One checkout create at a time for the current validated details.
 * A successful result is reused for that same key. A changed key waits
 * for the in-flight create, then starts the next one. Failures are not cached.
 */
export class DirectDebitPreparationQueue {
  private flight: { key: string; promise: Promise<DirectDebitPreparationResult> } | null =
    null;
  private pending: PendingPreparation | null = null;
  private ready: { key: string; value: DirectDebitPreparationResult & { ok: true } } | null =
    null;

  request(
    key: string,
    start: () => Promise<DirectDebitPreparationResult>,
  ): Promise<DirectDebitPreparationResult> {
    if (this.flight?.key === key) {
      return this.flight.promise;
    }
    if (this.flight) {
      const previous = this.pending;
      const queued = new Promise<DirectDebitPreparationResult>((resolve) => {
        this.pending = { key, start, resolve };
      });
      previous?.resolve({ ok: false, message: "", superseded: true });
      return queued;
    }
    if (this.ready?.key === key) {
      return Promise.resolve(this.ready.value);
    }
    return this.begin(key, start);
  }

  private begin(
    key: string,
    start: () => Promise<DirectDebitPreparationResult>,
  ): Promise<DirectDebitPreparationResult> {
    const promise = start()
      .then((value) => value)
      .catch((error: unknown) => ({
        ok: false as const,
        message: error instanceof Error ? error.message : "Unable to prepare Direct Debit.",
      }));
    const settled = promise.then((value) => {
      if (this.flight?.promise === settled) {
        this.flight = null;
      }
      if (value.ok) {
        this.ready = { key, value };
      }
      const pending = this.pending;
      this.pending = null;
      if (pending) {
        if (pending.key === key && value.ok) {
          pending.resolve(value);
        } else {
          pending.resolve(this.begin(pending.key, pending.start));
        }
      }
      return value;
    });
    this.flight = { key, promise: settled };
    return settled;
  }
}

export function preparationPlanFromSelection(plan: NzPlanSelection): {
  upfrontAmountCents: number;
  frequency: string;
  numberOfInstalments: number | null;
  firstPaymentDate: string;
} {
  return {
    upfrontAmountCents: plan.upfrontAmountCents,
    frequency: plan.frequency,
    numberOfInstalments: plan.numberOfInstalments ?? null,
    firstPaymentDate: plan.firstPaymentDate,
  };
}
