import { getCatalogueCourse } from "@/lib/provider-experience/catalogue-server";
import {
  catalogueConfirmBlockedInThisPhase,
  isCatalogueDdaReady,
  sanitiseCatalogueDdaError,
  validateCatalogueDdaAccess,
  type CatalogueDdaRecord
} from "@/lib/provider-experience/catalogue-dda";
import type { CatalogueAgreementAcceptancePayload } from "@/lib/provider-experience/catalogue-agreements";
import { getProviderCheckoutBinding } from "@/lib/provider-experience/catalogue-checkout";
import {
  getProviderExperienceConfig,
  toEmbeddedSetupUrl
} from "@/lib/provider-experience/checkout";
import { getProviderBySlug, isCatalogueProvider } from "@/lib/provider-experience/catalogue";

export const runtime = "nodejs";

type DdaBody = CatalogueAgreementAcceptancePayload & {
  providerSlug?: string;
  courseSlug?: string;
  checkout_id?: string;
};

type CheckoutDdaResponse = {
  success?: boolean;
  student_agreement?: { version?: string | null };
  payment_plan_agreement?: { version?: string | null };
  checkout?: { status?: string | null; stage_name?: string | null };
  records?: { dda_id?: string | null };
  direct_debit?: CatalogueDdaRecord | null;
  provider?: { provider_code?: string | null };
};

function jsonError(status: number, code: string, message: string) {
  return Response.json(
    {
      success: false,
      error: { code, message }
    },
    { status }
  );
}

async function loadCheckout(checkoutId: string, apiKey: string, apiBaseUrl: string) {
  const upstream = await fetch(
    `${apiBaseUrl}/v1/provider-checkouts/${encodeURIComponent(checkoutId)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      },
      cache: "no-store"
    }
  );
  const json = (await upstream.json()) as CheckoutDdaResponse;
  return { upstream, json };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const providerSlug = url.searchParams.get("providerSlug") || "";
  const courseSlug = url.searchParams.get("courseSlug") || "";
  const checkoutId = url.searchParams.get("checkout_id") || "";
  const provider = getProviderBySlug(providerSlug);

  if (!isCatalogueProvider(provider)) {
    return jsonError(403, "PROVIDER_NOT_CATALOGUE", "Direct debit setup for this path is only available to the catalogue provider.");
  }

  if (!courseSlug || !checkoutId) {
    return jsonError(400, "MISSING_FIELDS", "providerSlug, courseSlug and checkout_id are required.");
  }

  const binding = getProviderCheckoutBinding(provider.code);
  const config = getProviderExperienceConfig();
  if (!binding?.apiKey) {
    return jsonError(503, "NOT_CONFIGURED", "Bela catalogue DDA is not configured.");
  }

  const { upstream, json } = await loadCheckout(checkoutId, binding.apiKey, config.apiBaseUrl);
  if (!upstream.ok || json.success === false) {
    return jsonError(upstream.status || 502, "CHECKOUT_LOOKUP_FAILED", "Unable to reload checkout DDA state.");
  }

  if (json.provider?.provider_code && json.provider.provider_code !== provider.code) {
    return jsonError(403, "PROVIDER_MISMATCH", "This checkout does not belong to the requested provider.");
  }

  return Response.json({
    success: true,
    checkout_id: checkoutId,
    ready: isCatalogueDdaReady(json.direct_debit),
    confirm_blocked: catalogueConfirmBlockedInThisPhase(),
    stage_name: json.checkout?.stage_name || null,
    checkout_status: json.checkout?.status || null,
    direct_debit: json.direct_debit || null
  });
}

export async function POST(request: Request) {
  let body: DdaBody;
  try {
    body = (await request.json()) as DdaBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be JSON.");
  }

  const provider = getProviderBySlug(body.providerSlug || "");
  if (!isCatalogueProvider(provider)) {
    return jsonError(403, "PROVIDER_NOT_CATALOGUE", "Direct debit setup for this path is only available to the catalogue provider.");
  }

  if (!body.courseSlug || !body.checkout_id) {
    return jsonError(400, "MISSING_FIELDS", "providerSlug, courseSlug and checkout_id are required.");
  }

  const course = await getCatalogueCourse(provider, body.courseSlug);
  if (!course) {
    return jsonError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  const binding = getProviderCheckoutBinding(provider.code);
  const config = getProviderExperienceConfig();
  if (!binding?.apiKey) {
    return jsonError(503, "NOT_CONFIGURED", "Bela catalogue DDA is not configured.");
  }

  const { upstream, json } = await loadCheckout(
    body.checkout_id,
    binding.apiKey,
    config.apiBaseUrl
  );
  if (!upstream.ok || json.success === false) {
    return jsonError(upstream.status || 502, "CHECKOUT_LOOKUP_FAILED", "Unable to reload checkout DDA state.");
  }

  const access = validateCatalogueDdaAccess({
    shown: {
      provider_student: json.student_agreement?.version || "",
      payment_plan: json.payment_plan_agreement?.version || ""
    },
    submitted: body,
    checkoutProviderCode: json.provider?.provider_code || provider.code,
    requestProviderCode: provider.code
  });

  if (!access.ok) {
    return jsonError(access.status, access.code, access.error || "Direct debit setup is not available.");
  }

  const setup = await fetch(
    `${config.apiBaseUrl}/v1/provider-checkouts/${encodeURIComponent(body.checkout_id)}/dda-setup`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${binding.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        provider_student_agreement_accepted: body.provider_student_agreement_accepted,
        payment_plan_agreement_accepted: body.payment_plan_agreement_accepted,
        agreements: body.agreements
      }),
      cache: "no-store"
    }
  );
  const setupJson = (await setup.json()) as {
    success?: boolean;
    ready?: boolean;
    reused_existing?: boolean;
    confirm_blocked?: boolean;
    dda_id?: string;
    direct_debit?: CatalogueDdaRecord | null;
    error?: { message?: string; code?: string } | string;
  };

  if (!setup.ok || setupJson.success === false) {
    const message = sanitiseCatalogueDdaError(
      typeof setupJson.error === "string"
        ? setupJson.error
        : setupJson.error?.message || "Unable to start direct debit setup."
    );
    return jsonError(setup.status || 502, "DDA_SETUP_FAILED", message);
  }

  const setupUrl = setupJson.direct_debit?.setup_url
    ? toEmbeddedSetupUrl(setupJson.direct_debit.setup_url)
    : null;

  return Response.json({
    success: true,
    checkout_id: body.checkout_id,
    ready: Boolean(setupJson.ready || isCatalogueDdaReady(setupJson.direct_debit)),
    reused_existing: Boolean(setupJson.reused_existing),
    confirm_blocked: catalogueConfirmBlockedInThisPhase(),
    dda_id: setupJson.dda_id || setupJson.direct_debit?.dda_id || json.records?.dda_id || null,
    setup_url: setupUrl,
    direct_debit: setupJson.direct_debit || null
  });
}
