export type PaymentFrequency = "weekly" | "fortnightly" | "monthly";

export type CoursePaymentPlan = {
  totalFee: number;
  depositAmount: number;
  repaymentAmount: number;
  frequency: PaymentFrequency;
  numberOfPayments?: number;
};

export type Course = {
  code: string;
  slug: string;
  providerCode: string;
  title: string;
  category: string;
  shortDescription: string;
  description: string;
  imagePath?: string;
  duration: string;
  deliveryMode: string;
  qualification?: string;
  outcomes: string[];
  paymentPlan: CoursePaymentPlan;
  featured?: boolean;
};