import {
  belaNzAuthHeaders,
  formatBelaError,
  getBelaNzConfig,
  parseUpstreamJson,
  publicDemoMeta,
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
 * GET /api/demos/bela-beauty/status
 *  - no checkout_id → public course/config metadata
 *  - ?checkout_id=… → proxy NZ GET /v1/provider-checkouts/{id}
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkoutId =
    searchParams.get("checkout_id") || searchParams.get("checkoutId");

  if (!checkoutId) {
    return Response.json({
      success: true,
      demo: publicDemoMeta(),
    });
  }

  const config = getBelaNzConfig();

  if (!config.configured) {
    return jsonError(
      503,
      "BELA_NZ_KEY_MISSING",
      "PROVIDER_API_KEY_BELA_NZ is not configured on this Provider Experience environment.",
    );
  }

  try {
    const upstreamResponse = await fetch(config.getCheckoutUrl(checkoutId), {
      method: "GET",
      headers: belaNzAuthHeaders(config.apiKey),
      cache: "no-store",
    });

    const upstreamJson = await parseUpstreamJson(upstreamResponse);

    if (!upstreamResponse.ok || upstreamJson.success === false) {
      return Response.json(
        {
          success: false,
          error:
            upstreamJson.error ||
            formatBelaError(upstreamJson, "Unable to retrieve checkout status."),
          upstream_status: upstreamResponse.status,
        },
        { status: upstreamResponse.status || 502 },
      );
    }

    return Response.json({
      success: true,
      ...upstreamJson,
    });
  } catch (error) {
    return jsonError(
      502,
      "INTERNAL_ERROR",
      formatBelaError(error, "Unable to retrieve checkout status."),
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
