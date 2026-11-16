"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  ACCOUNT_NUMBER_MAX_LENGTH,
  BANK_CAPTURE_SCRIPT,
  BSB_DIGIT_LENGTH,
  type BankField,
  type BankFieldErrors,
  createBankSourceToken,
  digitsOnly,
  formatBsb,
} from "@/lib/au-enrolment/bank-capture";

type CaptureResult = { ok: true; token: string } | { ok: false; message: string };

export type BankCaptureHandle = {
  tokenise(): Promise<CaptureResult>;
};

export const BankSourceCapture = forwardRef<BankCaptureHandle, { publishableKey: string }>(
  function BankSourceCapture({ publishableKey }, ref) {
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [accountName, setAccountName] = useState("");
    const [bsb, setBsb] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [errors, setErrors] = useState<BankFieldErrors>({});

    useEffect(() => {
      if (window.Pinch?.Capture) {
        setReady(true);
        return;
      }
      const script = document.createElement("script");
      script.src = BANK_CAPTURE_SCRIPT;
      script.async = true;
      script.onload = () => setReady(true);
      script.onerror = () => setFailed(true);
      document.head.appendChild(script);
    }, []);

    useImperativeHandle(ref, () => ({
      async tokenise() {
        if (failed || !ready || !publishableKey || !window.Pinch?.Capture) {
          return { ok: false, message: "Payment capture is unavailable. No plan was created." };
        }
        const outcome = await createBankSourceToken(
          async (input) => new window.Pinch!.Capture({ publishableKey }).createToken(input),
          { accountName, bsb, accountNumber },
        );
        if (!outcome.ok) {
          setErrors(outcome.errors);
          return { ok: false, message: outcome.message };
        }
        setBsb("");
        setAccountNumber("");
        setErrors({});
        return { ok: true, token: outcome.token };
      },
    }), [accountName, accountNumber, bsb, failed, publishableKey, ready]);

    function edit(field: BankField, value: string) {
      if (field === "accountName") setAccountName(value);
      if (field === "bsb") setBsb(digitsOnly(value, BSB_DIGIT_LENGTH));
      if (field === "accountNumber") setAccountNumber(digitsOnly(value, ACCOUNT_NUMBER_MAX_LENGTH));
      setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    }

    return (
      <div className="au-plan-fields" data-payment-source="capture">
        <p>
          Account details are sent only to Pinch in your browser. StudentPay
          receives a token, not the account number.
        </p>
        <label>
          Account name
          <input
            value={accountName}
            onChange={(event) => edit("accountName", event.target.value)}
            autoComplete="off"
            aria-invalid={Boolean(errors.accountName)}
          />
        </label>
        {errors.accountName ? <p role="alert">{errors.accountName}</p> : null}
        <label>
          BSB
          <input
            value={formatBsb(bsb)}
            onChange={(event) => edit("bsb", event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            maxLength={BSB_DIGIT_LENGTH + 1}
            aria-invalid={Boolean(errors.bsb)}
          />
        </label>
        {errors.bsb ? <p role="alert">{errors.bsb}</p> : null}
        <label>
          Account number
          <input
            value={accountNumber}
            onChange={(event) => edit("accountNumber", event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            maxLength={ACCOUNT_NUMBER_MAX_LENGTH}
            aria-invalid={Boolean(errors.accountNumber)}
          />
        </label>
        {errors.accountNumber ? <p role="alert">{errors.accountNumber}</p> : null}
      </div>
    );
  },
);
