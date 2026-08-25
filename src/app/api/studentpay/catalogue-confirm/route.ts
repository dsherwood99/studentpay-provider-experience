import { getCatalogueCourse } from "@/lib/provider-experience/catalogue-server";
import {
  buildCatalogueReviewFacts,
  catalogueConfirmSuccessCopy,
  commercialSnapshotFromServer,
  validateCatalogueConfirmAccess
} from "@/lib/provider-experience/catalogue-confirm";
import type { CatalogueAgreementAcceptancePayload } from "@/lib/provider-experience/catalogue-agreements";
import {
  isCatalogueDdaReady,
  type CatalogueDdaRecord
} from "@/lib/provider-experience/catalogue-dda";
import { getProviderCheckoutBinding } from "@/lib/provider-experience/catalogue-checkout";
import {
  formatApiError,
  getProviderExperienceConfig
} from "@/lib/provider-experience/checkout";
import { getProviderBySlug, isCatalogueProvider } from "@/lib/provider-experience/catalogue";

export const runtime = "nodejs";

type ConfirmBody = CatalogueAgreementAcceptancePayload & {
  providerSlug?: string;
  courseSlug?: string;
  checkout_id?: string;
  checkout_token?: string;
};

type CheckoutConfirmResponse = {
  success?: boolean;
  student_agreement?: { title?: string | null; version?: string | null };
  payment_plan_agreement?: { title?: string | null; version?: string | null };
  checkout?: { status?: string | null; stage_name?: string | null };
  commercial?: {
    course_name?: string | null;
    course_code?: string | null;
    course_price?: number | null;
    upfront?: number | null;
    recurring?: number | null;
    count?: number | null;
    first_payment_date?: string | null;
    provider_name?: string | null;
  } | null;
  records?: {
    opportunity_id?: string | null;
    dda_id?: string | null;
    contact_id?: string | null;
  };
  provider?: {
    provider_code?: string | null;
    provider_order_id?: string | null;
  };
  direct_debit?: CatalogueDdaRecord | null;
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
  const json = (await upstream.json()) as CheckoutConfirmResponse;
  return { upstream, json };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const providerSlug = url.searchParams.get("providerSlug") || "";
  const courseSlug = url.searchParams.get("courseSlug") || "";
  const checkoutId = url.searchParams.get("checkout_id") || "";
  const provider = getProviderBySlug(providerSlug);

  if (!isCatalogueProvider(provider)) {
    return jsonError(
      403,
      "PROVIDER_NOT_CATALOGUE",
      "Catalogue confirmation is only available to the catalogue provider."
    );
  }

  if (!courseSlug || !checkoutId) {
    return jsonError(
      400,
      "MISSING_FIELDS",
      "providerSlug, courseSlug and checkout_id are required."
    );
  }

  const course = await getCatalogueCourse(provider, courseSlug);
  if (!course) {
    return jsonError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  const binding = getProviderCheckoutBinding(provider.code);
  const config = getProviderExperienceConfig();
  if (!binding?.apiKey) {
    return jsonError(503, "NOT_CONFIGURED", "Bela catalogue confirm is not configured.");
  }

  const { upstream, json } = await loadCheckout(checkoutId, binding.apiKey, config.apiBaseUrl);
  if (!upstream.ok || json.success === false) {
    return jsonError(
      upstream.status || 502,
      "CHECKOUT_LOOKUP_FAILED",
      "Unable to reload checkout confirmation state."
    );
  }

  if (json.provider?.provider_code && json.provider.provider_code !== provider.code) {
    return jsonError(
      403,
      "PROVIDER_MISMATCH",
      "This checkout does not belong to the requested provider."
    );
  }

  const snapshot = commercialSnapshotFromServer({
    commercial: json.commercial,
    course
  });
  const review = buildCatalogueReviewFacts({
    snapshot,
    psaAccepted: false,
    ppaAccepted: false,
    ddaReady: isCatalogueDdaReady(json.direct_debit)
  });

  return Response.json({
    success: true,
    checkout_id: checkoutId,
    checkout_status: json.checkout?.status || null,
    stage_name: json.checkout?.stage_name || null,
    ready: isCatalogueDdaReady(json.direct_debit),
    first_payment_date: json.commercial?.first_payment_date || null,
    shown: {
      provider_student: json.student_agreement?.version || "",
      payment_plan: json.payment_plan_agreement?.version || ""
    },
    review: {
      ...review,
      provider_student_title:
        json.student_agreement?.title || `${provider.name} Student Agreement`,
      payment_plan_title:
        json.payment_plan_agreement?.title || "StudentPay Payment Plan Agreement"
    },
    commercial_source: "checkout"
  });
}

export async function POST(request: Request) {
  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be JSON.");
  }

  const provider = getProviderBySlug(body.providerSlug || "");
  if (!isCatalogueProvider(provider)) {
    return jsonError(
      403,
      "PROVIDER_NOT_CATALOGUE",
      "Catalogue confirmation is only available to the catalogue provider."
    );
  }

  if (!body.courseSlug || !body.checkout_id || !body.checkout_token) {
    return jsonError(
      400,
      "MISSING_FIELDS",
      "providerSlug, courseSlug, checkout_id and checkout_token are required."
    );
  }

  const course = await getCatalogueCourse(provider, body.courseSlug);
  if (!course) {
    return jsonError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  const binding = getProviderCheckoutBinding(provider.code);
  const config = getProviderExperienceConfig();
  if (!binding?.apiKey) {
    return jsonError(503, "NOT_CONFIGURED", "Bela catalogue confirm is not configured.");
  }

  const { upstream, json } = await loadCheckout(
    body.checkout_id,
    binding.apiKey,
    config.apiBaseUrl
  );
  if (!upstream.ok || json.success === false) {
    return jsonError(
      upstream.status || 502,
      "CHECKOUT_LOOKUP_FAILED",
      "Unable to reload checkout confirmation state."
    );
  }

  const access = validateCatalogueConfirmAccess({
    shown: {
      provider_student: json.student_agreement?.version || "",
      payment_plan: json.payment_plan_agreement?.version || ""
    },
    submitted: body,
    checkoutProviderCode: json.provider?.provider_code || provider.code,
    requestProviderCode: provider.code,
    dda: json.direct_debit
  });

  if (!access.ok) {
    return jsonError(access.status, access.code, access.error || "Confirmation is not available.");
  }

  const opportunityId = json.records?.opportunity_id || "";
  const ddaId = json.direct_debit?.dda_id || json.records?.dda_id || "";
  const providerOrderId = json.provider?.provider_order_id || "";
  const firstPaymentDate = json.commercial?.first_payment_date;

  if (!opportunityId || !ddaId || !providerOrderId || !firstPaymentDate) {
    return jsonError(
      409,
      "CHECKOUT_INCOMPLETE",
      "Checkout is missing confirmation identifiers."
    );
  }

  const incomingUserAgent = request.headers.get("user-agent") || "";
  const incomingForwardedFor =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "";

  const confirm = await fetch(
    `${config.apiBaseUrl}/v1/provider-checkouts/${encodeURIComponent(body.checkout_id)}/confirm`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${binding.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(incomingUserAgent ? { "x-original-user-agent": incomingUserAgent } : {}),
        ...(incomingForwardedFor
          ? { "x-original-forwarded-for": incomingForwardedFor }
          : {})
      },
      body: JSON.stringify({
        provider: {
          provider_code: provider.code,
          provider_order_id: providerOrderId
        },
        checkout: {
          checkout_id: body.checkout_id,
          checkout_token: body.checkout_token,
          opportunity_id: opportunityId,
          dda_id: ddaId
        },
        payment: {
          payment_method: "studentpay_payment_plan",
          first_payment_date: firstPaymentDate
        },
        declarations: {
          provider_student_agreement_accepted: true,
          payment_plan_accepted: true,
          information_confirmed: true,
          privacy_consent_accepted: true
        },
        agreements: body.agreements,
        confirmed_at: new Date().toISOString()
      }),
      cache: "no-store"
    }
  );

  const confirmJson = (await confirm.json()) as {
    success?: boolean;
    already_confirmed?: boolean;
    status?: string | null;
    checkout_id?: string | null;
    message?: string;
    error?: { message?: string; code?: string } | string;
  };

  if (!confirm.ok || confirmJson.success === false) {
    const message = formatApiError(
      typeof confirmJson.error === "string"
        ? confirmJson.error
        : confirmJson.error || confirmJson.message,
      "Unable to confirm enrolment."
    );
    return jsonError(confirm.status || 502, "CONFIRM_FAILED", message);
  }

  const copy = catalogueConfirmSuccessCopy(
    confirmJson.checkout_id || body.checkout_id
  );

  return Response.json({
    success: true,
    checkout_id: copy.reference,
    status: confirmJson.status || "Confirmed",
    already_confirmed: Boolean(confirmJson.already_confirmed),
    heading: copy.heading,
    message: copy.body,
    reference: copy.reference
  });
}
