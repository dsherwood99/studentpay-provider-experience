import {
  buildCanonicalConfirmPayload,
  canonicalConfirm,
} from "@/lib/nz-enrolment/canonical";
import { jsonError } from "@/lib/nz-enrolment/errors";
import { logNzEnrolmentEvent } from "@/lib/nz-enrolment/observability";
import {
  readNzSession,
  requireTenantKey,
  resolveCourseContext,
  writeNzSession,
} from "@/lib/nz-enrolment/request-context";
import { sameOriginOrConfigured } from "@/lib/nz-enrolment/validation";

export const runtime = "nodejs";

type ConfirmBody = {
  declarations?: {
    payment_plan_accepted?: boolean;
    information_confirmed?: boolean;
    privacy_consent_accepted?: boolean;
  };
};

export async function POST(request: Request) {
  if (!sameOriginOrConfigured(request)) {
    return jsonError(403, "TENANT_MISMATCH", "Invalid request origin.");
  }

  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return jsonError(400, "VALIDATION_ERROR", "Invalid JSON.");
  }

  const declarations = {
    payment_plan_accepted: Boolean(body.declarations?.payment_plan_accepted),
    information_confirmed: Boolean(body.declarations?.information_confirmed),
    privacy_consent_accepted: Boolean(body.declarations?.privacy_consent_accepted),
  };

  if (
    !declarations.payment_plan_accepted ||
    !declarations.information_confirmed ||
    !declarations.privacy_consent_accepted
  ) {
    return jsonError(400, "DECLARATIONS_REQUIRED");
  }

  const session = await readNzSession();
  if (
    !session?.checkoutId ||
    !session.checkoutToken ||
    !session.opportunityId ||
    !session.ddaId
  ) {
    return jsonError(409, "SESSION_EXPIRED");
  }

  const resolved = resolveCourseContext(session.providerSlug, session.courseSlug);
  if (resolved.error || !resolved.tenant) {
    return resolved.error || jsonError(404, "PROVIDER_NOT_FOUND");
  }

  const key = requireTenantKey(resolved.tenant);
  if (key.error || !key.apiKey) {
    return key.error;
  }

  logNzEnrolmentEvent("confirm_started", {
    provider_slug: session.providerSlug,
    checkout_id: session.checkoutId,
  });

  const payload = buildCanonicalConfirmPayload({
    tenant: resolved.tenant,
    providerOrderId: session.providerOrderId,
    checkoutId: session.checkoutId,
    checkoutToken: session.checkoutToken,
    opportunityId: session.opportunityId,
    ddaId: session.ddaId,
    firstPaymentDate: session.plan?.firstPaymentDate || "",
    declarations,
  });

  const upstream = await canonicalConfirm({
    apiBaseUrl: resolved.tenant.apiBaseUrl,
    apiKey: key.apiKey,
    checkoutId: session.checkoutId,
    payload,
  });

  if (!upstream.body.success) {
    logNzEnrolmentEvent("checkout_failed", {
      provider_slug: session.providerSlug,
      checkout_id: session.checkoutId,
      error_code: upstream.body.error?.code || null,
      http_status: upstream.httpStatus,
      request_id: upstream.body.requestId || null,
    });
    return jsonError(
      upstream.httpStatus || 502,
      upstream.body.error?.code || "VALIDATION_ERROR",
      upstream.body.error?.message,
      { request_id: upstream.body.requestId },
    );
  }

  await writeNzSession(session);

  logNzEnrolmentEvent("checkout_confirmed", {
    provider_slug: session.providerSlug,
    checkout_id: session.checkoutId,
    already_confirmed: Boolean(
      upstream.body.already_confirmed || upstream.body.alreadyConfirmed,
    ),
    agreement_number: upstream.body.agreement?.number || null,
  });

  return Response.json({
    success: true,
    already_confirmed: Boolean(
      upstream.body.already_confirmed || upstream.body.alreadyConfirmed,
    ),
    checkout: {
      checkout_id: session.checkoutId,
      status: upstream.body.checkout?.status || "confirmed",
    },
    enrolment: {
      status: upstream.body.enrolment?.status || "complete",
    },
    agreement: {
      number: upstream.body.agreement?.number || null,
      pdf_generated: Boolean(upstream.body.agreement?.pdf_generated),
    },
  });
}
