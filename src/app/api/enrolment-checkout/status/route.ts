import { canonicalGet } from "@/lib/nz-enrolment/canonical";
import { jsonError } from "@/lib/nz-enrolment/errors";
import { logNzEnrolmentEvent } from "@/lib/nz-enrolment/observability";
import {
  authoritativePayInFullPriceCents,
  hostedStripePublishableKeyIsSafe,
  publicCardPayment,
} from "@/lib/nz-enrolment/pay-in-full";
import { isPayInFullOption } from "@/lib/nz-enrolment/pay-in-full-flow";
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

  const payInFull =
    isPayInFullOption(session.paymentOption || session.plan?.paymentOption) ||
    upstream.body.payment_option === "pay_in_full";

  if (!payInFull) {
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
      paymentOption: "interest_free_payment_plan",
    });

    return Response.json({
      success: true,
      payment_option: "payment_plan",
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

  const publishableKey = upstream.body.card_payment?.publishable_key || null;
  if (publishableKey && !hostedStripePublishableKeyIsSafe(publishableKey)) {
    return jsonError(503, "STRIPE_TEST_KEY_REQUIRED");
  }

  const stripeStatus = upstream.body.card_payment?.stripe_status || null;
  if (stripeStatus === "processing") {
    logNzEnrolmentEvent("pay_in_full_payment_processing", {
      provider_slug: session.providerSlug,
      checkout_id: session.checkoutId,
    });
  }

  const authoritativePriceCents = authoritativePayInFullPriceCents({
    catalogueCents:
      session.authoritativePriceCents ||
      resolved.course?.paymentInFullCourseFeeCents ||
      0,
    serverCoursePrice: upstream.body.pricing?.course_price ?? upstream.body.card_payment?.amount,
  });

  await writeNzSession({
    ...session,
    opportunityId:
      upstream.body.records?.opportunity_id || session.opportunityId,
    paymentOption: "pay_in_full",
    authoritativePriceCents,
    ddaId: undefined,
    setupUrl: undefined,
  });

  return Response.json({
    success: true,
    payment_option: "pay_in_full",
    checkout: {
      checkout_id: session.checkoutId,
      opportunity_id: upstream.body.records?.opportunity_id || session.opportunityId || null,
      status: upstream.body.checkout?.status,
    },
    pricing: {
      course_price: upstream.body.pricing?.course_price ?? null,
      amount_paid: upstream.body.pricing?.amount_paid ?? null,
      remaining_amount: upstream.body.pricing?.remaining_amount ?? null,
      currency: upstream.body.pricing?.currency || "NZD",
    },
    card_payment: publicCardPayment(upstream.body.card_payment),
    direct_debit: {
      required: false,
      setup_complete: false,
      dda_id: null,
      setup_url: null,
    },
    plan: null,
    session: publicSessionView({
      ...session,
      paymentOption: "pay_in_full",
    }),
  });
}
