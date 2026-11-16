"use client";

import { useState } from "react";

export function ResumeEnrolment() {
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const credential = window.location.hash.replace(/^#/, "");
    if (!credential.startsWith("enrol_")) {
      setMessage("This resume link is not valid.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/studentpay/au-enrolments/resume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ credential, dateOfBirth }),
      });
      const result = await response.json() as { ok?: boolean; enrolmentId?: string; message?: string };
      if (!response.ok || !result.enrolmentId) {
        setMessage(result.message || "This enrolment cannot be resumed.");
        return;
      }
      window.location.assign(
        `/providers/academy-australia/courses/bridal-freelancer-bundle/enrol?enrolment=${encodeURIComponent(result.enrolmentId)}`,
      );
    } catch {
      setMessage("Enrolment could not be confirmed. You can try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="container au-plan-form">
        <h1>Resume enrolment</h1>
        <p>Enter the date of birth on the application to continue.</p>
        <form onSubmit={submit}>
          <label>
            Date of birth
            <input
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              required
            />
          </label>
          {message ? <p role="status">{message}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Checking" : "Continue"}
          </button>
        </form>
      </div>
    </section>
  );
}
