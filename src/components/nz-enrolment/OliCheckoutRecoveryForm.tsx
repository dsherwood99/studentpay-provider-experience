"use client";

import { useState } from "react";
import {
  draftStorageKey,
  isOliRecoverableCheckoutId,
  recoveryDeniedMessage,
  studentFromRecoveryPayload,
} from "@/lib/nz-enrolment/checkout-recovery";

type Props = {
  initialCheckoutId?: string;
};

export function OliCheckoutRecoveryForm({ initialCheckoutId = "" }: Props) {
  const [checkoutId, setCheckoutId] = useState(initialCheckoutId);
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!isOliRecoverableCheckoutId(checkoutId)) {
      setError(recoveryDeniedMessage("RECOVERY_NOT_AVAILABLE"));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/enrolment-checkout/recovery", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkout_id: checkoutId.trim(),
          email: email.trim(),
          date_of_birth: dateOfBirth.trim(),
        }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        redirect?: string;
        course_slug?: string;
        student?: Parameters<typeof studentFromRecoveryPayload>[0];
        error?: { code?: string; message?: string };
      };
      if (!response.ok || json.success === false) {
        setError(recoveryDeniedMessage(json.error?.code));
        return;
      }
      const courseSlug = json.course_slug || "";
      if (json.student && courseSlug) {
        try {
          window.sessionStorage.setItem(
            draftStorageKey("oli", courseSlug),
            JSON.stringify({
              student: studentFromRecoveryPayload(json.student),
              upfrontAmountCents: 0,
              frequency: "Weekly",
              numberOfInstalments: 0,
              firstPaymentDate: "",
            }),
          );
        } catch {
          // Cookie session is enough to resume Direct Debit / confirm.
        }
      }
      window.location.assign(json.redirect || `/enrol/oli/${courseSlug}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} style={{ display: "grid", gap: 12 }}>
      <label>
        Enrolment reference
        <input
          name="checkout_id"
          value={checkoutId}
          onChange={(event) => setCheckoutId(event.target.value)}
          autoComplete="off"
          required
          style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
        />
      </label>
      <label>
        Email
        <input
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
        />
      </label>
      <label>
        Date of birth
        <input
          name="date_of_birth"
          type="date"
          value={dateOfBirth}
          onChange={(event) => setDateOfBirth(event.target.value)}
          autoComplete="bday"
          required
          style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
        />
      </label>
      {error ? (
        <p role="alert" style={{ color: "#8a1f11" }}>
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy}>
        {busy ? "Resuming enrolment…" : "Resume enrolment"}
      </button>
    </form>
  );
}
