export type CatalogueFrequency = "weekly" | "fortnightly" | "monthly";

export type PublicCatalogueCommercial = {
  course_price_cents: number;
  external_deposit_cents?: number;
  standard_recurring_amount_cents: number;
  mathematical_remainder_cents?: number;
  operational_upfront_payment_cents: number;
  recurring_instalment_count: number;
  amount_to_finance_cents?: number;
  uncollected_by_legacy_adapter_cents?: number;
  strategy?: string;
};

export type PublicCataloguePriceVersion = {
  price_version_id: string;
  version_number: number;
  status: string;
  effective_from: string | null;
  frequency: string;
};

export type PublicCatalogueCourse = {
  course_id: string;
  course_code: string;
  course_name: string;
  status: string;
  currency: string;
  kit_included: boolean;
  kit_disclosure: string;
  price_version: PublicCataloguePriceVersion;
  commercial: PublicCatalogueCommercial;
};

export type CatalogueCourseView = {
  providerCode: string;
  code: string;
  slug: string;
  title: string;
  status: string;
  currency: string;
  kitIncluded: boolean;
  kitDisclosure: string;
  frequency: CatalogueFrequency;
  coursePriceCents: number;
  upfrontCents: number;
  recurringCents: number;
  recurringCount: number;
};
