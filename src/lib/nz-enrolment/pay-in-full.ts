import {
  NZ_PRODUCTION_API_BASE_URL,
  getStudentpayEnv,
  resolveNzApiBaseUrl,
} from "./environment.ts";
import { dollarsToCents } from "./plan-math.ts";
import type {
  NzCourse,
  NzEnrolmentPaymentOption,
  NzHostedEligibility,
  NzTenant,
} from "./types.ts";

export const HOSTED_E13_API_SHA = "78b2e4439b0ad31e5c766793b8bc1f85523293c6";
export const HOSTED_E13_PRODUCTIONISATION = true;

export const DEFAULT_ENROLMENT_PAYMENT_OPTIONS: readonly NzEnrolmentPaymentOption[] =
  ["payment_plan"];

export function isHostedPayInFullEnvironmentAllowed(): boolean {
  const env = getStudentpayEnv();
  const api = resolveNzApiBaseUrl();
  if (!env || api.error || !api.url) {
    return false;
  }
  if (env === "sandbox") {
    return api.url !== NZ_PRODUCTION_API_BASE_URL;
  }
  return api.url === NZ_PRODUCTION_API_BASE_URL;
}

export function isTestStripePublishableKey(
  key: string | null | undefined,
): boolean {
  return Boolean(key?.startsWith("pk_test_"));
}

export function isLiveStripePublishableKey(
  key: string | null | undefined,
): boolean {
  return Boolean(key?.startsWith("pk_live_"));
}

export function hostedStripePublishableKeyIsSafe(
  key: string | null | undefined,
): boolean {
  if (!isHostedPayInFullEnvironmentAllowed()) {
    return false;
  }
  const env = getStudentpayEnv();
  if (env === "sandbox") {
    return isTestStripePublishableKey(key) && !isLiveStripePublishableKey(key);
  }
  if (env === "production") {
    return isLiveStripePublishableKey(key) && !isTestStripePublishableKey(key);
  }
  return false;
}

export function courseEnrolmentPaymentOptions(
  course: Pick<NzCourse, "enrolmentPaymentOptions">,
): readonly NzEnrolmentPaymentOption[] {
  if (course.enrolmentPaymentOptions && course.enrolmentPaymentOptions.length > 0) {
    return course.enrolmentPaymentOptions;
  }
  return DEFAULT_ENROLMENT_PAYMENT_OPTIONS;
}

export function courseAllowsPayInFull(
  course: Pick<NzCourse, "enrolmentPaymentOptions">,
): boolean {
  return courseEnrolmentPaymentOptions(course).includes("pay_in_full");
}

export function providerAllowsPayInFull(tenant: NzTenant): boolean {
  const option = tenant.checkout.paymentOptions.pay_in_full;
  return option.enabled === true && option.comingSoon !== true;
}

export function resolveHostedPayInFullEligibility(input: {
  tenant: NzTenant;
  course: Pick<NzCourse, "enrolmentPaymentOptions">;
}): NzHostedEligibility & {
  providerEnabled: boolean;
  courseAllows: boolean;
} {
  const environmentAllowed = isHostedPayInFullEnvironmentAllowed();
  const providerEnabled = providerAllowsPayInFull(input.tenant);
  const courseAllows = courseAllowsPayInFull(input.course);
  const paymentPlanAvailable =
    courseEnrolmentPaymentOptions(input.course).includes("payment_plan") &&
    input.tenant.checkout.paymentOptions.interest_free_payment_plan.enabled === true;
  return {
    environmentAllowed,
    providerEnabled,
    courseAllows,
    payInFullAvailable: environmentAllowed && providerEnabled && courseAllows,
    paymentPlanAvailable,
  };
}

export function apiAmountToCents(
  amount: number | string | null | undefined,
): number | null {
  if (amount == null || amount === "") {
    return null;
  }
  try {
    return dollarsToCents(amount);
  } catch {
    return null;
  }
}

export function authoritativePayInFullPriceCents(input: {
  catalogueCents: number;
  serverCoursePrice?: number | string | null;
}): number {
  const serverCents = apiAmountToCents(input.serverCoursePrice);
  if (serverCents != null && serverCents > 0) {
    return serverCents;
  }
  return input.catalogueCents;
}

export function publicCardPayment(card: {
  required?: boolean;
  success?: boolean;
  payment_status?: string | null;
  amount?: number | null;
  client_secret?: string;
  publishable_key?: string | null;
  ledger_posted?: boolean;
  stripe_status?: string | null;
} | null | undefined) {
  if (!card) {
    return null;
  }
  return {
    required: Boolean(card.required),
    success: Boolean(card.success),
    payment_status: card.payment_status || null,
    amount: card.amount ?? null,
    ledger_posted: Boolean(card.ledger_posted),
    stripe_status: card.stripe_status || null,
    publishable_key: card.publishable_key || null,
    ...(card.client_secret ? { client_secret: card.client_secret } : {}),
  };
}
