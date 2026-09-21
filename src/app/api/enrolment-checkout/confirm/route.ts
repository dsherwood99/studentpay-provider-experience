import {
  buildCanonicalConfirmPayload,
  buildPayInFullConfirmPayload,
  canonicalConfirm,
} from "@/lib/nz-enrolment/canonical";
import { jsonError } from "@/lib/nz-enrolment/errors";
import { logNzEnrolmentEvent } from "@/lib/nz-enrolment/observability";
import { isPayInFullOption, payInFullDeclarationsAccepted } from "@/lib/nz-enrolment/pay-in-full-flow";
import { providerStudentAgreementAccepted } from "@/lib/nz-enrolment/hosted-agreement";
import { isSalesforceAuthorityCourse } from "@/lib/nz-enrolment/catalogue-authority";
import {
  readNzSession,
  requireNzApiBaseUrl,
  requireTenantKey,
  resolveAuthoritativeCourseContext,
  writeNzSession,
} from "@/lib/nz-enrolment/request-context";
import { sameOriginOrConfigured } from "@/lib/nz-enrolment/validation";

export const runtime = "nodejs";

type ConfirmBody = {
  declarations?: {
    payment_plan_accepted?: boolean;
    information_confirmed?: boolean;
    privacy_consent_accepted?: boolean;
    provider_student_agreement_accepted?: boolean;
    agreements?: {
      provider_student?: {
        version?: string;
        key?: string;
        content_hash?: string;
      };
    };
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

  const session = await readNzSession();
  if (!session?.checkoutId || !session.providerSlug || !session.courseSlug) {
    return jsonError(409, "SESSION_EXPIRED");
  }

  const payInFull = isPayInFullOption(session.paymentOption || session.plan?.paymentOption);

  const resolved = await resolveAuthoritativeCourseContext(session.providerSlug, session.courseSlug);
  if (resolved.error || !resolved.tenant) {
    return resolved.error || jsonError(404, "PROVIDER_NOT_FOUND");
  }

  const declarations = {
    payment_plan_accepted: Boolean(body.declarations?.payment_plan_accepted),
    information_confirmed: Boolean(body.declarations?.information_confirmed),
    privacy_consent_accepted: Boolean(body.declarations?.privacy_consent_accepted),
    provider_student_agreement_accepted: Boolean(
      body.declarations?.provider_student_agreement_accepted,
    ),
    ...(body.declarations?.agreements
      ? { agreements: body.declarations.agreements }
      : {}),
  };

  const psaRequired = Boolean(
    resolved.course && isSalesforceAuthorityCourse(resolved.tenant, resolved.course),
  );
  const psaOk = providerStudentAgreementAccepted({
    required: psaRequired,
    accepted: declarations.provider_student_agreement_accepted,
  });

  if (payInFull) {
    if (!payInFullDeclarationsAccepted(declarations) || !psaOk) {
      return jsonError(400, "DECLARATIONS_REQUIRED");
    }
    if (!session.opportunityId && !session.checkoutId) {
      return jsonError(409, "SESSION_EXPIRED");
    }
  } else if (
    !declarations.payment_plan_accepted ||
    !declarations.information_confirmed ||
    !declarations.privacy_consent_accepted ||
    !psaOk
  ) {
    return jsonError(400, "DECLARATIONS_REQUIRED");
  }

  if (!payInFull && (!session.checkoutToken || !session.opportunityId || !session.ddaId)) {
    return jsonError(409, "SESSION_EXPIRED");
  }

  const key = requireTenantKey(resolved.tenant);
  if (key.error || !key.apiKey) {
    return key.error;
  }

  const apiBase = requireNzApiBaseUrl();
  if ("error" in apiBase) {
    return apiBase.error;
  }

  logNzEnrolmentEvent(payInFull ? "pay_in_full_payment_started" : "confirm_started", {
    provider_slug: session.providerSlug,
    checkout_id: session.checkoutId,
    payment_option: payInFull ? "pay_in_full" : "payment_plan",
  });

  const payload = payInFull
    ? buildPayInFullConfirmPayload({
        tenant: resolved.tenant,
        providerOrderId: session.providerOrderId,
        checkoutId: session.checkoutId,
        opportunityId: session.opportunityId,
        declarations: {
          information_confirmed: declarations.information_confirmed,
          privacy_consent_accepted: declarations.privacy_consent_accepted,
          provider_student_agreement_accepted:
            declarations.provider_student_agreement_accepted,
          ...(declarations.agreements
            ? { agreements: declarations.agreements }
            : {}),
        },
      })
    : buildCanonicalConfirmPayload({
        tenant: resolved.tenant,
        providerOrderId: session.providerOrderId,
        checkoutId: session.checkoutId,
        checkoutToken: session.checkoutToken || "",
        opportunityId: session.opportunityId || "",
        ddaId: session.ddaId || "",
        firstPaymentDate: session.plan?.firstPaymentDate || "",
        declarations,
      });

  const upstream = await canonicalConfirm({
    apiBaseUrl: apiBase.url,
    apiKey: key.apiKey,
    checkoutId: session.checkoutId,
    payload,
  });

  if (!upstream.body.success) {
    const code = upstream.body.error?.code || "VALIDATION_ERROR";
    if (payInFull && code === "PAYMENT_PROCESSING") {
      logNzEnrolmentEvent("pay_in_full_payment_processing", {
        provider_slug: session.providerSlug,
        checkout_id: session.checkoutId,
      });
    } else if (payInFull && code === "PAYMENT_FAILED") {
      logNzEnrolmentEvent("pay_in_full_payment_failed", {
        provider_slug: session.providerSlug,
        checkout_id: session.checkoutId,
      });
    } else {
      logNzEnrolmentEvent("checkout_failed", {
        provider_slug: session.providerSlug,
        checkout_id: session.checkoutId,
        error_code: code,
        http_status: upstream.httpStatus,
        request_id: upstream.body.requestId || null,
      });
    }
    return jsonError(
      upstream.httpStatus || 502,
      code,
      upstream.body.error?.message,
      { request_id: upstream.body.requestId },
    );
  }

  await writeNzSession(session);

  const alreadyConfirmed = Boolean(
    upstream.body.already_confirmed || upstream.body.alreadyConfirmed,
  );

  logNzEnrolmentEvent(payInFull ? "pay_in_full_confirmed" : "checkout_confirmed", {
    provider_slug: session.providerSlug,
    checkout_id: session.checkoutId,
    already_confirmed: alreadyConfirmed,
    agreement_number: payInFull ? null : upstream.body.agreement?.number || null,
    payment_option: payInFull ? "pay_in_full" : "payment_plan",
  });

  return Response.json({
    success: true,
    already_confirmed: alreadyConfirmed,
    payment_option: payInFull ? "pay_in_full" : "payment_plan",
    checkout: {
      checkout_id: session.checkoutId,
      status: upstream.body.checkout?.status || "confirmed",
    },
    enrolment: {
      status: upstream.body.enrolment?.status || "complete",
    },
    payment: payInFull
      ? {
          status: upstream.body.payment?.status || "posted",
          amount: upstream.body.payment?.amount ?? null,
          ledger_posted: Boolean(upstream.body.payment?.ledger_posted),
        }
      : undefined,
    agreement: payInFull
      ? null
      : {
          number: upstream.body.agreement?.number || null,
          pdf_generated: Boolean(upstream.body.agreement?.pdf_generated),
        },
  });
}
