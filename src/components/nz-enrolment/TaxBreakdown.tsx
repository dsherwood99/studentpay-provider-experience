import { gstInclusiveDisplayRows } from "@/lib/nz-enrolment/tax-presentation";
import type { NzTaxPresentation } from "@/lib/nz-enrolment/types";
import styles from "./tax-breakdown.module.css";

type Props = {
  grossCents: number;
  tax: NzTaxPresentation;
  testId?: string;
};

export function TaxBreakdown({ grossCents, tax, testId }: Props) {
  const rows = gstInclusiveDisplayRows(grossCents, tax);
  if (!rows) {
    return null;
  }
  return (
    <dl className={styles.breakdown} data-testid={testId || "nz-gst-breakdown"}>
      {rows.map((row) => (
        <div key={row.label} className={styles.row}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
