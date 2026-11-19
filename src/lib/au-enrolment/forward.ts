import { getHostedProductMode } from "../nz-enrolment/environment.ts";
import {
  ACADEMYAU_AGREEMENT_HASH,
  ACADEMYAU_AGREEMENT_VERSION,
} from "./agreement.ts";

export const ACADEMY_ENROLMENT_COURSE_PATH =
  "/academy-australia/bridal-freelancer-bundle";

export const ACADEMY_PRODUCTION_API_URL = "https://api.studentpay.com.au";

const PRODUCTION_HOSTS = new Set([
  "www.academyaustralia.com",
  "academyaustralia.com",
]);

const RAW_BANK_KEY = /bsb|accountnumber|account_number|bankaccount|routing|cvv|cardnumber/i;

const FORWARDED_KEYS = [
  "coursePath",
  "enrolmentId",
  "documentHash",
  "paymentPlanAccepted",
  "directDebitServiceAgreementAccepted",
  "sourceToken",
  "firstName",
  "lastName",
  "dateOfBirth",
  "email",
  "mobile",
  "addressLine1",
  "addressLine2",
  "suburb",
  "state",
  "postcode",
  "firstPaymentDate",
  "abilityToRepay",
] as const;

export type AcademyUpstream = {
  configured: true;
  url: string;
  key: string;
} | {
  configured: false;
  url: "";
  key: "";
};

export function requestHost(hostHeader: string): string {
  return String(hostHeader || "")
    .split(",")[0]
    ?.trim()
    .toLowerCase()
    .replace(/:\d+$/, "") || "";
}

/**
 * The proxy runs on the Academy production host and on a local Academy or
 * generic dev server. Bela, NZ, and OLI hosts are refused.
 */
export function academyEnrolmentProxyAllowed(
  hostHeader: string,
  productMode = getHostedProductMode(),
): boolean {
  const host = requestHost(hostHeader);
  if (PRODUCTION_HOSTS.has(host)) return productMode === "academy" || productMode === "generic";
  if (host === "localhost" || host === "127.0.0.1") {
    return productMode === "academy" || productMode === "generic";
  }
  return false;
}

export function readAcademyUpstream(
  env: Record<string, string | undefined> = process.env,
): AcademyUpstream {
  const key = String(env.AU_ENROLMENT_API_KEY || "").trim();
  const url = String(env.AU_ENROLMENT_API_URL || ACADEMY_PRODUCTION_API_URL)
    .trim()
    .replace(/\/$/, "");
  if (!key || url !== ACADEMY_PRODUCTION_API_URL) {
    return { configured: false, url: "", key: "" };
  }
  return { configured: true, url, key };
}

function hasRawBankKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (RAW_BANK_KEY.test(key)) return true;
    if (hasRawBankKey((value as Record<string, unknown>)[key])) return true;
  }
  return false;
}

export function prepareAcademyForwardBody(input: unknown):
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; message: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, status: 400, message: "Invalid enrolment request." };
  }
  if (hasRawBankKey(input)) {
    return { ok: false, status: 400, message: "Invalid enrolment request." };
  }
  const source = input as Record<string, unknown>;
  if (source.coursePath !== ACADEMY_ENROLMENT_COURSE_PATH) {
    return { ok: false, status: 400, message: "Invalid enrolment request." };
  }
  const body: Record<string, unknown> = {
    coursePath: ACADEMY_ENROLMENT_COURSE_PATH,
    providerAgreementVersion: ACADEMYAU_AGREEMENT_VERSION,
    providerAgreementHash: ACADEMYAU_AGREEMENT_HASH,
  };
  for (const key of FORWARDED_KEYS) {
    if (key === "coursePath" || !(key in source)) continue;
    const value = source[key];
    if (key === "paymentPlanAccepted" || key === "directDebitServiceAgreementAccepted") {
      if (typeof value === "boolean") body[key] = value;
      continue;
    }
    if (typeof value === "string") body[key] = value;
  }
  return { ok: true, body };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function presentAcademyEnrolment(
  data: Record<string, unknown>,
  status: number,
  allowLiveCapture: boolean,
): Record<string, unknown> {
  const agreement = record(data.agreement);
  const directDebit = record(data.direct_debit_agreement);
  const providerAgreement = record(data.provider_student_agreement);
  const pinch = record(data.pinch);
  const salesforce = record(data.salesforce);
  const collections = record(data.collections);
  const publishable = typeof pinch.publishable_key === "string" ? pinch.publishable_key : "";
  const publishableKey = allowLiveCapture && /^pk_live_[A-Za-z0-9_-]{8,80}$/.test(publishable)
    ? publishable
    : "";
  return {
    ok: data.activated === true,
    activated: data.activated === true,
    enrolmentId: typeof data.enrolment_id === "string" ? data.enrolment_id : null,
    enrolmentReference: data.activated === true ? data.enrolment_reference ?? null : null,
    message: typeof data.message === "string" ? data.message : "Enrolment could not be confirmed.",
    errors: data.errors,
    lifecycle: typeof data.lifecycle === "string" ? data.lifecycle : "application_started",
    providerCode: data.provider_code === "ACADEMYAU" ? "ACADEMYAU" : null,
    coursePath: data.course_path === ACADEMY_ENROLMENT_COURSE_PATH ? ACADEMY_ENROLMENT_COURSE_PATH : null,
    agreementAccepted: agreement.status === "accepted",
    documentHash: typeof agreement.document_hash === "string" ? agreement.document_hash : null,
    agreementHtml: typeof agreement.html === "string" ? agreement.html : null,
    providerAgreementVersion: providerAgreement.version ?? ACADEMYAU_AGREEMENT_VERSION,
    providerAgreementHash: providerAgreement.document_hash ?? ACADEMYAU_AGREEMENT_HASH,
    directDebitAccepted: directDebit.accepted === true,
    publishableKey,
    bankAuthorised: pinch.verified === true && pinch.status === "ready",
    pinchStatus: typeof pinch.status === "string" ? pinch.status : "blocked",
    salesforceStatus: typeof salesforce.status === "string" ? salesforce.status : "blocked",
    salesforceStage: salesforce.stage ?? null,
    opportunityId: salesforce.opportunity_id ?? null,
    upfrontStatus: typeof collections.upfront_status === "string" ? collections.upfront_status : null,
    upfrontAmountCents: collections.upfront_amount === 400 ? 400 : null,
    schedule: data.schedule ?? null,
    upstreamStatus: status,
  };
}

async function productionPublishableKey(url: string, fetchImpl: typeof fetch): Promise<string> {
  try {
    const response = await fetchImpl(`${url}/v1/environment`, { cache: "no-store" });
    const data = await response.json() as { pinch_publishable_key?: unknown };
    const key = typeof data.pinch_publishable_key === "string" ? data.pinch_publishable_key : "";
    return /^pk_live_[A-Za-z0-9_-]{8,80}$/.test(key) ? key : "";
  } catch {
    return "";
  }
}

export async function exchangeAcademyResume(input: {
  credential: string;
  dateOfBirth: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; enrolmentId: string; token: string; message: string }> {
  const upstream = readAcademyUpstream(input.env);
  if (!upstream.configured) {
    return { status: 409, enrolmentId: "", token: "", message: "The Australian enrolment service is not configured, so no plan was created." };
  }
  const match = /^enrol_[a-f0-9]{20}\.[A-Za-z0-9_-]{16,200}$/.exec(input.credential);
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth)) {
    return { status: 400, enrolmentId: "", token: "", message: "Invalid enrolment request." };
  }
  try {
    const response = await (input.fetchImpl ?? fetch)(`${upstream.url}/api/au/enrolments/resume-exchange`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${upstream.key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ credential: input.credential, date_of_birth: input.dateOfBirth }),
      cache: "no-store",
    });
    const data = await response.json() as Record<string, unknown>;
    if (!response.ok || data.course_path !== ACADEMY_ENROLMENT_COURSE_PATH || typeof data.enrolment_id !== "string") {
      return { status: response.ok ? 404 : response.status, enrolmentId: "", token: "", message: "This enrolment cannot be resumed." };
    }
    return {
      status: 200,
      enrolmentId: data.enrolment_id,
      token: input.credential.slice(input.credential.indexOf(".") + 1),
      message: "Enrolment resumed.",
    };
  } catch {
    return { status: 409, enrolmentId: "", token: "", message: "Enrolment could not be confirmed. You can try again." };
  }
}

export async function forwardAcademyEnrolment(input: {
  body: Record<string, unknown>;
  idempotencyKey: string;
  clientIp: string;
  userAgent: string;
  recoveryToken?: string;
  allowLiveCapture: boolean;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; body: Record<string, unknown>; recoveryToken: string }> {
  const upstream = readAcademyUpstream(input.env);
  if (!upstream.configured) {
    return {
      status: 409,
      recoveryToken: "",
      body: {
        ok: false,
        activated: false,
        enrolmentId: null,
        message: "The Australian enrolment service is not configured, so no plan was created.",
      },
    };
  }
  try {
    const response = await (input.fetchImpl ?? fetch)(`${upstream.url}/api/au/enrolments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${upstream.key}`,
        "content-type": "application/json",
        "idempotency-key": input.idempotencyKey,
        "x-original-forwarded-for": input.clientIp,
        "x-original-user-agent": input.userAgent,
        ...(input.recoveryToken ? { "x-enrolment-recovery": input.recoveryToken } : {}),
      },
      body: JSON.stringify(input.body),
      cache: "no-store",
    });
    const data = await response.json() as Record<string, unknown>;
    const recoveryToken = typeof data.recovery_token === "string" ? data.recovery_token : "";
    const body = presentAcademyEnrolment(data, response.status, input.allowLiveCapture);
    if (input.allowLiveCapture && !body.publishableKey && typeof body.enrolmentId === "string") {
      body.publishableKey = await productionPublishableKey(upstream.url, input.fetchImpl ?? fetch);
    }
    return { status: response.status, recoveryToken, body };
  } catch {
    return {
      status: 409,
      recoveryToken: "",
      body: {
        ok: false,
        activated: false,
        enrolmentId: null,
        retryable: true,
        message: "Enrolment could not be confirmed. No plan was created. You can try again.",
      },
    };
  }
}
