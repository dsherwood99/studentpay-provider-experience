import {
  buildCheckoutPayload,
  createProviderOrderId,
  extractDirectDebitSetupUrl,
  getStudentPayConfig,
  toEmbeddedSetupUrl,
  type StudentPayCheckoutSuccess,
} from "@/lib/studentpay/checkout";
import { getCourseBySlug } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";
import type { EnrolmentFormData } from "@/types/enrolment";

export const runtime = "nodejs";

type CreateCheckoutBody = {
  providerSlug?: string;
  courseSlug?: string;
  formData?: EnrolmentFormData;
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
  const config = getStudentPayConfig();

  return Response.json({
    success: true,
    configured: config.configured,
    api_base_url: config.apiBaseUrl,
    provider_code: config.providerCode,
    provider_account_id_configured: Boolean(config.providerAccountId),
    api_key_configured: Boolean(config.apiKey),
    endpoints: {
      create_checkout: "POST /api/studentpay/provider-checkouts",
      upstream: `${config.apiBaseUrl}/v1/provider-checkouts`,
    },
  });
}

export async function POST(request: Request) {
  const config = getStudentPayConfig();

  if (!config.configured) {
    return jsonError(
      503,
      "NOT_CONFIGURED",
      "StudentPay sandbox is not configured. Set STUDENTPAY_PROVIDER_API_KEY and STUDENTPAY_PROVIDER_ACCOUNT_ID.",
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

  if (!formData.termsAccepted || !formData.informationConfirmed) {
    return jsonError(
      400,
      "CONSENTS_REQUIRED",
      "Enrolment declarations must be accepted before creating a checkout.",
    );
  }

  const providerOrderId = createProviderOrderId(course.code);
  const payload = buildCheckoutPayload({
    provider,
    course,
    formData,
    providerOrderId,
  });

  try {
    const upstreamResponse = await fetch(
      `${config.apiBaseUrl}/v1/provider-checkouts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "Idempotency-Key": providerOrderId,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );

    const upstreamJson = (await upstreamResponse.json()) as
      | StudentPayCheckoutSuccess
      | {
          success?: false;
          error?:
            | string
            | {
                code?: string;
                message?: string;
              };
          request_id?: string;
        };

    if (!upstreamResponse.ok || upstreamJson.success === false) {
      const errorValue =
        "error" in upstreamJson ? upstreamJson.error : undefined;
      const message =
        typeof errorValue === "string"
          ? errorValue
          : errorValue?.message ||
            "Unable to create StudentPay sandbox checkout.";
      const code =
        typeof errorValue === "object" && errorValue?.code
          ? errorValue.code
          : "CHECKOUT_FAILED";

      return jsonError(upstreamResponse.status || 502, code, message, {
        request_id:
          "request_id" in upstreamJson
            ? upstreamJson.request_id
            : undefined,
        provider_order_id: providerOrderId,
      });
    }

    const setupUrl = extractDirectDebitSetupUrl(
      upstreamJson as StudentPayCheckoutSuccess,
    );

    if (!setupUrl) {
      return jsonError(
        502,
        "MISSING_SETUP_URL",
        "Checkout was created but no direct debit setup URL was returned.",
        {
          provider_order_id: providerOrderId,
          upstream: upstreamJson,
        },
      );
    }

    return Response.json({
      success: true,
      provider_order_id: providerOrderId,
      setup_url: toEmbeddedSetupUrl(setupUrl),
      checkout: (upstreamJson as StudentPayCheckoutSuccess).checkout,
      request_id: (upstreamJson as StudentPayCheckoutSuccess).request_id,
    });
  } catch (error) {
    return jsonError(
      502,
      "UPSTREAM_ERROR",
      error instanceof Error
        ? error.message
        : "Failed to reach StudentPay sandbox API.",
      {
        provider_order_id: providerOrderId,
      },
    );
  }
}
