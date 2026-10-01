import { jsonError } from "./errors.ts";
import { resolveHostedPayInFullEligibility } from "./pay-in-full.ts";
import type { NzCourse, NzTenant } from "./types.ts";

/**
 * Explicit hosted review flag. Off unless NZ_HOSTED_REVIEW_MODE is set on
 * this deployment. Ordinary customer checkouts do not set it.
 * The flag is read on the server. Client components receive it as a prop.
 */
function reviewModeFlag(): "on" | "off" | "unset" {
  const flag = process.env.NZ_HOSTED_REVIEW_MODE?.trim().toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes" || flag === "on") {
    return "on";
  }
  if (flag === "false" || flag === "0" || flag === "no" || flag === "off") {
    return "off";
  }
  return "unset";
}

export function isNzHostedReviewMode(): boolean {
  if (process.env.HOSTED_PRODUCT_MODE?.trim().toLowerCase() !== "nz_enrolment") {
    return false;
  }
  const flag = reviewModeFlag();
  if (flag === "on") {
    return true;
  }
  if (flag === "off") {
    return false;
  }
  // A Bela preview is the review checkout. Production customer deployments
  // leave the flag unset and stay on the normal agreement gate.
  return (
    process.env.VERCEL_ENV === "preview" &&
    process.env.NZ_HOSTED_TENANT_SLUG?.trim().toLowerCase() === "bela-nz"
  );
}

export const NZ_REVIEW_ENVIRONMENT_BANNER =
  "Review environment — no enrolment or payment will be created";

export const REVIEW_DIRECT_DEBIT_MESSAGE =
  "Review mode: Direct Debit was not sent to GoCardless. No authority was created.";

export const REVIEW_CONFIRMATION_HEADING = "Review complete";

export const REVIEW_CONFIRMATION_LEAD =
  "No enrolment, Direct Debit authority, or payment was created.";

export const REVIEW_DRAFT_AGREEMENT_NOTE =
  "Draft agreement shown for review only. It is not active and cannot be accepted for a real enrolment.";

export function legalGateBlocksHostedCheckout(
  course: { legalGateClosed?: boolean },
  reviewMode: boolean,
): boolean {
  return Boolean(course.legalGateClosed) && reviewMode !== true;
}

/**
 * Display-only eligibility. Does not clear the course flag the create and
 * confirm routes still enforce.
 */
export function reviewDisplayEligibility(tenant: NzTenant, course: NzCourse) {
  if (!isNzHostedReviewMode() || course.catalogueOnly) {
    return resolveHostedPayInFullEligibility({ tenant, course });
  }
  return resolveHostedPayInFullEligibility({
    tenant,
    course: { ...course, legalGateClosed: false },
  });
}

export function reviewModeMutationResponse(): Response | null {
  if (!isNzHostedReviewMode()) {
    return null;
  }
  return jsonError(
    403,
    "REVIEW_MODE",
    "Review mode does not create enrolments, Direct Debit authorities, or payments.",
  );
}

export function reviewDirectDebitAdvance() {
  return {
    setupComplete: true as const,
    setupUrl: "" as const,
    checkoutId: null,
    callsGoCardless: false as const,
    createsDirectDebitAuthority: false as const,
    postsProviderCheckout: false as const,
    message: REVIEW_DIRECT_DEBIT_MESSAGE,
  };
}

export function reviewConfirmAdvance() {
  return {
    confirmed: true as const,
    agreementNumber: null,
    checkoutStatus: "review_complete" as const,
    postsProviderCheckout: false as const,
    createsPayment: false as const,
    message: REVIEW_CONFIRMATION_LEAD,
  };
}
