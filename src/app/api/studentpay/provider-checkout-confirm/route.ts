import {
  formatApiError,
  getProviderExperienceConfig,
} from "@/lib/provider-experience/checkout";

export const runtime = "nodejs";

type ConfirmationRequest = {
  provider?: {
    provider_code?: string;
    provider_order_id?: string;
  };
  checkout?: {
    checkout_id?: string;
    checkout_token?: string;
    opportunity_id?: string;
    dda_id?: string;
  };
  payment?: {
    payment_method?: string;
    deposit_confirmed?: boolean;
    first_payment_date?: string;
  };
  declarations?: {
    payment_plan_accepted?: boolean;
    information_confirmed?: boolean;
    privacy_consent_accepted?: boolean;
  };
  confirmed_at?: string;
};

const ALLOWED_PROVIDER_CODES = new Set([
  "ACADEMY_AUSTRALIA",
  "SANDBOX_DEMO",
  "ONFIT",
  "BELA_BEAUTY_SANDBOX",
]);

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ConfirmationRequest;
    const requestedProviderCode = payload.provider?.provider_code || "";
    const config = getProviderExperienceConfig({
      providerCode: requestedProviderCode,
    });

    console.log(
      "Provider Experience confirmation payload:",
      JSON.stringify(payload, null, 2),
    );

    const providerCode = payload.provider?.provider_code || "";

    if (
      !ALLOWED_PROVIDER_CODES.has(providerCode) &&
      providerCode !== config.providerCode
    ) {
      return Response.json(
        {
          success: false,
          error: "Invalid provider code.",
        },
        { status: 400 },
      );
    }

    if (!payload.provider?.provider_order_id) {
      return Response.json(
        {
          success: false,
          error: "The provider order ID is missing.",
        },
        { status: 400 },
      );
    }

    if (
      !payload.checkout?.checkout_token ||
      !payload.checkout.opportunity_id ||
      !payload.checkout.dda_id
    ) {
      return Response.json(
        {
          success: false,
          error: "Missing StudentPay checkout identifiers.",
        },
        { status: 400 },
      );
    }

    if (!payload.payment?.deposit_confirmed) {
      return Response.json(
        {
          success: false,
          error: "The provider deposit has not been confirmed.",
        },
        { status: 400 },
      );
    }

    const declarations = payload.declarations;

    if (
      !declarations?.payment_plan_accepted ||
      !declarations.information_confirmed ||
      !declarations.privacy_consent_accepted
    ) {
      return Response.json(
        {
          success: false,
          error: "All enrolment declarations must be accepted.",
        },
        { status: 400 },
      );
    }

    if (config.mockMode) {
      return Response.json({
        success: true,
        mock: true,
        message:
          "Your enrolment and StudentPay payment plan have been confirmed.",
        provider_order_id: payload.provider.provider_order_id,
        opportunity_id: payload.checkout.opportunity_id,
        dda_id: payload.checkout.dda_id,
      });
    }

    if (!config.apiKey) {
      return Response.json(
        {
          success: false,
          error: "PROVIDER_CHECKOUT_CONFIRM_API_URL / API key is not configured.",
        },
        { status: 503 },
      );
    }

    const upstreamPayload = {
      ...payload,
      provider: {
        ...payload.provider,
        // Always use the StudentPay integration provider code (e.g. SANDBOX_DEMO),
        // not the branded catalogue code (ACADEMY_AUSTRALIA).
        provider_code: config.providerCode,
        provider_order_id: payload.provider?.provider_order_id,
      },
    };

    console.log(
      "Provider Experience confirmation upstream:",
      config.confirmUrl,
    );

    const incomingUserAgent = request.headers.get("user-agent") || "";
    const incomingForwardedFor =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "";

    const upstreamResponse = await fetch(config.confirmUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "x-api-key": config.apiKey,
        ...(incomingUserAgent
          ? { "x-original-user-agent": incomingUserAgent }
          : {}),
        ...(incomingForwardedFor
          ? { "x-forwarded-for": incomingForwardedFor }
          : {}),
      },
      body: JSON.stringify(upstreamPayload),
      cache: "no-store",
    });

    let upstreamJson: Record<string, unknown> = {};
    const upstreamText = await upstreamResponse.text();

    try {
      upstreamJson = upstreamText
        ? (JSON.parse(upstreamText) as Record<string, unknown>)
        : {};
    } catch {
      upstreamJson = {
        success: false,
        error: upstreamText || `Upstream returned HTTP ${upstreamResponse.status}`,
      };
    }

    console.log(
      "Provider Experience confirmation response:",
      JSON.stringify(upstreamJson, null, 2),
    );

    if (!upstreamResponse.ok || upstreamJson.success === false) {
      return Response.json(
        {
          success: false,
          error: formatApiError(
            upstreamJson.error ?? upstreamJson.message ?? upstreamJson,
            `The enrolment could not be confirmed (HTTP ${upstreamResponse.status}).`,
          ),
          confirm_url: config.confirmUrl,
          upstream_status: upstreamResponse.status,
          upstream: upstreamJson,
        },
        { status: upstreamResponse.status || 502 },
      );
    }

    return Response.json({
      success: true,
      message: formatApiError(
        upstreamJson.message,
        "Your enrolment and StudentPay payment plan have been confirmed.",
      ),
      ...upstreamJson,
    });
  } catch (error) {
    console.error("Provider Experience confirmation failed:", error);

    return Response.json(
      {
        success: false,
        error: formatApiError(
          error,
          "The enrolment could not be confirmed.",
        ),
      },
      { status: 500 },
    );
  }
}
