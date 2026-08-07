import {
  academyAustralia,
  criminalPsychology,
  getCourseBySlug,
  getProviderBySlug,
} from "@/lib/provider-experience/catalogue";
import {
  buildProviderCheckoutPayload,
  getProviderExperienceConfig,
  resolveCheckoutSession,
  toEmbeddedSetupUrl,
  type ProviderCheckoutApiResult,
} from "@/lib/provider-experience/checkout";
import { createId } from "@/lib/provider-experience/format";
import type { EnrolmentFormData } from "@/types/enrolment";

export const runtime = "nodejs";

type CreateCheckoutBody = {
  providerSlug?: string;
  courseSlug?: string;
  formData?: EnrolmentFormData;
  providerOrderId?: string;
};

function jsonError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  return Response.json(
    {
      success: false,
      error: {
        code,
        message,
        ...extra,
      },
    },
    { status },
  );
}

export async function GET() {
  const config = getProviderExperienceConfig();

  return Response.json({
    success: true,
    configured: config.configured,
    mock_mode: config.mockMode,
    api_base_url: config.apiBaseUrl,
    provider_code: config.providerCode,
    provider_account_id_configured: Boolean(config.providerAccountId),
    api_key_configured: Boolean(config.apiKey),
    endpoints: {
      create_checkout: "POST /api/studentpay/provider-checkouts",
      confirm_checkout: "POST /api/studentpay/provider-checkout-confirm",
      upstream: config.checkoutUrl,
      legal_payment_plan_terms: `${config.apiBaseUrl}/api/legal/payment-plan-terms`,
    },
    courses: [
      {
        provider: academyAustralia.slug,
        course: criminalPsychology.slug,
        path: `/providers/${academyAustralia.slug}/courses/${criminalPsychology.slug}/enrol`,
      },
    ],
  });
}

export async function POST(request: Request) {
  const config = getProviderExperienceConfig();

  if (!config.configured) {
    return jsonError(
      503,
      "NOT_CONFIGURED",
      "StudentPay Provider Experience checkout is not configured. Set API credentials or leave HARNESS_MOCK_MODE=true.",
    );
  }

  let body: CreateCheckoutBody;

  try {
    body = (await request.json()) as CreateCheckoutBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be JSON.");
  }

  const { providerSlug, courseSlug, formData } = body;

  if (!providerSlug || !courseSlug || !formData) {
    return jsonError(
      400,
      "MISSING_FIELDS",
      "providerSlug, courseSlug and formData are required.",
    );
  }

  const provider = getProviderBySlug(providerSlug);

  if (!provider) {
    return jsonError(404, "PROVIDER_NOT_FOUND", "Provider not found.");
  }

  const course = getCourseBySlug(provider.code, courseSlug);

  if (!course) {
    return jsonError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  if (!formData.sscPassed) {
    return jsonError(
      400,
      "SSC_REQUIRED",
      "The Study Skills Check must be passed before creating a checkout.",
    );
  }

  if (!formData.depositConfirmed) {
    return jsonError(
      400,
      "DEPOSIT_REQUIRED",
      "The provider deposit must be confirmed before creating a checkout.",
    );
  }

  if (formData.paymentOption !== "plan") {
    return jsonError(
      400,
      "PLAN_REQUIRED",
      "Only the StudentPay payment plan path creates a Provider Checkout session.",
    );
  }

  const providerOrderId =
    body.providerOrderId || createId(`AA-${course.code}`);

  const payload = buildProviderCheckoutPayload({
    provider,
    course,
    formData,
    providerOrderId,
  });

  if (config.mockMode) {
    const mockRedirect = `https://sandbox-api.studentpay.com.au/dda-setup?token=mock_${providerOrderId}&embed=1`;

    return Response.json({
      success: true,
      mock: true,
      provider_order_id: providerOrderId,
      setup_url: mockRedirect,
      redirect_url: mockRedirect,
      checkout_token: `mock_token_${providerOrderId}`,
      opportunity_id: `mock_opp_${providerOrderId}`,
      dda_id: `mock_dda_${providerOrderId}`,
      checkout_id: `mock_checkout_${providerOrderId}`,
      checkout: {
        checkout_token: `mock_token_${providerOrderId}`,
        opportunity_id: `mock_opp_${providerOrderId}`,
        dda_id: `mock_dda_${providerOrderId}`,
        checkout_id: `mock_checkout_${providerOrderId}`,
        redirect_url: mockRedirect,
      },
      payload,
    });
  }

  try {
    const upstreamResponse = await fetch(config.checkoutUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "Idempotency-Key": providerOrderId,
        "x-api-key": config.apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const upstreamJson =
      (await upstreamResponse.json()) as ProviderCheckoutApiResult;

    if (!upstreamResponse.ok || upstreamJson.success === false) {
      const message =
        typeof upstreamJson.error === "string"
          ? upstreamJson.error
          : "Unable to create StudentPay Provider Experience checkout.";

      return jsonError(
        upstreamResponse.status || 502,
        "CHECKOUT_FAILED",
        message,
        {
          provider_order_id: providerOrderId,
          upstream: upstreamJson,
        },
      );
    }

    try {
      const session = resolveCheckoutSession(upstreamJson, providerOrderId);

      return Response.json({
        success: true,
        provider_order_id: providerOrderId,
        setup_url: toEmbeddedSetupUrl(session.redirectUrl),
        redirect_url: session.redirectUrl,
        checkout_token: session.checkoutToken,
        opportunity_id: session.opportunityId,
        dda_id: session.ddaId,
        checkout_id: session.checkoutId,
        checkout: {
          checkout_token: session.checkoutToken,
          opportunity_id: session.opportunityId,
          dda_id: session.ddaId,
          checkout_id: session.checkoutId,
          redirect_url: session.redirectUrl,
        },
      });
    } catch (error) {
      return jsonError(
        502,
        "MISSING_CHECKOUT_IDENTIFIERS",
        error instanceof Error
          ? error.message
          : "Checkout was created but required identifiers were missing.",
        {
          provider_order_id: providerOrderId,
          upstream: upstreamJson,
        },
      );
    }
  } catch (error) {
    return jsonError(
      502,
      "UPSTREAM_ERROR",
      error instanceof Error
        ? error.message
        : "Failed to reach StudentPay Provider Checkout API.",
      {
        provider_order_id: providerOrderId,
      },
    );
  }
}
