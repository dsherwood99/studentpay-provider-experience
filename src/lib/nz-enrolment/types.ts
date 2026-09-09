export type NzPaymentFrequency = "Weekly" | "Fortnightly" | "Monthly";

export type NzPaymentOptionId =
  | "interest_free_payment_plan"
  | "pay_in_full";

export type NzTenantBranding = {
  logoPath: string;
  primaryColour: string;
  accentColour: string;
  backgroundColour: string;
  textColour: string;
  fontFamily: string;
};

export type NzPaymentOptions = {
  interest_free_payment_plan: {
    enabled: true;
  };
  pay_in_full: {
    enabled: boolean;
    comingSoon: boolean;
  };
};

export type NzTenantCheckoutConfig = {
  paymentOptions: NzPaymentOptions;
  availableFrequencies: readonly NzPaymentFrequency[];
  minInstalments: number;
  maxInstalments: number;
  defaultFrequency: NzPaymentFrequency;
  wording?: {
    ddaLead?: string;
    supportNote?: string;
  };
};

export type NzTenant = {
  /** Public URL slug. Never used as the canonical /v1 provider_code. */
  slug: string;
  /** Canonical NZ provider_code resolved only on the server. */
  providerCode: string;
  displayName: string;
  legalName: string;
  supportEmail: string;
  supportPhone?: string;
  privacyUrl: string;
  termsUrl: string;
  websiteUrl?: string;
  branding: NzTenantBranding;
  checkout: NzTenantCheckoutConfig;
  /** Server-only env var holding the provider API key. Never NEXT_PUBLIC_. */
  apiKeyEnv: string;
  apiBaseUrl: string;
  active: boolean;
};

export type NzCoursePlanDefaults = {
  upfrontAmountCents: number;
  frequency: NzPaymentFrequency;
  numberOfInstalments: number;
};

export type NzCourse = {
  courseCode: string;
  slug: string;
  providerSlug: string;
  name: string;
  description: string;
  priceCents: number;
  status: "active" | "inactive";
  duration?: string;
  planDefaults: NzCoursePlanDefaults;
};

export type NzStudentDetails = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  dateOfBirth: string;
  streetAddress: string;
  suburb: string;
  city: string;
  postcode: string;
  region: string;
  country: string;
};

export type NzPlanSelection = {
  paymentOption: NzPaymentOptionId;
  upfrontAmountCents: number;
  frequency: NzPaymentFrequency;
  numberOfInstalments: number;
  firstPaymentDate: string;
};

export type NzPlanPreview = {
  coursePriceCents: number;
  upfrontAmountCents: number;
  amountToFinanceCents: number;
  frequency: NzPaymentFrequency;
  numberOfInstalments: number;
  instalmentAmountCents: number;
  firstPaymentDate: string;
  totalPayableCents: number;
};

export type NzCheckoutSession = {
  providerSlug: string;
  courseSlug: string;
  providerOrderId: string;
  checkoutId?: string;
  opportunityId?: string;
  ddaId?: string;
  checkoutToken?: string;
  setupUrl?: string;
  student?: NzStudentDetails;
  plan?: NzPlanSelection;
};

export type NzPublicTenant = {
  slug: string;
  displayName: string;
  legalName: string;
  supportEmail: string;
  supportPhone?: string;
  privacyUrl: string;
  termsUrl: string;
  websiteUrl?: string;
  branding: NzTenantBranding;
  checkout: {
    paymentOptions: NzPaymentOptions;
    availableFrequencies: readonly NzPaymentFrequency[];
    minInstalments: number;
    maxInstalments: number;
    defaultFrequency: NzPaymentFrequency;
    wording?: NzTenantCheckoutConfig["wording"];
  };
};

export type NzPublicCourse = {
  slug: string;
  courseCode: string;
  name: string;
  description: string;
  priceCents: number;
  duration?: string;
  planDefaults: NzCoursePlanDefaults;
};

export type CanonicalCheckoutResult = {
  success: boolean;
  idempotentReplay?: boolean;
  alreadyConfirmed?: boolean;
  requestId?: string;
  error?: {
    code?: string;
    message?: string;
    invalid_fields?: unknown;
  };
  provider?: {
    provider_code?: string;
    provider_order_id?: string;
  };
  records?: {
    contact_id?: string;
    opportunity_id?: string;
    dda_id?: string;
  };
  checkout?: {
    checkout_id?: string;
    checkout_token?: string;
    status?: string;
    requires_direct_debit?: boolean;
    id?: string;
  };
  direct_debit?: {
    setup_complete?: boolean;
    setup_url?: string;
    redirect_url?: string;
    token?: string;
    dda_id?: string;
    billing_request_status?: string;
    mandate_status?: string;
    authorised?: boolean;
    status?: string;
    processor_status?: string;
  };
  agreement?: {
    id?: string;
    number?: string;
    pdf_generated?: boolean;
  };
  enrolment?: {
    status?: string;
  };
  raw?: unknown;
};
