"use client";

type TermsModalType = "provider" | "studentpay" | "direct-debit";

type TermsModalProps = {
  type: TermsModalType;
  checkoutToken: string;
  providerName: string;
  providerCode: string;
  /** Must match the API that signed the checkout token (sandbox vs production). */
  legalApiBaseUrl: string;
  onClose: () => void;
};

export function TermsModal({
  type,
  checkoutToken,
  providerName,
  providerCode,
  legalApiBaseUrl,
  onClose,
}: TermsModalProps) {
  const apiBase = legalApiBaseUrl.replace(/\/$/, "");

  const content = {
    provider: {
      title: `${providerName} Terms & Conditions`,
      body: (
        <>
          <p>
            These are placeholder {providerName} enrolment terms for the
            Provider Experience test environment.
          </p>
          <p>
            The production version will contain the provider&apos;s approved
            enrolment, course, cancellation, refund and student-obligation
            terms.
          </p>
          <h4>Placeholder topics</h4>
          <p>
            Course enrolment, fees, deposit arrangements, cancellation rights,
            course delivery and student responsibilities.
          </p>
        </>
      ),
    },
    studentpay: {
      title: "Student Payment Plan Agreement",
      body: checkoutToken ? (
        <iframe
          className="legalTermsFrame"
          src={`${apiBase}/api/legal/payment-plan-terms?token=${encodeURIComponent(
            checkoutToken,
          )}`}
          title="Student Payment Plan Agreement"
          loading="lazy"
        />
      ) : (
        <div className="legalTermsUnavailable">
          <p>
            Your personalised Student Payment Plan Agreement will be available
            after the StudentPay payment plan has been created.
          </p>
          <p>Please complete the direct debit setup first.</p>
        </div>
      ),
    },
    "direct-debit": {
      title: "Direct Debit Service Agreement",
      body: (
        <iframe
          className="legalTermsFrame"
          src={`${apiBase}/api/legal-direct-debit-terms?provider_code=${encodeURIComponent(
            providerCode,
          )}`}
          title="StudentPay Direct Debit Request and Service Agreement"
          loading="lazy"
        />
      ),
    },
  } as const;

  const selected = content[type];

  return (
    <div
      className="termsModalBackdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="termsModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="px-terms-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="termsModalHeader">
          <h2 id="px-terms-modal-title">{selected.title}</h2>
          <button
            type="button"
            className="termsModalClose"
            aria-label="Close terms"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div
          className={
            type === "direct-debit" || type === "studentpay"
              ? "termsModalBody legalTermsModalBody"
              : "termsModalBody"
          }
        >
          {selected.body}
        </div>

        <div className="termsModalFooter">
          <button type="button" className="button button--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

export type { TermsModalType };
