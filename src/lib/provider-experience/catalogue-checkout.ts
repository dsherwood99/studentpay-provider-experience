import type { CatalogueCourseView } from "@/types/catalogue";
import type { Provider } from "@/types/provider";
import type { ProviderCheckoutPayload } from "@/lib/provider-experience/checkout";
import { resolveCatalogueBinding } from "./provider-bindings.ts";

function catalogueFirstPaymentDate() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

export type CatalogueStudentDetails = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  dateOfBirth: string;
  addressLine1: string;
  suburb: string;
  state: string;
  postcode: string;
};

export const TAMPERED_COMMERCIAL = {
  course_price: 1,
  upfront_payment: 1,
  amount_to_finance: 1,
  number_of_instalments: 1,
  instalment_amount: 1,
} as const;

export const BRIDAL_AUTHORITATIVE_SNAPSHOT = {
  course_code: "BRIDAL_FREELANCER_BUNDLE",
  course_price: 3500,
  upfront: 4,
  recurring: 23,
  count: 152,
  amount_to_finance: 3496,
} as const;

export const CLASSIC_AUTHORITATIVE_SNAPSHOT = {
  course_code: "CLASSIC_LASH",
  course_price: 1800,
  upfront: 0,
  recurring: 24,
  count: 75,
  amount_to_finance: 1800,
} as const;

export function getProviderCheckoutBinding(providerCode: string): {
  apiKey: string;
  providerCode: string;
  providerAccountId: string;
  apiBaseUrl: string;
} | null {
  return resolveCatalogueBinding(providerCode);
}

export function buildCatalogueCheckoutPayload({
  provider,
  course,
  student,
  providerOrderId,
  binding,
}: {
  provider: Provider;
  course: Pick<CatalogueCourseView, "code" | "title">;
  student: CatalogueStudentDetails;
  providerOrderId: string;
  binding: NonNullable<ReturnType<typeof getProviderCheckoutBinding>>;
}): ProviderCheckoutPayload {
  const firstPaymentDate = catalogueFirstPaymentDate();

  return {
    provider: {
      provider_code: binding.providerCode,
      provider_name: provider.name,
      provider_account_id: binding.providerAccountId,
      education_provider_id: binding.providerAccountId,
      education_provider_title: provider.name,
      sales_agent_name: "Provider Experience Catalogue Enrolment",
      sales_agent_email:
        provider.supportEmail || "enrolments@studentpay.com.au",
      provider_order_id: providerOrderId,
      provider_enrolment_id: `ENROL-${providerOrderId}`,
      source: "studentpay_provider_experience_catalogue",
    },
    student: {
      first_name: student.firstName.trim(),
      last_name: student.lastName.trim(),
      email: student.email.trim(),
      mobile: student.mobile.trim(),
      date_of_birth: student.dateOfBirth,
      address: {
        street_address: student.addressLine1.trim(),
        suburb: student.suburb.trim(),
        postcode: student.postcode.trim(),
        state: student.state,
        country: "Australia",
      },
    },
    course: {
      course_code: course.code,
      course_name: course.title,
      category: "Beauty",
      displayed_price: TAMPERED_COMMERCIAL.course_price,
      currency: "AUD",
    },
    pricing: {
      course_price: TAMPERED_COMMERCIAL.course_price,
      upfront_payment: TAMPERED_COMMERCIAL.upfront_payment,
      amount_to_finance: TAMPERED_COMMERCIAL.amount_to_finance,
      currency: "AUD",
    },
    plan: {
      payment_type: "interest_free_payment_plan",
      payment_frequency: "Weekly",
      number_of_instalments: TAMPERED_COMMERCIAL.number_of_instalments,
      instalment_amount: TAMPERED_COMMERCIAL.instalment_amount,
      first_payment_date: firstPaymentDate,
    },
    payment: {
      payment_type: "interest_free_payment_plan",
      total_amount: TAMPERED_COMMERCIAL.course_price,
      upfront_payment: TAMPERED_COMMERCIAL.upfront_payment,
      first_payment_date: firstPaymentDate,
      frequency: "weekly",
      number_of_instalments: TAMPERED_COMMERCIAL.number_of_instalments,
      instalment_amount: TAMPERED_COMMERCIAL.instalment_amount,
    },
    consents: {
      accepted_terms: false,
      accepted_at: new Date().toISOString(),
      marketing_opt_in: false,
    },
    metadata: {
      citizenship: "australian_citizen",
      usi: null,
      ssc_passed: false,
      deposit_confirmed: false,
      source_wizard: "onfit_parity_provider_experience",
      guardian: null,
      emergency_contact: {
        name: "",
        phone: "",
        relationship: "",
      },
    },
  };
}
