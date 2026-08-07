"use client";

import { useEffect, useState } from "react";

type DdaSetupEmbedProps = {
  setupUrl: string;
  studentFirstName: string;
  courseTitle: string;
  onAuthorised: () => void;
  onRestart?: () => void;
};

type DdaMessage =
  | {
      type?: string;
      event?: string;
      status?: string;
      source?: string;
      ddaId?: string;
      opportunityId?: string;
    }
  | string;

function isAuthorisedMessage(data: DdaMessage): boolean {
  if (typeof data === "string") {
    const normalised = data.toLowerCase();
    return (
      normalised.includes("dda") &&
      (normalised.includes("authoris") ||
        normalised.includes("complete") ||
        normalised.includes("success"))
    );
  }

  if (
    data.type === "studentpay:dda-authorised" &&
    data.status === "authorised"
  ) {
    return true;
  }

  const type =
    `${data.type || ""} ${data.event || ""} ${data.status || ""} ${data.source || ""}`.toLowerCase();

  return (
    (type.includes("dda") ||
      type.includes("direct_debit") ||
      type.includes("direct-debit") ||
      type.includes("studentpay")) &&
    (type.includes("authoris") ||
      type.includes("complete") ||
      type.includes("success") ||
      type.includes("done"))
  );
}

export function DdaSetupEmbed({
  setupUrl,
  studentFirstName,
  courseTitle,
  onAuthorised,
  onRestart,
}: DdaSetupEmbedProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const trustedOrigins = [
        "https://api.studentpay.com.au",
        "https://sandbox-api.studentpay.com.au",
      ];

      if (
        typeof event.origin === "string" &&
        event.origin.startsWith("http") &&
        !trustedOrigins.includes(event.origin) &&
        !event.origin.includes("studentpay") &&
        !event.origin.includes("getpinch")
      ) {
        return;
      }

      if (!event.data) {
        return;
      }

      if (isAuthorisedMessage(event.data as DdaMessage)) {
        onAuthorised();
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onAuthorised]);

  return (
    <section className="dda-setup">
      <div className="page-shell dda-setup__shell">
        <header className="dda-setup__header">
          <p className="enrolment-wizard__eyebrow">Direct debit authority</p>
          <h1>Authorise your StudentPay payment plan, {studentFirstName}.</h1>
          <p className="dda-setup__lead">
            Secure bank capture for {courseTitle} is embedded below. Complete
            the authority to continue enrolment confirmation.
          </p>
        </header>

        <div className="dda-setup__frame-wrap">
          {!iframeLoaded ? (
            <div className="dda-setup__loading" aria-live="polite">
              Loading bank capture…
            </div>
          ) : null}

          <iframe
            className="dda-setup__iframe"
            src={setupUrl}
            title="StudentPay direct debit bank capture"
            allow="payment *"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setIframeLoaded(true)}
          />
        </div>

        <div className="dda-setup__footer">
          <a
            className="button button--secondary"
            href={setupUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open bank capture in a new tab
          </a>
          {onRestart ? (
            <button
              type="button"
              className="button button--secondary"
              onClick={onRestart}
            >
              Cancel and return
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
