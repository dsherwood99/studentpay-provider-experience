import { canonicalGet } from "@/lib/nz-enrolment/canonical";
import { jsonError } from "@/lib/nz-enrolment/errors";
import { logNzEnrolmentEvent } from "@/lib/nz-enrolment/observability";
import {
  readNzSession,
  requireNzApiBaseUrl,
  requireTenantKey,
  resolveCourseContext,
  writeNzSession,
} from "@/lib/nz-enrolment/request-context";
import { publicSessionView } from "@/lib/nz-enrolment/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await readNzSession();
  if (!session?.checkoutId || !session.providerSlug || !session.courseSlug) {
    return jsonError(404, "SESSION_EXPIRED");
  }

  const resolved = resolveCourseContext(session.providerSlug, session.courseSlug);
  if (resolved.error || !resolved.tenant) {
    return resolved.error || jsonError(404, "PROVIDER_NOT_FOUND");
  }

  const key = requireTenantKey(resolved.tenant);
  if (key.error || !key.apiKey) {
    return key.error;
  }

  const apiBase = requireNzApiBaseUrl();
  if ("error" in apiBase) {
    return apiBase.error;
  }

  const upstream = await canonicalGet({
    apiBaseUrl: apiBase.url,
    apiKey: key.apiKey,
    checkoutId: session.checkoutId,
  });

  if (!upstream.body.success) {
    logNzEnrolmentEvent("checkout_failed", {
      provider_slug: session.providerSlug,
      checkout_id: session.checkoutId,
      error_code: upstream.body.error?.code || null,
      http_status: upstream.httpStatus,
    });
    return jsonError(
      upstream.httpStatus || 502,
      upstream.body.error?.code || "CHECKOUT_NOT_FOUND",
      upstream.body.error?.message,
      { request_id: upstream.body.requestId },
    );
  }

  const setupComplete = Boolean(upstream.body.direct_debit?.setup_complete);
  if (setupComplete) {
    logNzEnrolmentEvent("dda_completed", {
      provider_slug: session.providerSlug,
      checkout_id: session.checkoutId,
      mandate_status: upstream.body.direct_debit?.mandate_status || null,
    });
  }

  await writeNzSession({
    ...session,
    opportunityId:
      upstream.body.records?.opportunity_id || session.opportunityId,
    ddaId:
      upstream.body.direct_debit?.dda_id ||
      upstream.body.records?.dda_id ||
      session.ddaId,
    setupUrl:
      upstream.body.direct_debit?.setup_url ||
      upstream.body.direct_debit?.redirect_url ||
      session.setupUrl,
  });

  return Response.json({
    success: true,
    checkout: {
      checkout_id: session.checkoutId,
      status: upstream.body.checkout?.status,
    },
    direct_debit: {
      setup_complete: setupComplete,
      billing_request_status: upstream.body.direct_debit?.billing_request_status || null,
      mandate_status: upstream.body.direct_debit?.mandate_status || null,
      authorised: Boolean(upstream.body.direct_debit?.authorised),
      setup_url: session.setupUrl || upstream.body.direct_debit?.setup_url || null,
    },
    session: publicSessionView(session),
  });
}
