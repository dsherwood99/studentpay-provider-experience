import { randomUUID } from "node:crypto";
import {
  buildCanonicalCreatePayload,
  canonicalCreate,
  extractCheckoutToken,
  extractSetupUrl,
  previewCoursePlan,
} from "@/lib/nz-enrolment/canonical";
import { jsonError } from "@/lib/nz-enrolment/errors";
import { GENERIC_MAX_RECURRING_INSTALMENTS } from "@/lib/nz-enrolment/environment";
import { logNzEnrolmentEvent } from "@/lib/nz-enrolment/observability";
import { defaultFirstPaymentDate } from "@/lib/nz-enrolment/plan-math";
import {
  assertSessionTenant,
  readNzSession,
  requireNzApiBaseUrl,
  requireTenantKey,
  resolveCourseContext,
  resolveTenantContext,
  writeNzSession,
} from "@/lib/nz-enrolment/request-context";
import { getNzCourse, getNzCoursesForProvider, toPublicCourse } from "@/lib/nz-enrolment/courses";
import { toPublicTenant } from "@/lib/nz-enrolment/tenants";
import { NzSessionConfigError, publicSessionView } from "@/lib/nz-enrolment/session";
import {
  publicBaseUrl,
  sameOriginOrConfigured,
  sanitiseStudent,
  validateStudentDetails,
} from "@/lib/nz-enrolment/validation";
import type { NzPlanSelection } from "@/lib/nz-enrolment/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const providerSlug = url.searchParams.get("providerSlug")?.trim() || "";
  const courseSlug = url.searchParams.get("courseSlug")?.trim() || "";
  const resolved = resolveTenantContext(providerSlug);

  if (resolved.error || !resolved.tenant) {
    return resolved.error || jsonError(404, "PROVIDER_NOT_FOUND");
  }

  const { tenant } = resolved;
  const courses = courseSlug
    ? [getNzCourse(providerSlug, courseSlug)].filter(Boolean)
    : getNzCoursesForProvider(providerSlug);

  const session = await readNzSession();
  const mismatch = assertSessionTenant(session, providerSlug, courseSlug || undefined);
  if (mismatch) {
    return mismatch;
  }

  logNzEnrolmentEvent("checkout_started", {
    provider_slug: tenant.slug,
    course_slug: courseSlug || null,
  });

  return Response.json({
    success: true,
    tenant: toPublicTenant(tenant),
    courses: courses.map((course) => toPublicCourse(course!)),
    session: publicSessionView(
      session?.providerSlug === providerSlug ? session : null,
    ),
  });
}

type CreateBody = {
  providerSlug?: string;
  courseSlug?: string;
  student?: Parameters<typeof sanitiseStudent>[0];
  plan?: Partial<NzPlanSelection>;
  providerOrderId?: string;
};

export async function POST(request: Request) {
  if (!sameOriginOrConfigured(request)) {
    return jsonError(403, "TENANT_MISMATCH", "Invalid request origin.");
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return jsonError(400, "VALIDATION_ERROR", "Invalid JSON.");
  }

  const providerSlug = body.providerSlug?.trim() || "";
  const courseSlug = body.courseSlug?.trim() || "";
  const resolved = resolveCourseContext(providerSlug, courseSlug);
  if (resolved.error || !resolved.tenant || !resolved.course) {
    return resolved.error || jsonError(404, "PROVIDER_NOT_FOUND");
  }

  const apiBase = requireNzApiBaseUrl();
  if ("error" in apiBase) {
    return apiBase.error;
  }

  const { tenant, course } = resolved;
  const existing = await readNzSession();
  const mismatch = assertSessionTenant(existing, providerSlug, courseSlug);
  if (mismatch) {
    return mismatch;
  }

  const key = requireTenantKey(tenant);
  if (key.error || !key.apiKey) {
    logNzEnrolmentEvent("checkout_failed", {
      provider_slug: tenant.slug,
      reason: "not_configured",
    });
    return key.error;
  }

  if (body.plan?.paymentOption === "pay_in_full") {
    return jsonError(400, "PAY_IN_FULL_UNAVAILABLE");
  }

  const student = sanitiseStudent(body.student || {});
  const studentErrors = validateStudentDetails(student);
  if (Object.keys(studentErrors).length > 0) {
    return jsonError(400, "INVALID_STUDENT", undefined, {
      invalid_fields: studentErrors,
    });
  }

  const plan: NzPlanSelection = {
    paymentOption: "interest_free_payment_plan",
    upfrontAmountCents:
      course.planPolicy.mode === "derived_regular"
        ? course.planPolicy.upfrontAmountCents
        : (body.plan?.upfrontAmountCents ?? course.planPolicy.upfrontAmountCents),
    frequency:
      course.planPolicy.mode === "derived_regular"
        ? course.planPolicy.frequency
        : body.plan?.frequency || course.planPolicy.frequency,
    numberOfInstalments:
      course.planPolicy.mode === "student_selected_equal"
        ? (body.plan?.numberOfInstalments ?? course.planPolicy.numberOfInstalments)
        : undefined,
    regularInstalmentCents:
      course.planPolicy.mode === "derived_regular"
        ? course.planPolicy.regularInstalmentCents
        : undefined,
    firstPaymentDate: body.plan?.firstPaymentDate || defaultFirstPaymentDate(),
  };

  if (course.planPolicy.mode === "student_selected_equal") {
    const count = plan.numberOfInstalments || 0;
    const min = tenant.checkout.minInstalments ?? 1;
    const max = tenant.checkout.maxInstalments ?? GENERIC_MAX_RECURRING_INSTALMENTS;
    if (count < min || count > max) {
      return jsonError(400, "VALIDATION_ERROR", "Instalment count is outside the allowed range.");
    }
    if (!tenant.checkout.availableFrequencies.includes(plan.frequency)) {
      return jsonError(400, "VALIDATION_ERROR", "That payment frequency is not available.");
    }
  }

  let preview;
  try {
    preview = previewCoursePlan(course, plan);
  } catch (error) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      error instanceof Error ? error.message : "Invalid payment plan.",
    );
  }

  const providerOrderId =
    (existing?.providerSlug === providerSlug && existing.providerOrderId) ||
    body.providerOrderId?.trim() ||
    `HOSTED-${tenant.providerCode}-${randomUUID()}`;

  const origin = publicBaseUrl(request);
  const returnPath = `/enrol/${tenant.slug}/${course.slug}`;
  const payload = buildCanonicalCreatePayload({
    tenant,
    course,
    student,
    plan: { ...plan, firstPaymentDate: preview.firstPaymentDate },
    providerOrderId,
    successUrl: `${origin}${returnPath}?dda=return`,
    cancelUrl: `${origin}${returnPath}?dda=cancelled`,
  });

  logNzEnrolmentEvent("student_details_completed", {
    provider_slug: tenant.slug,
    course_code: course.courseCode,
  });
  logNzEnrolmentEvent("plan_selected", {
    provider_slug: tenant.slug,
    frequency: preview.frequency,
    instalments: preview.numberOfInstalments,
    residual: preview.hasResidualFinal,
  });

  const upstream = await canonicalCreate({
    apiBaseUrl: apiBase.url,
    apiKey: key.apiKey,
    payload,
    idempotencyKey: providerOrderId,
  });

  if (!upstream.body.success) {
    logNzEnrolmentEvent("checkout_failed", {
      provider_slug: tenant.slug,
      request_id: upstream.body.requestId || null,
      http_status: upstream.httpStatus,
      error_code: upstream.body.error?.code || null,
    });
    return jsonError(
      upstream.httpStatus || 502,
      upstream.body.error?.code || "VALIDATION_ERROR",
      upstream.body.error?.message,
      {
        request_id: upstream.body.requestId,
        invalid_fields: upstream.body.error?.invalid_fields,
      },
    );
  }

  const checkoutToken = extractCheckoutToken(upstream.body);
  const setupUrl = extractSetupUrl(upstream.body);
  const checkoutId = upstream.body.checkout?.checkout_id || "";

  try {
    await writeNzSession({
      providerSlug: tenant.slug,
      courseSlug: course.slug,
      providerOrderId,
      checkoutId,
      opportunityId: upstream.body.records?.opportunity_id,
      ddaId: upstream.body.records?.dda_id || upstream.body.direct_debit?.dda_id,
      checkoutToken,
      setupUrl,
      student,
      plan,
    });
  } catch (error) {
    if (error instanceof NzSessionConfigError) {
      return jsonError(503, "SESSION_NOT_CONFIGURED");
    }
    throw error;
  }

  logNzEnrolmentEvent("checkout_created", {
    provider_slug: tenant.slug,
    provider_order_id: providerOrderId,
    checkout_id: checkoutId,
    idempotent_replay: Boolean(
      upstream.body.idempotent_replay || upstream.body.idempotentReplay,
    ),
    request_id: upstream.body.requestId || null,
  });
  logNzEnrolmentEvent("dda_started", {
    provider_slug: tenant.slug,
    checkout_id: checkoutId,
  });

  return Response.json({
    success: true,
    idempotent_replay: Boolean(
      upstream.body.idempotent_replay || upstream.body.idempotentReplay,
    ),
    checkout: {
      checkout_id: checkoutId,
      status: upstream.body.checkout?.status,
      requires_direct_debit: upstream.body.checkout?.requires_direct_debit,
    },
    direct_debit: {
      setup_url: setupUrl,
      setup_complete: Boolean(upstream.body.direct_debit?.setup_complete),
    },
    plan: preview,
    session: publicSessionView({
      providerSlug: tenant.slug,
      courseSlug: course.slug,
      providerOrderId,
      checkoutId,
      setupUrl,
    }),
  });
}
