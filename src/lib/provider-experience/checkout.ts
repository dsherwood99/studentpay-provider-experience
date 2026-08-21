import type { Course } from "@/types/course";
import type {
  CheckoutSession,
  EnrolmentFormData,
  StudentAgreementConfig,
} from "@/types/enrolment";
import type { Provider } from "@/types/provider";

export type ProviderCheckoutPayload = {
  provider: {
    provider_code: string;
    provider_name: string;
    provider_account_id: string;
    education_provider_id: string;
    education_provider_title: string;
    sales_agent_name: string;
    sales_agent_email: string;
    provider_order_id: string;
    provider_enrolment_id: string;
    source: string;
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
      postcode: string;
      state: string;
      country: string;
    };
  };
  course: {
    course_code: string;
    course_name: string;
    category: string;
    displayed_price: number;
    currency: "AUD";
  };
  pricing: {
    course_price: number;
    upfront_payment: number;
    amount_to_finance: number;
    currency: "AUD";
  };
  plan: {
    payment_type: "interest_free_payment_plan" | "upfront_payment";
    payment_frequency: "Weekly" | "Fortnightly" | "Monthly" | "Upfront";
    number_of_instalments: number;
    instalment_amount: number;
    first_payment_date: string;
  };
  payment: {
    payment_type: "interest_free_payment_plan" | "upfront_payment";
    total_amount: number;
    upfront_payment: number;
    first_payment_date: string;
    frequency: "weekly" | "fortnightly" | "monthly" | "upfront";
    number_of_instalments: number;
    instalment_amount: number;
  };
  consents: {
    accepted_terms: boolean;
    accepted_at: string;
    marketing_opt_in: boolean;
  };
  metadata: {
    citizenship: string;
    usi: string | null;
    ssc_passed: boolean;
    deposit_confirmed: boolean;
    source_wizard: "onfit_parity_provider_experience";
    guardian: {
      name: string;
      relationship: string;
      email: string;
      phone?: string;
    } | null;
    emergency_contact: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
};

export type ProviderCheckoutApiResult = {
  success?: boolean;
  error?: string;
  message?: string;
  redirect_url?: string;
  dda_redirect_url?: string;
  checkout_token?: string;
  opportunity_id?: string;
  dda_id?: string;
  checkout_id?: string;
  provider_order_id?: string;
  records?: {
    contact_id?: string;
    opportunity_id?: string;
    dda_id?: string;
  };
  direct_debit?: {
    dda_id?: string;
    setup_url?: string;
    redirect_url?: string;
    token?: string;
    token_expires_at?: string;
  };
  checkout?: {
    redirect_url?: string;
    checkout_token?: string;
    opportunity_id?: string;
    dda_id?: string;
    checkout_id?: string;
    direct_debit?: {
      setup_url?: string;
    };
  };
  data?: {
    redirect_url?: string;
    checkout_token?: string;
    checkout_id?: string;
    opportunity_id?: string;
    dda_id?: string;
    direct_debit?: {
      setup_url?: string;
      redirect_url?: string;
      token?: string;
      dda_id?: string;
    };
  };
  student_agreement?: StudentAgreementConfig;
  [key: string]: unknown;
};

function mapPaymentFrequencyLabel(
  frequency: Course["paymentPlan"]["frequency"],
): "Weekly" | "Fortnightly" | "Monthly" {
  if (frequency === "fortnightly") {
    return "Fortnightly";
  }

  if (frequency === "monthly") {
    return "Monthly";
  }

  return "Weekly";
}

export function getProviderExperienceConfig(options?: {
  providerSlug?: string;
  providerCode?: string;
}) {
  const slug = options?.providerSlug?.trim().toLowerCase() || "";
  const requestedCode = options?.providerCode?.trim().toUpperCase() || "";
  const isBelaSandbox =
    slug === "bela-beauty-sandbox" || requestedCode === "BELA_BEAUTY_SANDBOX";

  const apiBaseUrl =
    process.env.STUDENTPAY_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.PROVIDER_CHECKOUT_API_URL?.replace(/\/api\/provider-checkout$/, "") ||
    "https://sandbox-api.studentpay.com.au";

  const checkoutUrl =
    process.env.PROVIDER_CHECKOUT_API_URL ||
    `${apiBaseUrl}/v1/provider-checkouts`;

  // Real StudentPay confirm handler is /api/provider-checkout-confirm
  // (not /v1/provider-checkouts/confirm — that path returns 405).
  const configuredConfirmUrl =
    process.env.PROVIDER_CHECKOUT_CONFIRM_API_URL ||
    `${apiBaseUrl}/api/provider-checkout-confirm`;

  const confirmUrl = configuredConfirmUrl.includes(
    "/v1/provider-checkouts/confirm",
  )
    ? `${apiBaseUrl}/api/provider-checkout-confirm`
    : configuredConfirmUrl;

  const apiKey = isBelaSandbox
    ? process.env.BELA_BEAUTY_SANDBOX_API_KEY || ""
    : process.env.ACADEMY_API_KEY ||
      process.env.STUDENTPAY_PROVIDER_API_KEY ||
      process.env.ONFIT_API_KEY ||
      "";

  const providerCode = isBelaSandbox
    ? "BELA_BEAUTY_SANDBOX"
    : process.env.ACADEMY_PROVIDER_CODE ||
      process.env.STUDENTPAY_PROVIDER_CODE ||
      "ACADEMY_AUSTRALIA";

  const providerAccountId = isBelaSandbox
    ? process.env.BELA_BEAUTY_SANDBOX_PROVIDER_ACCOUNT_ID || ""
    : process.env.ACADEMY_PROVIDER_ACCOUNT_ID ||
      process.env.STUDENTPAY_PROVIDER_ACCOUNT_ID ||
      "";

  // Default off in deployed environments with credentials so sandbox E2E hits
  // StudentPay. Opt in explicitly for local harness work without an API key.
  const mockModeEnv = process.env.HARNESS_MOCK_MODE?.toLowerCase();
  const mockMode =
    mockModeEnv === "true" ||
    (mockModeEnv !== "false" && !(apiKey && providerAccountId));

  return {
    apiBaseUrl,
    checkoutUrl,
    confirmUrl,
    apiKey,
    providerCode,
    providerAccountId,
    mockMode,
    configured: mockMode || Boolean(apiKey && providerAccountId),
  };
}

export function buildProviderCheckoutPayload({
  provider,
  course,
  formData,
  providerOrderId,
}: {
  provider: Provider;
  course: Course;
  formData: EnrolmentFormData;
  providerOrderId: string;
}): ProviderCheckoutPayload {
  const config = getProviderExperienceConfig({
    providerSlug: provider.slug,
    providerCode: provider.code,
  });
  const isPlan = formData.paymentOption === "plan";
  const totalFee = course.paymentPlan.totalFee;
  const depositAmount = isPlan ? course.paymentPlan.depositAmount : totalFee;
  const amountToFinance = isPlan
    ? Math.max(totalFee - depositAmount, 0)
    : 0;
  const numberOfInstalments = isPlan
    ? (course.paymentPlan.numberOfPayments ??
      Math.max(
        Math.round(amountToFinance / course.paymentPlan.repaymentAmount),
        1,
      ))
    : 1;
  const instalmentAmount = isPlan
    ? course.paymentPlan.repaymentAmount
    : totalFee;
  const frequencyLabel = isPlan
    ? mapPaymentFrequencyLabel(course.paymentPlan.frequency)
    : "Upfront";

  const needsGuardian =
    formData.guardianName.trim() &&
    formData.guardianEmail.trim() &&
    formData.guardianRelationship.trim();

  return {
    provider: {
      provider_code: config.providerCode,
      provider_name: provider.name,
      provider_account_id: config.providerAccountId,
      education_provider_id: config.providerAccountId,
      education_provider_title: provider.name,
      sales_agent_name: "Provider Experience Enrolment Wizard",
      sales_agent_email:
        provider.supportEmail || "enrolments@academyaustralia.com",
      provider_order_id: providerOrderId,
      provider_enrolment_id: `ENROL-${providerOrderId}`,
      source: "studentpay_provider_experience_onfit_parity",
    },
    student: {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim(),
      mobile: formData.mobile.trim(),
      date_of_birth: formData.dateOfBirth,
      address: {
        street_address: formData.addressLine1.trim(),
        suburb: formData.suburb.trim(),
        postcode: formData.postcode.trim(),
        state: formData.state,
        country: "Australia",
      },
    },
    course: {
      course_code: course.code,
      course_name: course.title,
      category: course.category,
      displayed_price: totalFee,
      currency: "AUD",
    },
    pricing: {
      course_price: totalFee,
      upfront_payment: depositAmount,
      amount_to_finance: amountToFinance,
      currency: "AUD",
    },
    plan: {
      payment_type: isPlan
        ? "interest_free_payment_plan"
        : "upfront_payment",
      payment_frequency: frequencyLabel,
      number_of_instalments: numberOfInstalments,
      instalment_amount: instalmentAmount,
      first_payment_date: formData.firstPaymentDate,
    },
    payment: {
      payment_type: isPlan
        ? "interest_free_payment_plan"
        : "upfront_payment",
      total_amount: totalFee,
      upfront_payment: depositAmount,
      first_payment_date: formData.firstPaymentDate,
      frequency: isPlan ? course.paymentPlan.frequency : "upfront",
      number_of_instalments: numberOfInstalments,
      instalment_amount: instalmentAmount,
    },
    consents: {
      accepted_terms:
        formData.paymentTermsAccepted &&
        formData.informationConfirmed &&
        formData.privacyAccepted,
      accepted_at: new Date().toISOString(),
      marketing_opt_in: formData.marketingConsent,
    },
    metadata: {
      citizenship: formData.citizenship,
      usi: formData.usi.trim() || null,
      ssc_passed: formData.sscPassed,
      deposit_confirmed: formData.depositConfirmed,
      source_wizard: "onfit_parity_provider_experience",
      guardian: needsGuardian
        ? {
            name: formData.guardianName.trim(),
            relationship: formData.guardianRelationship.trim(),
            email: formData.guardianEmail.trim(),
            phone: formData.guardianPhone.trim() || undefined,
          }
        : null,
      emergency_contact: {
        name: formData.emergencyName.trim(),
        phone: formData.emergencyPhone.trim(),
        relationship: formData.emergencyRelationship.trim(),
      },
    },
  };
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolveStudentAgreement(
  data: ProviderCheckoutApiResult,
): StudentAgreementConfig | null {
  const value = data.student_agreement;
  if (!value || typeof value !== "object") {
    return null;
  }

  return {
    enabled: Boolean(value.enabled),
    required: Boolean(value.required),
    title: typeof value.title === "string" ? value.title : null,
    version: typeof value.version === "string" ? value.version : null,
    acceptance_text:
      typeof value.acceptance_text === "string" ? value.acceptance_text : null,
    document_url:
      typeof value.document_url === "string" ? value.document_url : null,
  };
}

export function resolveCheckoutSession(
  data: ProviderCheckoutApiResult,
  providerOrderId: string,
): CheckoutSession {
  const redirectUrl =
    getString(data.redirect_url) ||
    getString(data.dda_redirect_url) ||
    getString(data.direct_debit?.setup_url) ||
    getString(data.direct_debit?.redirect_url) ||
    getString(data.checkout?.redirect_url) ||
    getString(data.checkout?.direct_debit?.setup_url) ||
    getString(data.data?.redirect_url) ||
    getString(data.data?.direct_debit?.setup_url) ||
    getString(data.data?.direct_debit?.redirect_url);

  const checkoutToken =
    getString(data.checkout_token) ||
    getString(data.direct_debit?.token) ||
    getString(data.checkout?.checkout_token) ||
    getString(data.data?.checkout_token);

  const opportunityId =
    getString(data.opportunity_id) ||
    getString(data.records?.opportunity_id) ||
    getString(data.checkout?.opportunity_id) ||
    getString(data.data?.opportunity_id);

  const ddaId =
    getString(data.dda_id) ||
    getString(data.records?.dda_id) ||
    getString(data.direct_debit?.dda_id) ||
    getString(data.checkout?.dda_id) ||
    getString(data.data?.dda_id) ||
    getString(data.data?.direct_debit?.dda_id);

  const checkoutId =
    getString(data.checkout_id) ||
    getString(data.checkout?.checkout_id) ||
    getString(data.data?.checkout_id);

  if (!redirectUrl) {
    throw new Error(
      "StudentPay did not return a direct debit setup URL.",
    );
  }

  if (!checkoutToken) {
    throw new Error("StudentPay did not return a checkout token.");
  }

  if (!opportunityId || !ddaId) {
    throw new Error(
      "StudentPay did not return the Opportunity and direct debit identifiers.",
    );
  }

  return {
    checkoutToken,
    opportunityId,
    ddaId,
    checkoutId,
    providerOrderId,
    redirectUrl,
    studentAgreement: resolveStudentAgreement(data),
  };
}

export function formatApiError(
  value: unknown,
  fallback = "An unexpected StudentPay error occurred.",
): string {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (value instanceof Error) {
    return value.message || fallback;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of ["message", "error", "detail", "title"]) {
      const nested = record[key];
      if (typeof nested === "string" && nested.trim()) {
        return nested.trim();
      }
      if (nested && typeof nested === "object") {
        const nestedMessage = formatApiError(nested, "");
        if (nestedMessage) {
          return nestedMessage;
        }
      }
    }

    if (Array.isArray(record.missing_fields) && record.missing_fields.length) {
      return `Missing fields: ${record.missing_fields.join(", ")}`;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return String(value);
}

export function toEmbeddedSetupUrl(setupUrl: string): string {
  try {
    const url = new URL(setupUrl);
    if (!url.searchParams.has("embed")) {
      url.searchParams.set("embed", "1");
    }
    return url.toString();
  } catch {
    return setupUrl;
  }
}

