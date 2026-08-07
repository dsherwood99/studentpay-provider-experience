export type EnrolmentPaymentOption = "full" | "afterpay" | "plan";

export type EnrolmentFormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  mobile: string;
  citizenship: string;
  guardianName: string;
  guardianRelationship: string;
  guardianEmail: string;
  guardianPhone: string;
  addressLine1: string;
  suburb: string;
  state: string;
  postcode: string;
  usi: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  paymentOption: EnrolmentPaymentOption;
  firstPaymentDate: string;
  depositConfirmed: boolean;
  sscPassed: boolean;
  photoIdUploaded: boolean;
  marketingConsent: boolean;
  paymentTermsAccepted: boolean;
  informationConfirmed: boolean;
  privacyAccepted: boolean;
};

export type EnrolmentFieldErrors = Partial<
  Record<keyof EnrolmentFormData, string>
>;

export type CheckoutSession = {
  checkoutToken: string;
  opportunityId: string;
  ddaId: string;
  checkoutId: string;
  providerOrderId: string;
  redirectUrl: string;
};
