"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FileText } from "lucide-react";
import { NzPaymentCalendar } from "@/components/nz-enrolment/NzPaymentCalendar";
import {
  hostedLegalDocumentHref,
  openLegalAgreementDocument,
  shouldUseDesktopLegalPopup,
  type HostedLegalKind,
} from "@/lib/nz-enrolment/legal-popup";
import { formatDdMmYyyy } from "@/lib/nz-enrolment/payment-calendar";
import { NZ_REGIONS } from "@/lib/nz-enrolment/nz-regions";
import { formatNzdFromCents } from "@/lib/nz-enrolment/plan-math";
import {
  combinedDetailsPrivacyAccepted,
  setCombinedDetailsPrivacyDeclaration,
} from "@/lib/nz-enrolment/checkout-ui";
import type { FirstPaymentDateWindow } from "@/lib/nz-enrolment/first-payment-window";
import type {
  NzPlanPreview,
  NzPublicCourse,
  NzPublicTenant,
  NzStudentDetails,
} from "@/lib/nz-enrolment/types";
import { validateStudentDetails } from "@/lib/nz-enrolment/validation";
import styles from "./bela-au-checkout.module.css";

type PlanLabels = {
  regularCountLabel: string;
  totalLabel: string;
};

type ProviderAgreement = {
  title: string;
  html: string;
  version?: string;
  reviewOnly?: boolean;
};

type Props = {
  tenant: NzPublicTenant;
  course: NzPublicCourse;
  student: NzStudentDetails;
  fieldErrors: Record<string, string>;
  onStudentChange: <K extends keyof NzStudentDetails>(field: K, value: NzStudentDetails[K]) => void;
  onFieldErrors: (errors: Record<string, string>) => void;
  firstPaymentDate: string;
  paymentWindow: FirstPaymentDateWindow;
  onFirstPaymentDate: (iso: string) => void;
  preview: NzPlanPreview | null;
  plan: PlanLabels | null;
  offerLabel: string | null;
  kitLabel: string | null;
  declarations: {
    payment_plan_accepted: boolean;
    information_confirmed: boolean;
    privacy_consent_accepted: boolean;
    provider_student_agreement_accepted: boolean;
  };
  onDeclarations: (next: Props["declarations"]) => void;
  providerAgreement: ProviderAgreement | null;
  bankPhase: "idle" | "preparing" | "ready" | "failed" | "complete";
  bankError: string | null;
  onStartBank: () => void;
};

const CONSENT =
  "I have read and agree to the agreements above and authorise StudentPay to administer my payment plan.";

export function BelaAuCheckout({
  tenant,
  course,
  student,
  fieldErrors,
  onStudentChange,
  onFieldErrors,
  firstPaymentDate,
  paymentWindow,
  onFirstPaymentDate,
  preview,
  plan,
  offerLabel,
  kitLabel,
  declarations,
  onDeclarations,
  providerAgreement,
  bankPhase,
  bankError,
  onStartBank,
}: Props) {
  const [consentMessage, setConsentMessage] = useState("");
  const [studentAgreementOpen, setStudentAgreementOpen] = useState(false);
  const [enrolStarted, setEnrolStarted] = useState(false);
  const accepted =
    declarations.payment_plan_accepted &&
    combinedDetailsPrivacyAccepted(declarations) &&
    declarations.provider_student_agreement_accepted;
  const weekly =
    preview != null ? `${formatNzdFromCents(preview.regularInstalmentAmountCents)}/week` : null;
  const courseTitle = weekly ? `${course.name} ${weekly}` : course.name;
  const upfrontCents = preview?.upfrontAmountCents ?? 0;
  const debitNote =
    preview?.hasResidualFinal
      ? "This course has no separate initial debit. The last payment is smaller than the weekly amount."
      : upfrontCents > 0
        ? "The upfront amount is debited separately from the weekly payments."
        : "This course has no separate initial debit.";
  const regionValue = student.region || student.city || "";
  const knownRegion = (NZ_REGIONS as readonly string[]).includes(regionValue);
  const regionOptions = knownRegion || !regionValue ? NZ_REGIONS : [regionValue, ...NZ_REGIONS];

  useEffect(() => {
    if (student.country !== "New Zealand") {
      onStudentChange("country", "New Zealand");
    }
  }, [onStudentChange, student.country]);

  function setConsent(checked: boolean) {
    onDeclarations({
      ...setCombinedDetailsPrivacyDeclaration(checked),
      payment_plan_accepted: checked,
      provider_student_agreement_accepted: checked,
    });
    if (checked) {
      setConsentMessage("");
    }
  }

  function enrolNow() {
    const errors = validateStudentDetails({ ...student, country: "New Zealand" });
    onFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      document.getElementById("your-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!accepted) {
      setConsentMessage("Accept the agreement before bank authorisation.");
      document.getElementById("agreements")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setConsentMessage("");
    setEnrolStarted(true);
    document.getElementById("bank-authorisation")?.scrollIntoView({ behavior: "smooth", block: "start" });
    onStartBank();
  }

  const bankVisible = enrolStarted || bankPhase === "complete";
  const phase: Props["bankPhase"] =
    enrolStarted && bankPhase === "idle" ? "preparing" : bankPhase;

  return (
    <div className={styles.page} data-testid="nz-enrolment-single-page">
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <img
            src={tenant.branding.logoPath || "/nz-enrolment/bela/logo.png"}
            alt={tenant.displayName}
            className={styles.logo}
          />
          <div className={styles.powered}>
            <img src="/studentpay/studentpay-logo.png" alt="" className={styles.poweredMark} />
            <span>Powered by StudentPay</span>
          </div>
        </div>
      </header>
      <div className={styles.layout}>
        <div className={styles.formColumn}>
          <nav className={styles.steps} aria-label="Checkout steps">
            <a href="#your-details">1. Your details</a>
            <a href="#repayment-date">2. Repayment date</a>
            <a href="#agreements">3. Agreement</a>
            <a href="#bank-authorisation">4. Bank authorisation</a>
          </nav>

          <section id="your-details" className={styles.card}>
            <h2>Student details</h2>
            <div className={styles.pair}>
              <Field label="Legal first name" error={fieldErrors.firstName}>
                <input
                  name="given-name"
                  autoComplete="given-name"
                  value={student.firstName}
                  onChange={(event) => onStudentChange("firstName", event.target.value)}
                />
              </Field>
              <Field label="Legal last name" error={fieldErrors.lastName}>
                <input
                  name="family-name"
                  autoComplete="family-name"
                  value={student.lastName}
                  onChange={(event) => onStudentChange("lastName", event.target.value)}
                />
              </Field>
            </div>
            <Field label="Date of birth" error={fieldErrors.dateOfBirth}>
              <input
                type="date"
                name="bday"
                autoComplete="bday"
                value={student.dateOfBirth}
                onChange={(event) => onStudentChange("dateOfBirth", event.target.value)}
              />
            </Field>
            <Field label="Email" error={fieldErrors.email}>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={student.email}
                onChange={(event) => onStudentChange("email", event.target.value)}
              />
            </Field>
            <Field label="Mobile number" error={fieldErrors.mobile}>
              <input
                type="tel"
                name="tel"
                autoComplete="tel"
                value={student.mobile}
                onChange={(event) => onStudentChange("mobile", event.target.value)}
              />
            </Field>
            <Field label="Street address" error={fieldErrors.streetAddress}>
              <input
                name="address-line1"
                autoComplete="address-line1"
                value={student.streetAddress}
                onChange={(event) => onStudentChange("streetAddress", event.target.value)}
              />
            </Field>
            <div className={styles.pair}>
              <Field label="Suburb" error={fieldErrors.suburb}>
                <input
                  name="address-level3"
                  autoComplete="address-level2"
                  value={student.suburb}
                  onChange={(event) => onStudentChange("suburb", event.target.value)}
                />
              </Field>
              <Field label="Region" error={fieldErrors.region || fieldErrors.city}>
                <select
                  name="address-level1"
                  autoComplete="address-level1"
                  value={regionValue}
                  onChange={(event) => {
                    onStudentChange("region", event.target.value);
                    onStudentChange("city", event.target.value);
                  }}
                >
                  <option value="">Select a region</option>
                  {regionOptions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className={styles.pair}>
              <Field label="Postcode" error={fieldErrors.postcode}>
                <input
                  name="postal-code"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  value={student.postcode}
                  onChange={(event) => onStudentChange("postcode", event.target.value)}
                />
              </Field>
              <Field label="Country">
                <input name="country" autoComplete="country-name" value="New Zealand" readOnly />
              </Field>
            </div>
          </section>

          <section id="repayment-date" className={styles.card}>
            <h2>Payment details</h2>
            <div className={styles.paymentGrid}>
              <div>
                <p className={styles.dateLabel}>
                  First payment date <span aria-hidden="true">*</span>
                </p>
                <p className={styles.copy}>
                  Choose the date the first weekly direct debit is taken.
                </p>
                <p className={styles.selectedDate} aria-live="polite">
                  <span>Selected date</span>
                  <strong>{formatDdMmYyyy(firstPaymentDate)}</strong>
                </p>
                <p className={styles.dateHelp}>
                  Highlighted dates can be selected. Choose another to change this date.
                </p>
              </div>
              <NzPaymentCalendar
                value={firstPaymentDate}
                window={paymentWindow}
                onChange={onFirstPaymentDate}
              />
            </div>
          </section>

          <section id="agreements" className={styles.card}>
            <h2>Agreements & consent</h2>
            <p className={styles.copy}>Please review the following documents before continuing.</p>
            <div className={styles.documents}>
              <DocumentLink
                label="Payment Plan Agreement"
                onOpen={(event) => openHostedDocument(event, "payment-plan")}
              />
              <DocumentLink
                label="Direct Debit Service Agreement"
                onOpen={(event) => openHostedDocument(event, "direct-debit")}
              />
              <DocumentLink
                label="Student Agreement"
                onOpen={() => {
                  if (providerAgreement?.html) {
                    setStudentAgreementOpen(true);
                    return;
                  }
                  window.open(tenant.termsUrl, "_blank", "noopener");
                }}
              />
              <DocumentLink
                label="Privacy Policy"
                href={tenant.privacyUrl}
              />
            </div>
            <div className={styles.consent}>
              <p className={styles.consentLead}>Your agreement is required.</p>
              <label>
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>{CONSENT}</span>
              </label>
              {consentMessage ? <p className={styles.error}>{consentMessage}</p> : null}
            </div>
          </section>

          <section id="bank-authorisation" className={styles.card}>
            <h2>Bank authorisation</h2>
            {phase === "complete" ? (
              <div>
                <p className={styles.success}>Your payment plan is set up!</p>
                <p className={styles.complete}>✓ Setup Complete</p>
              </div>
            ) : (
              <>
                <p className={styles.copy}>
                  {phase === "failed"
                    ? bankError || "Bank setup did not finish. Try again on this application."
                    : phase === "preparing"
                      ? "You can enter bank details while setup finishes."
                      : phase === "ready"
                        ? "Continue in the secure bank authorisation window. This page stays open."
                        : accepted
                          ? "Bank authorisation starts when you enrol."
                          : "Accept the agreement before bank authorisation."}
                </p>
                {bankVisible ? (
                  <button
                    type="button"
                    className={styles.button}
                    disabled={phase === "preparing"}
                    onClick={() => {
                      if (!accepted) {
                        setConsentMessage("Accept the agreement before bank authorisation.");
                        return;
                      }
                      onStartBank();
                    }}
                  >
                    {phase === "preparing" ? (
                      <>
                        <Spinner /> Preparing secure bank authorisation…
                      </>
                    ) : phase === "failed" ? (
                      "Try again"
                    ) : (
                      "Authorise bank account"
                    )}
                  </button>
                ) : null}
              </>
            )}
          </section>

          {bankVisible ? null : (
            <button type="button" className={styles.button} onClick={enrolNow}>
              Enrol Now
            </button>
          )}
        </div>

        <aside className={styles.summary} data-testid="nz-enrolment-summary">
          <p className={styles.providerName}>{tenant.displayName}</p>
          <h1>{courseTitle}</h1>
          {offerLabel ? <p className={styles.offer}>{offerLabel}</p> : null}
          {kitLabel ? <p className={styles.exclusion}>Kit Not Included</p> : null}
          <p className={styles.priceLabel}>Course price</p>
          <p className={styles.price} data-testid="nz-authoritative-price">
            {formatNzdFromCents(course.paymentPlanCourseFeeCents)}
          </p>
          <dl>
            <div>
              <dt>Course price</dt>
              <dd>{formatNzdFromCents(course.paymentPlanCourseFeeCents)}</dd>
            </div>
            <div>
              <dt>Upfront payment</dt>
              <dd>{preview ? formatNzdFromCents(preview.upfrontAmountCents) : "—"}</dd>
            </div>
          </dl>
          <p className={styles.debitNote}>{debitNote}</p>
          <dl>
            <div>
              <dt>Weekly instalment</dt>
              <dd>{preview ? formatNzdFromCents(preview.regularInstalmentAmountCents) : "—"}</dd>
            </div>
            <div>
              <dt>Weekly repayments</dt>
              <dd>{preview ? String(preview.numberOfInstalments) : "—"}</dd>
            </div>
            {preview?.hasResidualFinal && preview.finalInstalmentAmountCents != null ? (
              <div>
                <dt>Final payment</dt>
                <dd>{formatNzdFromCents(preview.finalInstalmentAmountCents)}</dd>
              </div>
            ) : null}
            <div className={styles.totalRow}>
              <dt>Total</dt>
              <dd>{plan?.totalLabel ?? formatNzdFromCents(course.paymentPlanCourseFeeCents)}</dd>
            </div>
          </dl>
          <p className={styles.note}>Choose the date of the first weekly payment. The available dates are shown in the form.</p>
          <p className={styles.footerNote}>
            These are the only amounts for this course. A debit does not start until the student submits and StudentPay approves it.
          </p>
        </aside>
      </div>
      {studentAgreementOpen && providerAgreement ? (
        <div className={styles.dialogBackdrop} role="presentation" onClick={() => setStudentAgreementOpen(false)}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label="Student Agreement"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={styles.dialogBody}
              dangerouslySetInnerHTML={{ __html: providerAgreement.html }}
            />
            <button type="button" className={styles.dialogClose} onClick={() => setStudentAgreementOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {error ? <small className={styles.error}>{error}</small> : null}
    </label>
  );
}

function DocumentLink({
  label,
  href,
  onOpen,
}: {
  label: string;
  href?: string;
  onOpen?: (event: { preventDefault: () => void; currentTarget: HTMLAnchorElement }) => void;
}) {
  return (
    <a
      className={styles.document}
      href={href || "#agreements"}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
      onClick={(event) => {
        if (onOpen) {
          onOpen(event);
        }
      }}
    >
      <FileText size={16} aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}

function openHostedDocument(
  event: { preventDefault: () => void; currentTarget: HTMLAnchorElement },
  kind: HostedLegalKind,
) {
  const href = hostedLegalDocumentHref(kind);
  openLegalAgreementDocument({
    href,
    preferDesktopPopup: shouldUseDesktopLegalPopup({
      innerWidth: window.innerWidth,
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints,
    }),
    screen: {
      screenX: window.screenX,
      screenY: window.screenY,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
    },
    openWindow: (url, name, features) => window.open(url, name, features),
    event: event as unknown as Parameters<typeof openLegalAgreementDocument>[0]["event"],
  });
}

function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}
