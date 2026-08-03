export type EnrolmentPaymentOption = "full" | "plan";

export type EnrolmentFormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  mobile: string;
  addressLine1: string;
  suburb: string;
  state: string;
  postcode: string;
  paymentOption: EnrolmentPaymentOption;
  marketingConsent: boolean;
  informationConfirmed: boolean;
  termsAccepted: boolean;
};

export type EnrolmentFieldErrors = Partial<
  Record<keyof EnrolmentFormData, string>
>;