import {
  POWERED_BY_LABEL,
  STUDENTPAY_POWERED_BY_LOGO_ALT,
  STUDENTPAY_POWERED_BY_LOGO_SRC,
} from "@/lib/nz-enrolment/checkout-ui";
import styles from "./enrolment-checkout.module.css";

export function StudentPayAttribution() {
  return (
    <p className={styles.powered} data-testid="nz-studentpay-attribution">
      <span className={styles.poweredLabel}>{POWERED_BY_LABEL}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={STUDENTPAY_POWERED_BY_LOGO_SRC}
        alt={STUDENTPAY_POWERED_BY_LOGO_ALT}
        className={styles.poweredLogo}
      />
    </p>
  );
}
