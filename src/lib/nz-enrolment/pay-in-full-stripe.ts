import type {
  Stripe,
  StripeElements,
  StripeError,
  PaymentIntentResult,
} from "@stripe/stripe-js";

export type PayInFullStripeConfirmInput = {
  stripe: Pick<Stripe, "confirmPayment">;
  elements: Pick<StripeElements, "submit">;
  clientSecret: string;
  returnUrl: string;
};

export type PayInFullStripeConfirmResult = {
  confirmCalled: boolean;
  error?: StripeError;
  paymentIntent?: PaymentIntentResult["paymentIntent"];
};

/**
 * Payment Element requires elements.submit() immediately on Pay, before
 * confirmPayment() and before any other async work.
 */
export async function confirmPayInFullElementsPayment(
  input: PayInFullStripeConfirmInput,
): Promise<PayInFullStripeConfirmResult> {
  const { error: submitError } = await input.elements.submit();
  if (submitError) {
    return { confirmCalled: false, error: submitError };
  }
  const result = await input.stripe.confirmPayment({
    elements: input.elements as StripeElements,
    clientSecret: input.clientSecret,
    confirmParams: {
      return_url: input.returnUrl,
    },
    redirect: "if_required",
  });
  return {
    confirmCalled: true,
    error: result.error,
    paymentIntent: result.paymentIntent,
  };
}
