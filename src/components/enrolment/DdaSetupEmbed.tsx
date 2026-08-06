"use client";

import { useEffect, useState } from "react";

type DdaSetupEmbedProps = {
  setupUrl: string;
  studentFirstName: string;
  courseTitle: string;
  onComplete?: () => void;
  onRestart?: () => void;
};

type DdaMessage =
  | {
      type?: string;
      event?: string;
      status?: string;
      source?: string;
    }
  | string;

function isCompletionMessage(data: DdaMessage): boolean {
  if (typeof data === "string") {
    const normalised = data.toLowerCase();
    return (
      normalised.includes("dda") &&
      (normalised.includes("complete") ||
        normalised.includes("success") ||
        normalised.includes("done"))
    );
  }

  const type = `${data.type || ""} ${data.event || ""} ${data.status || ""} ${data.source || ""}`.toLowerCase();

  return (
    type.includes("dda") ||
    type.includes("dd-setup") ||
    type.includes("direct_debit") ||
    type.includes("direct-debit") ||
    type.includes("studentpay")
  ) && (
    type.includes("complete") ||
    type.includes("completed") ||
    type.includes("success") ||
    type.includes("done") ||
    type.includes("finished")
  );
}

export function DdaSetupEmbed({
  setupUrl,
  studentFirstName,
  courseTitle,
  onComplete,
  onRestart,
}: DdaSetupEmbedProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data) {
        return;
      }

      if (isCompletionMessage(event.data as DdaMessage)) {
        setIsComplete(true);
        onComplete?.();
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onComplete]);

  if (isComplete) {
    return (
      <section className="enrolment-complete">
        <div className="page-shell enrolment-complete__card">
          <div className="enrolment-complete__icon" aria-hidden="true">
            ✓
          </div>
          <p className="enrolment-wizard__eyebrow">Sandbox enrolment</p>
          <h1>Thanks, {studentFirstName}. Bank details captured.</h1>
          <p className="enrolment-complete__lead">
            Your StudentPay sandbox direct-debit setup for {courseTitle} is
            complete.
          </p>
          {onRestart ? (
            <div className="enrolment-complete__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={onRestart}
              >
                Start again
              </button>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="dda-setup">
      <div className="page-shell dda-setup__shell">
        <header className="dda-setup__header">
          <p className="enrolment-wizard__eyebrow">Payment setup</p>
          <h1>Enter your bank details to finish enrolment.</h1>
          <p className="dda-setup__lead">
            Secure Pinch test bank capture is embedded below. Use Pinch sandbox
            test account details to complete the direct-debit authority.
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
              Cancel and start again
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
