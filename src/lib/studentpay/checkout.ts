import type { Course } from "@/types/course";
import type { EnrolmentFormData } from "@/types/enrolment";
import type { Provider } from "@/types/provider";

export type StudentPayCheckoutPayload = {
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
};

export type StudentPayCheckoutSuccess = {
  success: true;
  checkout?: {
    id?: string;
    checkout_id?: string;
    status?: string;
    direct_debit?: {
      setup_url?: string;
    };
  };
  direct_debit?: {
    setup_url?: string;
  };
  data?: {
    checkout?: {
      id?: string;
      checkout_id?: string;
      direct_debit?: {
        setup_url?: string;
      };
    };
    direct_debit?: {
      setup_url?: string;
    };
  };
  request_id?: string;
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

export function getFirstPaymentDate(daysFromToday = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

export function createProviderOrderId(courseCode: string): string {
  return `PX-${courseCode}-${Date.now()}`;
}

export function getStudentPayConfig() {
  const apiBaseUrl =
    process.env.STUDENTPAY_API_BASE_URL?.replace(/\/$/, "") ||
    "https://sandbox-api.studentpay.com.au";
  const apiKey = process.env.STUDENTPAY_PROVIDER_API_KEY || "";
  const providerCode = process.env.STUDENTPAY_PROVIDER_CODE || "SANDBOX_DEMO";
  const providerAccountId =
    process.env.STUDENTPAY_PROVIDER_ACCOUNT_ID || "";

  return {
    apiBaseUrl,
    apiKey,
    providerCode,
    providerAccountId,
    configured: Boolean(apiKey && providerAccountId),
  };
}

export function buildCheckoutPayload({
  provider,
  course,
  formData,
  providerOrderId,
}: {
  provider: Provider;
  course: Course;
  formData: EnrolmentFormData;
  providerOrderId: string;
}): StudentPayCheckoutPayload {
  const config = getStudentPayConfig();
  const isPlan = formData.paymentOption === "plan";
  const firstPaymentDate = getFirstPaymentDate(7);
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

  return {
    provider: {
      provider_code: config.providerCode,
      provider_name: provider.name,
      provider_account_id: config.providerAccountId,
      education_provider_id: config.providerAccountId,
      education_provider_title: provider.name,
      sales_agent_name: "Provider Experience",
      sales_agent_email:
        provider.supportEmail ?? "partners@studentpay.com.au",
      provider_order_id: providerOrderId,
      provider_enrolment_id: `ENROL-${providerOrderId}`,
      source: "studentpay_provider_experience",
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
      first_payment_date: firstPaymentDate,
    },
    payment: {
      payment_type: isPlan
        ? "interest_free_payment_plan"
        : "upfront_payment",
      total_amount: totalFee,
      upfront_payment: depositAmount,
      first_payment_date: firstPaymentDate,
      frequency: isPlan ? course.paymentPlan.frequency : "upfront",
      number_of_instalments: numberOfInstalments,
      instalment_amount: instalmentAmount,
    },
    consents: {
      accepted_terms: formData.termsAccepted,
      accepted_at: new Date().toISOString(),
      marketing_opt_in: formData.marketingConsent,
    },
  };
}

export function extractDirectDebitSetupUrl(
  payload: StudentPayCheckoutSuccess,
): string | null {
  return (
    payload.checkout?.direct_debit?.setup_url ||
    payload.direct_debit?.setup_url ||
    payload.data?.checkout?.direct_debit?.setup_url ||
    payload.data?.direct_debit?.setup_url ||
    null
  );
}

/** Prefer iframe-friendly DD setup URL when the API supports embed mode. */
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
