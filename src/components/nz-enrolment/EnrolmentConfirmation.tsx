import { Check } from "lucide-react";
import {
  NZ_CONFIRMATION_COPY,
  type ConfirmationSummaryGroup,
  type ConfirmationSummaryRow,
  type PaymentPlanConfirmationNarrative,
} from "@/lib/nz-enrolment/checkout-ui";
import styles from "@/components/nz-enrolment/enrolment-checkout.module.css";

export function EnrolmentConfirmation({
  heading,
  lead,
  schedule,
  scheduleNote,
  rows,
  nextSteps,
  returnHref,
  returnLabel,
}: {
  heading: string;
  lead: string;
  schedule?: PaymentPlanConfirmationNarrative | null;
  scheduleNote?: string | null;
  rows: ConfirmationSummaryRow[];
  nextSteps?: readonly string[] | null;
  returnHref?: string | null;
  returnLabel?: string | null;
}) {
  const courseRows = rows.filter((row) => row.group === "course" || row.group === "payments");
  const referenceRows = rows.filter((row) => row.group === "references");

  return (
    <section className={styles.confirmation} aria-labelledby="nz-enrolment-confirmed-heading">
      <div className={styles.confirmationHero}>
        <span className={styles.successMark} aria-hidden="true">
          <Check strokeWidth={2.75} />
        </span>
        <h1 id="nz-enrolment-confirmed-heading">{heading}</h1>
        <p className={styles.lead}>{lead}</p>
      </div>
      {schedule ? (
        <div className={styles.confirmationSchedule} data-testid="nz-confirmation-repayment">
          <p className={styles.confirmationAmount}>
            <span className={styles.confirmationAmountValue}>{schedule.heroLabel}</span>
          </p>
          {schedule.upfrontLabel ? (
            <p className={styles.confirmationScheduleLine}>
              Upfront amount: <strong>{schedule.upfrontLabel}</strong>
            </p>
          ) : null}
          {schedule.firstPaymentLabel ? (
            <p className={styles.confirmationScheduleLine}>
              First payment: <strong>{schedule.firstPaymentLabel}</strong>
            </p>
          ) : null}
          {schedule.scheduleSentence ? (
            <p className={styles.confirmationScheduleLine}>{schedule.scheduleSentence}</p>
          ) : null}
          <p className={styles.confirmationTotal}>
            <span>Total amount payable</span>
            <strong>{schedule.totalLabel}</strong>
          </p>
        </div>
      ) : scheduleNote ? (
        <p className={styles.confirmationScheduleLine}>{scheduleNote}</p>
      ) : null}
      {courseRows.length > 0 ? (
        <ConfirmationGroups rows={courseRows} groups={["course", "payments"]} />
      ) : null}
      {nextSteps && nextSteps.length > 0 ? (
        <div className={styles.nextSteps} data-testid="nz-confirmation-next-steps">
          <p className={styles.nextStepsHeading}>{NZ_CONFIRMATION_COPY.nextStepsHeading}</p>
          <ol>
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
      {returnHref ? (
        <div className={styles.actions}>
          <a className={`${styles.btn} ${styles.btnPrimary}`} href={returnHref}>
            {returnLabel || "Return to provider"}
          </a>
        </div>
      ) : null}
      {referenceRows.length > 0 ? (
        <div className={styles.confirmationReferences}>
          <ConfirmationGroups rows={referenceRows} groups={["references"]} />
        </div>
      ) : null}
    </section>
  );
}

function ConfirmationGroups({
  rows,
  groups,
}: {
  rows: ConfirmationSummaryRow[];
  groups: readonly ConfirmationSummaryGroup[];
}) {
  const visible = groups.filter((group) => rows.some((row) => row.group === group));
  if (visible.length === 0) {
    return null;
  }
  return (
    <div className={styles.confirmationCard} data-testid="nz-enrolment-confirmed-summary">
      {visible.map((group) => (
        <div key={group} className={styles.confirmationGroup} data-group={group}>
          <dl className={styles.confirmationTable}>
            {rows
              .filter((row) => row.group === group)
              .map((row) => (
                <div
                  key={row.label}
                  className={styles.confirmationRow}
                  data-tone={row.tone || "default"}
                >
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
