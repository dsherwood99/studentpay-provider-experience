import { canonicalRecover, extractCheckoutToken, extractSetupUrl } from "@/lib/nz-enrolment/canonical";
import {
  isOliRecoverableCheckoutId,
  OLI_RECOVERY_TENANT_SLUG,
} from "@/lib/nz-enrolment/checkout-recovery";
import { jsonError } from "@/lib/nz-enrolment/errors";
import { logNzEnrolmentEvent } from "@/lib/nz-enrolment/observability";
import {
  requireNzApiBaseUrl,
  requireTenantKey,
  writeNzSession,
} from "@/lib/nz-enrolment/request-context";
import { getNzCourseByCode } from "@/lib/nz-enrolment/courses";
import { getNzTenantBySlug } from "@/lib/nz-enrolment/tenants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    checkout_id?: string;
    email?: string;
    date_of_birth?: string;
    course_code?: string;
  };
  const checkoutId = String(body.checkout_id || "").trim();
  const email = String(body.email || "").trim();
  const dateOfBirth = String(body.date_of_birth || "").trim();
  const requestedCourseCode = String(body.course_code || "").trim();

  if (!isOliRecoverableCheckoutId(checkoutId) || !email || !dateOfBirth) {
    return jsonError(401, "RECOVERY_DENIED");
  }

  const tenant = getNzTenantBySlug(OLI_RECOVERY_TENANT_SLUG);
  if (!tenant) {
    return jsonError(404, "PROVIDER_NOT_FOUND");
  }

  const key = requireTenantKey(tenant);
  if (key.error || !key.apiKey) {
    return key.error || jsonError(503, "NOT_CONFIGURED");
  }
  const apiBase = requireNzApiBaseUrl();
  if ("error" in apiBase) {
    return apiBase.error;
  }

  const upstream = await canonicalRecover({
    apiBaseUrl: apiBase.url,
    apiKey: key.apiKey,
    checkoutId,
    email,
    dateOfBirth,
    courseCode: requestedCourseCode || null,
  });

  if (!upstream.body.success) {
    logNzEnrolmentEvent("checkout_recovery_denied", {
      provider_slug: tenant.slug,
      http_status: upstream.httpStatus,
      error_code: upstream.body.error?.code || null,
    });
    const code = upstream.body.error?.code || "RECOVERY_DENIED";
    return jsonError(
      upstream.httpStatus || 401,
      code,
      upstream.body.error?.message,
    );
  }

  const courseCode = String(upstream.body.course?.course_code || requestedCourseCode || "").trim();
  const course = courseCode ? getNzCourseByCode(tenant.slug, courseCode) : undefined;
  const courseSlug = course?.slug;
  if (!courseSlug) {
    return jsonError(401, "RECOVERY_DENIED");
  }

  const checkoutToken = extractCheckoutToken(upstream.body);
  const setupUrl = extractSetupUrl(upstream.body);

  await writeNzSession({
    providerSlug: tenant.slug,
    courseSlug,
    providerOrderId:
      upstream.body.provider?.provider_order_id || checkoutId,
    checkoutId: upstream.body.checkout?.checkout_id || checkoutId,
    opportunityId: upstream.body.records?.opportunity_id,
    ddaId: upstream.body.records?.dda_id || undefined,
    checkoutToken,
    setupUrl,
    paymentOption: "interest_free_payment_plan",
  });

  logNzEnrolmentEvent("checkout_recovered", {
    provider_slug: tenant.slug,
    checkout_id: upstream.body.checkout?.checkout_id || checkoutId,
    recovery_state: upstream.body.lifecycle?.recovery_state || null,
    already_confirmed: Boolean(upstream.body.already_confirmed),
  });

  return Response.json({
    success: true,
    recovered: true,
    already_confirmed: Boolean(upstream.body.already_confirmed),
    course_slug: courseSlug,
    checkout: {
      checkout_id: upstream.body.checkout?.checkout_id || checkoutId,
      status: upstream.body.checkout?.status || null,
    },
    lifecycle: upstream.body.lifecycle || null,
    student: upstream.body.student || null,
    redirect: `/enrol/${tenant.slug}/${courseSlug}`,
  });
}
