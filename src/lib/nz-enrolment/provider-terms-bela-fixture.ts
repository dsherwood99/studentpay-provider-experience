import type { ProviderTermsInput } from "./provider-terms.ts";

/**
 * Decided Bela NZ policy for the inactive skeleton only.
 * Not checkout configuration and not an Active Salesforce policy.
 * Kit and effective date stay unresolved. Provider commercial amounts are
 * recorded here so tests can prove they are omitted from the student document.
 * The $0.40 + 2.9% shadow canary is not copied into this model.
 */
export function belaNzSkeletonInput(): ProviderTermsInput {
  return {
    providerCode: "BELA_NZ",
    jurisdiction: "NZ",
    tradingName: "Bela Beauty College",
    legalName: "Jessica Buff",
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
    enrolment: {
      coolingOffDays: 3,
      afterCoolingOff: "remaining_fee_payable_subject_to_provider_terms_and_law",
      courseAccess: "two_years",
      kit: "unresolved",
    },
    payer: {
      retryEnabled: true,
      retryDelayDays: 4,
      catchUpTreatment: "arrears_added_to_end",
      failedPaymentFeeEnabled: true,
      failedPaymentFeeAmountCents: 250,
      failedPaymentFeeCollection: "end_of_plan",
      lateFeeEnabled: true,
      lateFeeAmountCents: 1_500,
      lateFeeTriggerDays: 60,
      lateFeeAssessment: "last_business_day_of_month",
      collectionsAuthority: "authorised",
      courseAccessSuspension: "provider_controlled",
    },
    commercial: {
      establishmentFeeCents: 6_000,
      establishmentBasis: "per_activated_payment_plan",
      monthlyAccountFeeCents: 500,
      monthlyAccountBasis: "per_activated_account_month",
      transactionFixedCents: null,
      transactionPercent: null,
      chargingAuthorised: false,
    },
    runtimeWired: false,
  };
}
