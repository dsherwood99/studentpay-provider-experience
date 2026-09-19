import type { NzCourse, NzEnrolmentPaymentOption, NzPaymentFrequency, NzTenant } from "./types.ts";
import {
  isSalesforceAuthorityCourse,
  isSandboxOverlayForceUnavailable,
} from "./catalogue-authority.ts";
import { resolveNzApiBaseUrl } from "./environment.ts";
import { getTenantApiKey } from "./secrets.ts";

export type NzApiPublicCourse = {
  provider_code?: string;
  course_code: string;
  slug?: string;
  name?: string;
  description?: string;
  category?: string | null;
  status?: string;
  enrolment_payment_options?: readonly NzEnrolmentPaymentOption[];
  payment_in_full_course_fee_cents?: number;
  payment_plan_course_fee_cents?: number;
  frequency?: NzPaymentFrequency;
  plan_mode?: string;
  regular_instalment_cents?: number;
  number_of_instalments?: number;
  upfront_amount_cents?: number;
};

export type CatalogueUnavailableReason =
  | "missing_config"
  | "fetch_error"
  | "http_error"
  | "malformed"
  | "forced_unavailable";

export type AuthoritativeHostedCourseResult =
  | { status: "ok"; course: NzCourse; source: "local" | "api" }
  | { status: "unavailable"; reason: CatalogueUnavailableReason };

const VALID_FREQUENCIES: readonly NzPaymentFrequency[] = [
  "Weekly",
  "Fortnightly",
  "Monthly",
];

function positiveCents(value: unknown): number | null {
  const cents = Number(value);
  return Number.isInteger(cents) && cents >= 0 ? cents : null;
}

function logUnavailable(reason: CatalogueUnavailableReason, courseCode?: string) {
  console.warn(
    JSON.stringify({
      event: "hosted_catalogue_unavailable",
      reason,
      course_code: courseCode || null,
    }),
  );
}

export function overlayNzCourseFromApi(
  local: NzCourse,
  api: NzApiPublicCourse | null | undefined,
): NzCourse | null {
  if (!api || local.courseCode !== api.course_code) {
    return null;
  }

  const payNow = positiveCents(api.payment_in_full_course_fee_cents);
  const plan = positiveCents(api.payment_plan_course_fee_cents);
  const regular = positiveCents(api.regular_instalment_cents);
  const upfront = positiveCents(api.upfront_amount_cents);
  const frequency = api.frequency;
  const instalmentCount = Number(api.number_of_instalments);
  const options = Array.isArray(api.enrolment_payment_options)
    ? api.enrolment_payment_options
    : null;

  if (
    payNow == null ||
    plan == null ||
    options == null ||
    options.length === 0 ||
    !frequency ||
    !VALID_FREQUENCIES.includes(frequency) ||
    regular == null ||
    upfront == null ||
    !Number.isInteger(instalmentCount) ||
    instalmentCount < 1
  ) {
    return null;
  }

  const next: NzCourse = {
    ...local,
    name: api.name || local.name,
    description: api.description || local.description,
    category: api.category || local.category,
    paymentInFullCourseFeeCents: payNow,
    paymentPlanCourseFeeCents: plan,
    enrolmentPaymentOptions: options,
  };

  if (local.planPolicy.mode === "derived_regular") {
    next.planPolicy = {
      mode: "derived_regular",
      frequency,
      regularInstalmentCents: regular,
      upfrontAmountCents: upfront,
    };
  }

  return next;
}

export async function fetchNzApiPublicCourse(input: {
  apiBaseUrl: string;
  apiKey: string;
  providerCode: string;
  courseCode: string;
  fetchImpl?: typeof fetch;
}): Promise<
  | { ok: true; course: NzApiPublicCourse }
  | { ok: false; reason: "http_error" | "malformed" }
> {
  const fetchImpl = input.fetchImpl || fetch;
  const response = await fetchImpl(
    `${input.apiBaseUrl.replace(/\/$/, "")}/v1/providers/${encodeURIComponent(input.providerCode)}/courses/${encodeURIComponent(input.courseCode)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    return { ok: false, reason: "http_error" };
  }
  let body: { course?: NzApiPublicCourse } | null = null;
  try {
    body = (await response.json()) as { course?: NzApiPublicCourse };
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!body?.course || typeof body.course !== "object") {
    return { ok: false, reason: "malformed" };
  }
  return { ok: true, course: body.course };
}

export async function resolveAuthoritativeHostedCourse(
  tenant: NzTenant,
  course: NzCourse,
  fetchImpl?: typeof fetch,
): Promise<AuthoritativeHostedCourseResult> {
  if (!isSalesforceAuthorityCourse(tenant, course)) {
    return { status: "ok", course, source: "local" };
  }
  if (isSandboxOverlayForceUnavailable()) {
    logUnavailable("forced_unavailable", course.courseCode);
    return { status: "unavailable", reason: "forced_unavailable" };
  }

  const api = resolveNzApiBaseUrl();
  const apiKey = getTenantApiKey(tenant);
  if (api.error || !api.url || !apiKey) {
    logUnavailable("missing_config", course.courseCode);
    return { status: "unavailable", reason: "missing_config" };
  }

  try {
    const remote = await fetchNzApiPublicCourse({
      apiBaseUrl: api.url,
      apiKey,
      providerCode: tenant.providerCode,
      courseCode: course.courseCode,
      fetchImpl,
    });
    if (!remote.ok) {
      logUnavailable(remote.reason, course.courseCode);
      return { status: "unavailable", reason: remote.reason };
    }
    const overlaid = overlayNzCourseFromApi(course, remote.course);
    if (!overlaid) {
      logUnavailable("malformed", course.courseCode);
      return { status: "unavailable", reason: "malformed" };
    }
    return { status: "ok", course: overlaid, source: "api" };
  } catch {
    logUnavailable("fetch_error", course.courseCode);
    return { status: "unavailable", reason: "fetch_error" };
  }
}
