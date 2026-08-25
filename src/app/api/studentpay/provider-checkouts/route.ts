import {
  academyAustralia,
  criminalPsychology,
  getCourseBySlug,
  getProviderBySlug,
  isCatalogueProvider,
} from "@/lib/provider-experience/catalogue";
import {
  buildCatalogueCheckoutPayload,
  getProviderCheckoutBinding,
  type CatalogueStudentDetails,
} from "@/lib/provider-experience/catalogue-checkout";
import { getCatalogueCourse } from "@/lib/provider-experience/catalogue-server";
import {
  buildProviderCheckoutPayload,
  formatApiError,
  getProviderExperienceConfig,
  isAcademyProductionDemo,
  resolveCheckoutSession,
  toEmbeddedSetupUrl,
  type ProviderCheckoutApiResult,
} from "@/lib/provider-experience/checkout";
import { createId } from "@/lib/provider-experience/format";
import type { EnrolmentFormData } from "@/types/enrolment";
import { isProviderSlugBlockedByDeployment } from "@/lib/provider-experience/provider-bindings";

export const runtime = "nodejs";

type CreateCheckoutBody = {
  providerSlug?: string;
  courseSlug?: string;
  formData?: EnrolmentFormData;
  catalogueStudent?: CatalogueStudentDetails;
  providerOrderId?: string;
  cardPayment?: {
    token?: string;
    amount_to_charge_now?: number;
    payment_purpose?: "card" | "deposit";
  };
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

async function createCatalogueCheckout({
  provider,
  courseSlug,
  catalogueStudent,
  providerOrderId: requestedOrderId,
}: {
  provider: Provider;
  courseSlug: string;
  catalogueStudent?: CatalogueStudentDetails;
  providerOrderId?: string;
}) {
  if (
    !catalogueStudent?.firstName?.trim() ||
    !catalogueStudent.lastName?.trim() ||
    !catalogueStudent.email?.trim()
  ) {
    return jsonError(
      400,
      "MISSING_FIELDS",
      "Student first name, last name and email are required.",
    );
  }

  const courseLoad = await getCatalogueCourse(provider, courseSlug);

  if (courseLoad.status === "unavailable") {
    return jsonError(503, courseLoad.code, courseLoad.message);
  }

  if (courseLoad.status !== "ready") {
    return jsonError(
      404,
      "COURSE_NOT_FOUND",
      "Course not found for this provider.",
    );
  }

  const course = courseLoad.course;
  const binding = getProviderCheckoutBinding(provider.code);

  if (!binding?.apiKey) {
    return jsonError(
      503,
      "NOT_CONFIGURED",
      "Catalogue checkout is not configured for this provider.",
    );
  }

  const providerOrderId =
    requestedOrderId || createId(`${provider.code}-${course.code}`);
  // Commercial fields from the browser are ignored. The payload identifies
  // the course by code; dummy prices prove the API overlay is authoritative.
  const payload = buildCatalogueCheckoutPayload({
    provider,
    course,
    student: catalogueStudent,
    providerOrderId,
    binding,
  });

  try {
    const upstreamResponse = await fetch(
      `${binding.apiBaseUrl}/v1/provider-checkouts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${binding.apiKey}`,
          "Idempotency-Key": providerOrderId,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );

    const rawBody = await upstreamResponse.text();
    let upstreamJson: ProviderCheckoutApiResult;

    try {
      upstreamJson = JSON.parse(rawBody) as ProviderCheckoutApiResult;
    } catch {
      return jsonError(
        502,
        "UPSTREAM_ERROR",
        "Catalogue checkout API did not return JSON.",
        {
          provider_order_id: providerOrderId,
          upstream_status: upstreamResponse.status,
        },
      );
    }

    if (!upstreamResponse.ok || upstreamJson.success === false) {
      const message = formatApiError(
        upstreamJson.error || upstreamJson,
        "Unable to create catalogue checkout.",
      );

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

    const opportunityId =
      upstreamJson.opportunity_id ||
      upstreamJson.records?.opportunity_id ||
      upstreamJson.checkout?.opportunity_id ||
      "";
    const checkoutId =
      upstreamJson.checkout_id ||
      upstreamJson.checkout?.checkout_id ||
      "";
    const contactId = upstreamJson.records?.contact_id || "";
    const checkoutToken =
      upstreamJson.direct_debit?.token ||
      upstreamJson.checkout_token ||
      upstreamJson.checkout?.checkout_token ||
      "";

    if (!checkoutToken) {
      return jsonError(
        502,
        "MISSING_CHECKOUT_TOKEN",
        "Checkout was created but no agreement token was returned.",
        {
          provider_order_id: providerOrderId,
          checkout_id: checkoutId,
          opportunity_id: opportunityId,
        },
      );
    }

    return Response.json({
      success: true,
      provider_order_id: providerOrderId,
      checkout_id: checkoutId,
      opportunity_id: opportunityId,
      contact_id: contactId,
      checkout_token: checkoutToken,
      status: "agreements_required",
      student_agreement: upstreamJson.student_agreement || null,
      payment_plan_agreement: upstreamJson.payment_plan_agreement || null,
      commercial: upstreamJson.commercial || null,
    });
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

async function resolvePinchPublishableKey(
  config: ReturnType<typeof getProviderExperienceConfig>,
): Promise<string> {
  if (config.pinchPublishableKey) {
    return config.pinchPublishableKey;
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/v1/environment`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return "";
    }

    const data = (await response.json()) as {
      pinch_publishable_key?: string | null;
    };

    return data.pinch_publishable_key?.trim() || "";
  } catch {
    return "";
  }
}

export async function GET() {
  const config = getProviderExperienceConfig();
  const pinchPublishableKey = await resolvePinchPublishableKey(config);
  const academyProductionDemo = isAcademyProductionDemo();

  return Response.json({
    success: true,
    configured: config.configured,
    mock_mode: config.mockMode,
    academy_production_demo: academyProductionDemo,
    api_base_url: config.apiBaseUrl,
    provider_code: config.providerCode,
    provider_account_id_configured: Boolean(config.providerAccountId),
    api_key_configured: Boolean(config.apiKey),
    pinch_publishable_key_configured: Boolean(pinchPublishableKey),
    // Publishable by design — used by Capture.js in the browser.
    pinch_publishable_key: pinchPublishableKey || null,
    endpoints: {
      create_checkout: "POST /api/studentpay/provider-checkouts",
      confirm_checkout: "POST /api/studentpay/provider-checkout-confirm",
      upstream: config.checkoutUrl,
      upstream_confirm: config.confirmUrl,
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
  let body: CreateCheckoutBody;

  try {
    body = (await request.json()) as CreateCheckoutBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be JSON.");
  }

  const { providerSlug, courseSlug, formData, catalogueStudent } = body;
  const academyProductionDemo = isAcademyProductionDemo();

  if (
    academyProductionDemo &&
    providerSlug &&
    providerSlug !== academyAustralia.slug
  ) {
    return jsonError(
      403,
      "PROVIDER_NOT_ALLOWED",
      "This Academy Australia production demo is bound to Academy Australia only.",
    );
  }

  if (providerSlug && isProviderSlugBlockedByDeployment(providerSlug)) {
    return jsonError(
      403,
      "PROVIDER_NOT_ALLOWED",
      "This deployment is bound to a different provider.",
    );
  }

  if (!providerSlug || !courseSlug) {
    return jsonError(
      400,
      "MISSING_FIELDS",
      "providerSlug and courseSlug are required.",
    );
  }

  const provider = getProviderBySlug(providerSlug);

  if (!provider) {
    return jsonError(404, "PROVIDER_NOT_FOUND", "Provider not found.");
  }

  if (isCatalogueProvider(provider)) {
    return createCatalogueCheckout({
      provider,
      courseSlug,
      catalogueStudent,
      providerOrderId: body.providerOrderId,
    });
  }

  if (!formData) {
    return jsonError(
      400,
      "MISSING_FIELDS",
      "providerSlug, courseSlug and formData are required.",
    );
  }

  const config = getProviderExperienceConfig();

  if (!config.configured) {
    return jsonError(
      503,
      "NOT_CONFIGURED",
      "StudentPay Provider Experience checkout is not configured. Set API credentials or leave HARNESS_MOCK_MODE=true.",
    );
  }

  const course = getCourseBySlug(provider.code, courseSlug);

  if (!course) {
    return jsonError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  const isPlan = formData.paymentOption === "plan";
  const isPayNow = formData.paymentOption === "full";
  const cardToken = body.cardPayment?.token?.trim() || "";

  if (!isPlan && !isPayNow) {
    return jsonError(
      400,
      "UNSUPPORTED_PAYMENT_OPTION",
      "Supported payment options are plan and full (Pay Now).",
    );
  }

  if (isPayNow && !cardToken) {
    return jsonError(
      400,
      "CARD_TOKEN_REQUIRED",
      "Pay Now requires a Pinch Capture.js card_payment.token.",
    );
  }

  if (!formData.sscPassed) {
    return jsonError(
      400,
      "SSC_REQUIRED",
      "The Study Skills Check must be passed before creating a checkout.",
    );
  }

  if (isPlan && !formData.depositConfirmed) {
    return jsonError(
      400,
      "DEPOSIT_REQUIRED",
      "The provider deposit must be confirmed before creating a checkout.",
    );
  }

  const providerOrderId =
    body.providerOrderId || createId(`AA-${course.code}`);

  const amountToCharge = isPayNow
    ? Number(body.cardPayment?.amount_to_charge_now ?? course.paymentPlan.totalFee)
    : Number(body.cardPayment?.amount_to_charge_now || 0);

  const payload = buildProviderCheckoutPayload({
    provider,
    course,
    formData: {
      ...formData,
      // Pay Now does not use the provider deposit simulation checkbox.
      depositConfirmed: isPlan ? formData.depositConfirmed : true,
    },
    providerOrderId,
    cardPayment: cardToken
      ? {
          token: cardToken,
          amount_to_charge_now: amountToCharge,
          payment_purpose: body.cardPayment?.payment_purpose || "card",
        }
      : undefined,
  });

  if (config.mockMode) {
    if (isPayNow) {
      return Response.json({
        success: true,
        mock: true,
        provider_order_id: providerOrderId,
        opportunity_id: `mock_opp_${providerOrderId}`,
        checkout_id: `mock_checkout_${providerOrderId}`,
        checkout_token: `mock_token_${providerOrderId}`,
        card_payment: {
          required: true,
          success: true,
          payer_id: `mock_payer_${providerOrderId}`,
          payment_id: `mock_pay_${providerOrderId}`,
          payment_status: "scheduled",
          amount: amountToCharge,
        },
        checkout: {
          payment_type: "upfront_payment",
          requires_direct_debit: false,
          checkout_id: `mock_checkout_${providerOrderId}`,
          checkout_token: `mock_token_${providerOrderId}`,
          opportunity_id: `mock_opp_${providerOrderId}`,
          status: "payment_processing",
        },
        payload,
      });
    }

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

    if (isPayNow) {
      const cardPayment = upstreamJson.card_payment;
      const opportunityId =
        upstreamJson.opportunity_id ||
        upstreamJson.records?.opportunity_id ||
        upstreamJson.checkout?.opportunity_id ||
        "";
      const checkoutId =
        upstreamJson.checkout_id || upstreamJson.checkout?.checkout_id || "";

      if (cardPayment && cardPayment.success === false) {
        return jsonError(
          502,
          "CARD_PAYMENT_FAILED",
          "StudentPay created the checkout but the card payment did not succeed.",
          {
            provider_order_id: providerOrderId,
            upstream: upstreamJson,
          },
        );
      }

      if (cardToken && cardPayment?.required && !cardPayment.success) {
        return jsonError(
          502,
          "CARD_PAYMENT_FAILED",
          "Card token was sent but StudentPay did not report a successful charge.",
          {
            provider_order_id: providerOrderId,
            upstream: upstreamJson,
          },
        );
      }

      return Response.json({
        success: true,
        provider_order_id: providerOrderId,
        opportunity_id: opportunityId,
        checkout_id: checkoutId,
        checkout_token:
          upstreamJson.checkout_token ||
          upstreamJson.checkout?.checkout_token ||
          "",
        card_payment: cardPayment || {
          required: true,
          success: true,
          amount: amountToCharge,
        },
        checkout: {
          payment_type: "upfront_payment",
          requires_direct_debit: false,
          checkout_id: checkoutId,
          opportunity_id: opportunityId,
          status:
            upstreamJson.checkout?.status || "payment_processing",
        },
      });
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
