import {
  centsToApiAmount,
  previewPlan,
} from "./plan-math.ts";
import type {
  CanonicalCheckoutResult,
  NzCourse,
  NzPlanSelection,
  NzStudentDetails,
  NzTenant,
} from "./types.ts";

export type CanonicalCreatePayload = {
  provider: {
    provider_code: string;
    provider_order_id: string;
    provider_name: string;
    success_url: string;
    cancel_url: string;
  };
  student: {
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    date_of_birth: string;
    address: {
      street_address: string;
      suburb: string;
      city: string;
      state: string;
      postcode: string;
      country: string;
    };
  };
  course: {
    course_code: string;
    course_name: string;
  };
  pricing: {
    course_price: number;
    upfront_payment: number;
    amount_to_finance: number;
  };
  plan: {
    payment_type: "interest_free_payment_plan";
    payment_frequency: "Weekly" | "Fortnightly" | "Monthly";
    number_of_instalments: number;
    instalment_amount: number;
    first_payment_date: string;
  };
};

export function buildCanonicalCreatePayload(input: {
  tenant: NzTenant;
  course: NzCourse;
  student: NzStudentDetails;
  plan: NzPlanSelection;
  providerOrderId: string;
  successUrl: string;
  cancelUrl: string;
}): CanonicalCreatePayload {
  if (input.plan.paymentOption !== "interest_free_payment_plan") {
    throw new Error("Only interest-free payment plans are enabled.");
  }

  const preview = previewPlan({
    coursePriceCents: input.course.priceCents,
    upfrontAmountCents: input.plan.upfrontAmountCents,
    frequency: input.plan.frequency,
    numberOfInstalments: input.plan.numberOfInstalments,
    firstPaymentDate: input.plan.firstPaymentDate,
  });

  return {
    provider: {
      provider_code: input.tenant.providerCode,
      provider_order_id: input.providerOrderId,
      provider_name: input.tenant.displayName,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    },
    student: {
      first_name: input.student.firstName,
      last_name: input.student.lastName,
      email: input.student.email,
      mobile: input.student.mobile,
      date_of_birth: input.student.dateOfBirth,
      address: {
        street_address: input.student.streetAddress,
        suburb: input.student.suburb,
        city: input.student.city || input.student.suburb,
        state: input.student.region,
        postcode: input.student.postcode,
        country: input.student.country || "New Zealand",
      },
    },
    course: {
      course_code: input.course.courseCode,
      course_name: input.course.name,
    },
    pricing: {
      course_price: centsToApiAmount(preview.coursePriceCents),
      upfront_payment: centsToApiAmount(preview.upfrontAmountCents),
      amount_to_finance: centsToApiAmount(preview.amountToFinanceCents),
    },
    plan: {
      payment_type: "interest_free_payment_plan",
      payment_frequency: preview.frequency,
      number_of_instalments: preview.numberOfInstalments,
      instalment_amount: centsToApiAmount(preview.instalmentAmountCents),
      first_payment_date: preview.firstPaymentDate,
    },
  };
}

export function buildCanonicalConfirmPayload(input: {
  tenant: NzTenant;
  providerOrderId: string;
  checkoutId: string;
  checkoutToken: string;
  opportunityId: string;
  ddaId: string;
  firstPaymentDate: string;
  declarations: {
    payment_plan_accepted: boolean;
    information_confirmed: boolean;
    privacy_consent_accepted: boolean;
  };
}) {
  return {
    provider: {
      provider_code: input.tenant.providerCode,
      provider_order_id: input.providerOrderId,
    },
    checkout: {
      checkout_id: input.checkoutId,
      checkout_token: input.checkoutToken,
      opportunity_id: input.opportunityId,
      dda_id: input.ddaId,
    },
    payment: {
      payment_method: "studentpay_payment_plan",
      first_payment_date: input.firstPaymentDate,
      deposit_confirmed: true,
    },
    declarations: input.declarations,
  };
}

function parseCanonicalBody(text: string): CanonicalCheckoutResult {
  try {
    return JSON.parse(text) as CanonicalCheckoutResult;
  } catch {
    return {
      success: false,
      error: {
        code: "UPSTREAM_ERROR",
        message: "Canonical /v1 did not return JSON.",
      },
    };
  }
}

export async function canonicalCreate(input: {
  apiBaseUrl: string;
  apiKey: string;
  payload: CanonicalCreatePayload;
  idempotencyKey: string;
}): Promise<{ httpStatus: number; body: CanonicalCheckoutResult }> {
  const response = await fetch(
    `${input.apiBaseUrl.replace(/\/$/, "")}/v1/provider-checkouts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${input.apiKey}`,
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify(input.payload),
      cache: "no-store",
    },
  );
  const text = await response.text();
  return { httpStatus: response.status, body: parseCanonicalBody(text) };
}

export async function canonicalGet(input: {
  apiBaseUrl: string;
  apiKey: string;
  checkoutId: string;
}): Promise<{ httpStatus: number; body: CanonicalCheckoutResult }> {
  const response = await fetch(
    `${input.apiBaseUrl.replace(/\/$/, "")}/v1/provider-checkouts/${encodeURIComponent(input.checkoutId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      cache: "no-store",
    },
  );
  const text = await response.text();
  return { httpStatus: response.status, body: parseCanonicalBody(text) };
}

export async function canonicalConfirm(input: {
  apiBaseUrl: string;
  apiKey: string;
  checkoutId: string;
  payload: ReturnType<typeof buildCanonicalConfirmPayload>;
}): Promise<{ httpStatus: number; body: CanonicalCheckoutResult }> {
  const response = await fetch(
    `${input.apiBaseUrl.replace(/\/$/, "")}/v1/provider-checkouts/${encodeURIComponent(input.checkoutId)}/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify(input.payload),
      cache: "no-store",
    },
  );
  const text = await response.text();
  return { httpStatus: response.status, body: parseCanonicalBody(text) };
}

export function extractCheckoutToken(body: CanonicalCheckoutResult): string {
  return (
    body.checkout?.checkout_token ||
    body.direct_debit?.token ||
    ""
  );
}

export function extractSetupUrl(body: CanonicalCheckoutResult): string {
  return (
    body.direct_debit?.setup_url ||
    body.direct_debit?.redirect_url ||
    ""
  );
}
