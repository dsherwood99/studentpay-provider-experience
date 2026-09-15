"use client";

import { useEffect, useRef, useState } from "react";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import styles from "./enrolment-checkout.module.css";

type Props = {
  clientSecret: string;
  publishableKey: string;
  disabled?: boolean;
  onReady?: (api: { stripe: Stripe; elements: StripeElements }) => void;
  onError?: (message: string) => void;
};

export function PayInFullCardForm({
  clientSecret,
  publishableKey,
  disabled = false,
  onReady,
  onError,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onReady, onError]);

  useEffect(() => {
    let cancelled = false;
    let paymentElement: { unmount: () => void } | null = null;

    async function mount() {
      if (!clientSecret || !publishableKey.startsWith("pk_test_")) {
        onErrorRef.current?.("Card payment is not available.");
        return;
      }
      const { loadStripe } = await import("@stripe/stripe-js");
      const stripe = await loadStripe(publishableKey);
      if (!stripe || cancelled || !mountRef.current) {
        return;
      }
      const elements = stripe.elements({
        clientSecret,
        appearance: {
          theme: "stripe",
        },
      });
      const element = elements.create("payment", {
        layout: "tabs",
      });
      element.mount(mountRef.current);
      paymentElement = element;
      setReady(true);
      onReadyRef.current?.({ stripe, elements });
    }

    void mount().catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to load card payment.";
      onErrorRef.current?.(message);
    });

    return () => {
      cancelled = true;
      paymentElement?.unmount();
    };
  }, [clientSecret, publishableKey]);

  return (
    <div data-testid="nz-pay-in-full-stripe" data-ready={ready ? "true" : "false"}>
      <div
        ref={mountRef}
        className={styles.stripeElement}
        aria-disabled={disabled}
        aria-label="Card payment details"
      />
      {!ready ? (
        <p className={styles.note} role="status">
          Loading secure card payment…
        </p>
      ) : null}
    </div>
  );
}
