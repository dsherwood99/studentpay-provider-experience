import {
  inactiveCommercialSchedule,
  inactivePayerTreatment,
  type ProviderTermsInput,
} from "./provider-terms.ts";

/**
 * Authoritative Bela NZ facts only.
 * Unresolved payer treatments stay inactive. This fixture is not checkout config.
 */
export function belaNzSkeletonInput(): ProviderTermsInput {
  return {
    providerCode: "BELA_NZ",
    jurisdiction: "NZ",
    tradingName: "Bela Beauty College",
    legalName: null,
    supportEmail: "support@belabeautycollege.com",
    supportPhone: "+64 9 888 6459",
    privacyUrl: "https://belabeautycollege.com/policies/privacy-policy",
    providerTermsUrl: null,
    effectiveDate: null,
    course: {
      courseCode: "BELA_LASH_BUSINESS_BUNDLE",
      courseName: "Lash Business Bundle",
      courseFeeCents: 280_000,
      upfrontCents: 1_000,
      financedCents: 279_000,
      frequency: "Weekly",
      regularInstalmentCents: 1_500,
      instalmentCount: 186,
      residualCents: null,
      payInFullEnabled: false,
    },
    payer: inactivePayerTreatment(),
    commercial: inactiveCommercialSchedule(),
    runtimeWired: false,
  };
}
