import { getCatalogueCourse } from "@/lib/provider-experience/catalogue-server";
import {
  validateSeparateAgreementAcceptance,
  type CatalogueAgreementAcceptancePayload,
} from "@/lib/provider-experience/catalogue-agreements";
import { getProviderCheckoutBinding } from "@/lib/provider-experience/catalogue-checkout";
import { getProviderExperienceConfig } from "@/lib/provider-experience/checkout";
import { getProviderBySlug, isCatalogueProvider } from "@/lib/provider-experience/catalogue";

export const runtime = "nodejs";

type AcceptBody = CatalogueAgreementAcceptancePayload & {
  providerSlug?: string;
  courseSlug?: string;
  checkout_id?: string;
};

type CheckoutVersionsResponse = {
  success?: boolean;
  student_agreement?: { version?: string | null };
  payment_plan_agreement?: { version?: string | null };
  checkout?: { status?: string | null; stage_name?: string | null };
};

export async function POST(request: Request) {
  let body: AcceptBody;

  try {
    body = (await request.json()) as AcceptBody;
  } catch {
    return Response.json(
      {
        success: false,
        error: { code: "INVALID_JSON", message: "Request body must be JSON." },
      },
      { status: 400 },
    );
  }

  const provider = getProviderBySlug(body.providerSlug || "");

  if (!isCatalogueProvider(provider) || !body.courseSlug || !body.checkout_id) {
    return Response.json(
      {
        success: false,
        error: {
          code: "MISSING_FIELDS",
          message: "providerSlug, courseSlug and checkout_id are required.",
        },
      },
      { status: 400 },
    );
  }

  const course = await getCatalogueCourse(provider, body.courseSlug);

  if (!course) {
    return Response.json(
      {
        success: false,
        error: { code: "COURSE_NOT_FOUND", message: "Course not found." },
      },
      { status: 404 },
    );
  }

  const binding = getProviderCheckoutBinding(provider.code);
  const config = getProviderExperienceConfig();

  if (!binding?.apiKey) {
    return Response.json(
      {
        success: false,
        error: {
          code: "NOT_CONFIGURED",
          message: "Bela catalogue agreements are not configured.",
        },
      },
      { status: 503 },
    );
  }

  const upstream = await fetch(
    `${config.apiBaseUrl}/v1/provider-checkouts/${encodeURIComponent(body.checkout_id)}`,
    {
      headers: {
        Authorization: `Bearer ${binding.apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  const checkoutJson = (await upstream.json()) as CheckoutVersionsResponse;

  if (!upstream.ok || checkoutJson.success === false) {
    return Response.json(
      {
        success: false,
        error: {
          code: "CHECKOUT_LOOKUP_FAILED",
          message: "Unable to reload the checkout agreement versions.",
        },
      },
      { status: upstream.status || 502 },
    );
  }

  const shown = {
    provider_student: checkoutJson.student_agreement?.version || "",
    payment_plan: checkoutJson.payment_plan_agreement?.version || "",
  };

  const result = validateSeparateAgreementAcceptance({
    shown,
    submitted: body,
  });

  if (!result.ok) {
    return Response.json(
      {
        success: false,
        error: {
          code: result.code,
          message: result.error,
        },
        shown,
      },
      { status: result.status },
    );
  }

  return Response.json({
    success: true,
    checkout_id: body.checkout_id,
    provider_student_agreement_accepted:
      result.provider_student_agreement_accepted,
    payment_plan_agreement_accepted: result.payment_plan_agreement_accepted,
    can_continue: result.can_continue,
    shown,
    checkout_status: checkoutJson.checkout?.status || null,
    stage_name: checkoutJson.checkout?.stage_name || null,
    commercial_ignored_from_client: true,
    course_code: course.code,
  });
}
