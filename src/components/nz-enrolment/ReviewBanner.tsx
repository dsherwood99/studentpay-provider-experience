import { NZ_REVIEW_ENVIRONMENT_BANNER } from "@/lib/nz-enrolment/review-mode";
import styles from "./provider-chrome.module.css";

export function NzReviewBanner() {
  return (
    <p className={styles.reviewBanner} data-testid="nz-review-banner" role="status">
      {NZ_REVIEW_ENVIRONMENT_BANNER}
    </p>
  );
}
