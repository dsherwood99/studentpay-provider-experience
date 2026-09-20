export const PROVIDER_STUDENT_AGREEMENT_TYPE = "provider_student_agreement";

export type HostedProviderStudentAgreement = {
  type: typeof PROVIDER_STUDENT_AGREEMENT_TYPE;
  title: string;
  version: string;
  key: string;
  content_hash: string;
  html: string;
  effective_from?: string | null;
};

export type ApiProviderStudentAgreement = {
  type?: string;
  title?: string;
  version?: string;
  key?: string;
  content_hash?: string;
  html?: string;
  effective_from?: string | null;
};

export function parseHostedProviderStudentAgreement(
  raw: ApiProviderStudentAgreement | null | undefined,
): HostedProviderStudentAgreement | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const type = String(raw.type || "").trim();
  const title = String(raw.title || "").trim();
  const version = String(raw.version || "").trim();
  const key = String(raw.key || "").trim();
  const contentHash = String(raw.content_hash || "").trim();
  const html = String(raw.html || "").trim();
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (
    type !== PROVIDER_STUDENT_AGREEMENT_TYPE ||
    !title ||
    !version ||
    !key ||
    !contentHash ||
    text.length < 40
  ) {
    return null;
  }
  if (/<script\b/i.test(html) || /javascript:/i.test(html)) {
    return null;
  }
  return {
    type: PROVIDER_STUDENT_AGREEMENT_TYPE,
    title,
    version,
    key,
    content_hash: contentHash,
    html,
    effective_from: raw.effective_from || null,
  };
}

export function providerStudentAgreementAccepted(input: {
  required: boolean;
  accepted?: boolean;
}): boolean {
  return input.required ? input.accepted === true : true;
}

export function paymentPlanAgreementAccepted(input: {
  required: boolean;
  accepted?: boolean;
}): boolean {
  return input.required ? input.accepted === true : true;
}
