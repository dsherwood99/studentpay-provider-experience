import {
  BELA_COURSE,
  buildCreateCheckoutPayload,
  validateStudentInput,
} from "@/lib/bela-beauty/course";
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

function requestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host =
    (forwardedHost ? forwardedHost.split(",")[0].trim() : null) ||
    request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || "https";

  if (host) {
    return `${proto}://${host}`;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

/**
 * POST /api/demos/bela-beauty/checkout
 *
 * Browser-safe proxy: builds the Bela NZ payload and creates a Provider
 * Checkout on the StudentPay NZ sandbox. Direct-debit setup URLs stay on the
 * NZ API host (JWT + GoCardless), while success/cancel return to this app.
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

  const student = (body.student || {}) as Parameters<
    typeof validateStudentInput
  >[0];
  const studentCheck = validateStudentInput(student);

  if (!studentCheck.ok) {
    return Response.json(
      {
        success: false,
        error: {
          code: "INVALID_STUDENT",
          message: "Complete all required student fields before enrolling.",
        },
        missingFields: studentCheck.missing,
      },
      { status: 400 },
    );
  }

  const origin = requestOrigin(request);
  const built = buildCreateCheckoutPayload({
    payment_choice:
      typeof body.payment_choice === "string" ? body.payment_choice : undefined,
    student,
    provider_order_id:
      typeof body.provider_order_id === "string"
        ? body.provider_order_id
        : undefined,
    first_payment_date:
      typeof body.first_payment_date === "string"
        ? body.first_payment_date
        : undefined,
    success_url:
      (typeof body.success_url === "string" && body.success_url) ||
      `${origin}/enrol/bela-beauty/?step=bank-return`,
    cancel_url:
      (typeof body.cancel_url === "string" && body.cancel_url) ||
      `${origin}/enrol/bela-beauty/?step=cancelled`,
  });

  const providerOrderId = String(
    built.payload.provider.provider_order_id || "",
  );

  try {
    const upstreamResponse = await fetch(config.checkoutUrl, {
      method: "POST",
      headers: {
        ...belaNzAuthHeaders(config.apiKey),
        "Idempotency-Key": providerOrderId,
      },
      body: JSON.stringify(built.payload),
      cache: "no-store",
    });

    const upstreamJson = await parseUpstreamJson(upstreamResponse);

    if (!upstreamResponse.ok || upstreamJson.success === false) {
      return Response.json(
        {
          success: false,
          error:
            upstreamJson.error ||
            formatBelaError(upstreamJson, "Checkout create failed"),
          missing_fields: upstreamJson.missing_fields,
          invalid_fields: upstreamJson.invalid_fields,
          missingFields: upstreamJson.missing_fields,
          invalidFields: upstreamJson.invalid_fields,
          upstream_status: upstreamResponse.status,
        },
        { status: upstreamResponse.status || 502 },
      );
    }

    // Normalise checkout_token for agreement iframe + confirm
    // (NZ create may return the JWT as direct_debit.token).
    const responseBody: Record<string, unknown> = { ...upstreamJson };
    const checkout =
      responseBody.checkout && typeof responseBody.checkout === "object"
        ? { ...(responseBody.checkout as Record<string, unknown>) }
        : {};
    const directDebit =
      responseBody.direct_debit && typeof responseBody.direct_debit === "object"
        ? { ...(responseBody.direct_debit as Record<string, unknown>) }
        : {};

    const token =
      (typeof checkout.checkout_token === "string" && checkout.checkout_token) ||
      (typeof directDebit.token === "string" && directDebit.token) ||
      null;

    if (token) {
      checkout.checkout_token = token;
      responseBody.checkout = checkout;
    }

    // Intentionally keep setup_url on the NZ API host — PE does not host
    // /dda-setup or JWT verification for BELA_NZ.

    return Response.json({
      ...responseBody,
      success: true,
      demo: {
        provider: BELA_COURSE.provider_name,
        course_name: BELA_COURSE.course_name,
        payment_choice: built.payment_choice,
        currency: BELA_COURSE.currency,
        sandbox: true,
        api: "StudentPay NZ Provider Checkout v1",
        hosted_on: "studentpay-provider-experience",
        legal_base: config.legalBaseUrl,
      },
    });
  } catch (error) {
    return jsonError(
      502,
      "BELA_DEMO_CHECKOUT_FAILED",
      formatBelaError(
        error,
        "Unable to create the sandbox enrolment checkout right now.",
      ),
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
