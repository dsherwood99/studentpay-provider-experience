import { BELA_COURSE } from "@/lib/bela-beauty/course";
import {
  belaNzAuthHeaders,
  formatBelaError,
  getBelaNzConfig,
  parseUpstreamJson,
} from "@/lib/bela-beauty/nz-client";

export const runtime = "nodejs";

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

/**
 * POST /api/demos/bela-beauty/confirm
 *
 * Confirms a payment-plan enrolment after GoCardless NZ direct-debit authority,
 * proxying to the StudentPay NZ confirm handler with BELA_NZ credentials.
 */
export async function POST(request: Request) {
  const config = getBelaNzConfig();

  if (!config.configured) {
    return jsonError(
      503,
      "BELA_NZ_KEY_MISSING",
      "PROVIDER_API_KEY_BELA_NZ is not configured on this Provider Experience environment.",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be JSON.");
  }

  const checkout =
    body.checkout && typeof body.checkout === "object"
      ? (body.checkout as Record<string, unknown>)
      : {};
  const declarations =
    body.declarations && typeof body.declarations === "object"
      ? (body.declarations as Record<string, unknown>)
      : {};

  if (!declarations.payment_plan_accepted || !declarations.information_confirmed) {
    return jsonError(
      400,
      "DECLARATIONS_REQUIRED",
      "Accept the payment plan agreement and information confirmation to finish enrolment.",
    );
  }

  if (
    !checkout.checkout_token ||
    !checkout.opportunity_id ||
    !checkout.dda_id
  ) {
    return jsonError(
      400,
      "CHECKOUT_CONTEXT_REQUIRED",
      "checkout.checkout_token, checkout.opportunity_id, and checkout.dda_id are required.",
    );
  }

  const upstreamPayload = {
    provider: {
      provider_code: BELA_COURSE.provider_code,
      provider_order_id:
        (typeof body.provider_order_id === "string" && body.provider_order_id) ||
        (typeof checkout.provider_order_id === "string" &&
          checkout.provider_order_id) ||
        undefined,
    },
    checkout: {
      checkout_id: checkout.checkout_id,
      checkout_token: checkout.checkout_token,
      opportunity_id: checkout.opportunity_id,
      dda_id: checkout.dda_id,
    },
    payment: {
      payment_method: "studentpay_payment_plan",
      first_payment_date: body.first_payment_date,
      deposit_confirmed: true,
    },
    declarations: {
      payment_plan_accepted: true,
      information_confirmed: true,
      privacy_consent_accepted: true,
    },
    confirmed_at:
      (typeof body.confirmed_at === "string" && body.confirmed_at) ||
      new Date().toISOString(),
  };

  try {
    const upstreamResponse = await fetch(config.confirmUrl, {
      method: "POST",
      headers: belaNzAuthHeaders(config.apiKey),
      body: JSON.stringify(upstreamPayload),
      cache: "no-store",
    });

    const upstreamJson = await parseUpstreamJson(upstreamResponse);

    if (!upstreamResponse.ok || upstreamJson.success === false) {
      return Response.json(
        {
          success: false,
          error:
            upstreamJson.error ||
            formatBelaError(
              upstreamJson,
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
      ...upstreamJson,
      demo: {
        provider: BELA_COURSE.provider_name,
        provider_code: BELA_COURSE.provider_code,
        hosted_on: "studentpay-provider-experience",
      },
    });
  } catch (error) {
    return jsonError(
      502,
      "BELA_DEMO_CONFIRM_FAILED",
      formatBelaError(error, "Unable to confirm enrolment."),
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
