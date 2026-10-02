import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { isNzHostedReviewMode } from "./review-mode.ts";
import type { NzCourse, NzProviderStudentAgreement, NzTenant } from "./types.ts";

type ReviewDraftArtefact = {
  htmlFile: string;
  metaFile: string;
};

const REVIEW_DRAFT_DIR = path.join(
  process.cwd(),
  "docs/provider-terms-architecture/artefacts",
);

/**
 * Certified draft artefacts already in the repo. Review mode may display one.
 * It is not an in-force agreement and is not attached outside review mode.
 */
const REVIEW_DRAFT_ARTEFACTS: Record<string, ReviewDraftArtefact> = {
  BELA_NZ: {
    htmlFile: "BELA_NZ_agreement_skeleton.html",
    metaFile: "BELA_NZ_agreement_skeleton.meta.json",
  },
};

type DraftMeta = {
  status?: string;
  activationPermitted?: boolean;
  availableForStudentAcceptance?: boolean;
  version?: string;
  agreementKey?: string;
  contentHash?: string;
};

function readArtefact(fileName: string): string | null {
  try {
    return readFileSync(path.join(REVIEW_DRAFT_DIR, fileName), "utf8");
  } catch {
    return null;
  }
}

export function loadCertifiedReviewDraft(
  providerCode: string,
): NzProviderStudentAgreement | null {
  const artefact = REVIEW_DRAFT_ARTEFACTS[providerCode.trim().toUpperCase()];
  if (!artefact) {
    return null;
  }
  const html = readArtefact(artefact.htmlFile);
  const metaRaw = readArtefact(artefact.metaFile);
  if (!html || !metaRaw) {
    return null;
  }
  let meta: DraftMeta;
  try {
    meta = JSON.parse(metaRaw) as DraftMeta;
  } catch {
    return null;
  }
  const contentHash = createHash("sha256").update(html).digest("hex");
  const version = String(meta.version || "").trim();
  const key = String(meta.agreementKey || "").trim();
  const titleMatch = html.match(/<h1>([^<]+)<\/h1>/);
  const title = titleMatch?.[1]?.trim() || "";
  if (
    meta.status !== "DRAFT_NOT_ACTIVE" ||
    meta.activationPermitted !== false ||
    meta.availableForStudentAcceptance !== false ||
    !version ||
    !key ||
    !title ||
    !meta.contentHash ||
    contentHash !== meta.contentHash ||
    !html.includes('data-agreement-status="DRAFT_NOT_ACTIVE"') ||
    !html.includes('data-student-acceptance="false"')
  ) {
    return null;
  }
  return {
    type: "provider_student_agreement",
    title,
    version,
    key,
    content_hash: contentHash,
    html,
    effective_from: null,
    reviewOnly: true,
    acceptancePermitted: false,
  };
}

/**
 * Attaches a certified draft for visual review when no in-force agreement
 * exists. Leaves legalGateClosed set so create and confirm stay closed.
 */
export function presentHostedCourseForReview(
  tenant: NzTenant,
  course: NzCourse,
): NzCourse {
  if (!isNzHostedReviewMode() || course.catalogueOnly || course.providerStudentAgreement) {
    return course;
  }
  const draft = loadCertifiedReviewDraft(tenant.providerCode);
  if (!draft) {
    return course;
  }
  return {
    ...course,
    providerStudentAgreement: draft,
  };
}
