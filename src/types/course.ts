export type PaymentFrequency = "weekly" | "fortnightly" | "monthly";

export type CoursePaymentPlan = {
  totalFee: number;
  depositAmount: number;
  repaymentAmount: number;
  frequency: PaymentFrequency;
  numberOfPayments?: number;
};

export type CourseVisualTone =
  | "beauty"
  | "psychology"
  | "technology"
  | "animal"
  | "business";

export type Course = {
  code: string;
  slug: string;
  providerCode: string;
  deliveryProvider?: string;
  title: string;
  category: string;
  shortDescription: string;
  description: string;
  duration: string;
  deliveryMode: string;
  qualification?: string;
  badges: string[];
  outcomes: string[];
  paymentPlan: CoursePaymentPlan;
  visualTone: CourseVisualTone;
  featured?: boolean;
};