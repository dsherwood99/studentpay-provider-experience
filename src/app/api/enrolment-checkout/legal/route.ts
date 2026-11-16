import { jsonError } from "@/lib/nz-enrolment/errors";
import {
  applyHostedLegalDocumentPresentation,
  hostedLegalViewIsPopup,
  renderStudentAgreementDocument,
} from "@/lib/nz-enrolment/legal-branding";
import {
  readNzSession,
  requireNzApiBaseUrl,
  resolveAuthoritativeCourseContext,
  resolveTenantContext,
} from "@/lib/nz-enrolment/request-context";

export const runtime = "nodejs";

function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

function courseSlugParam(value: string | null): string {
  const slug = String(value || "").trim().toLowerCase();
  return /^[a-z0-9-]{1,80}$/.test(slug) ? slug : "";
}

export async function GET(request: Request) {
  const session = await readNzSession();
  const url = new URL(request.url);
  const requested = url.searchParams.get("kind");
  const kind =
    requested === "direct-debit"
      ? "direct-debit"
      : requested === "student-agreement"
        ? "student-agreement"
        : "payment-plan";
  const popup = hostedLegalViewIsPopup(url.searchParams.get("view"));

  if (kind === "student-agreement") {
    const queryProvider = courseSlugParam(url.searchParams.get("provider"));
    const queryCourse = courseSlugParam(url.searchParams.get("course"));
    if (
      session?.providerSlug &&
      queryProvider &&
      queryProvider !== session.providerSlug
    ) {
      return plain(403, "This agreement does not belong to the current checkout.");
    }
    if (session?.courseSlug && queryCourse && queryCourse !== session.courseSlug) {
      return plain(403, "This agreement does not belong to the current checkout.");
    }
    const providerSlug = session?.providerSlug || queryProvider;
    const courseSlug = session?.courseSlug || queryCourse;
    if (!providerSlug || !courseSlug) {
      return plain(404, "The student agreement could not be found.");
    }
    const agreementCourse = await resolveAuthoritativeCourseContext(providerSlug, courseSlug);
    if (agreementCourse.error || !agreementCourse.tenant || !agreementCourse.course) {
      return agreementCourse.error || jsonError(404, "PROVIDER_NOT_FOUND");
    }
    const agreement = agreementCourse.course.providerStudentAgreement;
    if (!agreement || agreement.reviewOnly || agreement.acceptancePermitted === false) {
      return plain(404, "The student agreement is not available for this course.");
    }
    const document = renderStudentAgreementDocument({
      title: agreement.title,
      version: agreement.version,
      contentHash: agreement.content_hash,
      html: agreement.html,
    });
    const branded = applyHostedLegalDocumentPresentation({
      html: document,
      tenant: agreementCourse.tenant,
      popup,
    });
    return new Response(branded, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (kind === "direct-debit") {
    const queryProvider = courseSlugParam(url.searchParams.get("provider"));
    if (session?.providerSlug && queryProvider && queryProvider !== session.providerSlug) {
      return plain(403, "This agreement does not belong to the current checkout.");
    }
    const providerSlug = session?.providerSlug || queryProvider;
    if (!providerSlug) {
      return plain(409, "The Direct Debit Service Agreement is available after your plan is created.");
    }
    const tenantResult = resolveTenantContext(providerSlug);
    if (tenantResult.error || !tenantResult.tenant) {
      return tenantResult.error || jsonError(404, "PROVIDER_NOT_FOUND");
    }
    const debitBase = requireNzApiBaseUrl();
    if ("error" in debitBase) {
      return debitBase.error;
    }
    const debitUpstream = await fetch(
      `${debitBase.url.replace(/\/$/, "")}/legal/direct-debit-terms?provider_code=${encodeURIComponent(tenantResult.tenant.providerCode)}`,
      {
        method: "GET",
        headers: { Accept: "text/html" },
        cache: "no-store",
      },
    );
    const debitHtml = await debitUpstream.text();
    const debitBranded = applyHostedLegalDocumentPresentation({
      html: debitHtml,
      tenant: tenantResult.tenant,
      popup,
    });
    return new Response(debitBranded, {
      status: debitUpstream.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (!session?.checkoutToken) {
    return plain(409, "The payment plan agreement is available after your plan is created.");
  }

  const resolved = await resolveAuthoritativeCourseContext(session.providerSlug, session.courseSlug);
  if (resolved.error || !resolved.tenant) {
    return resolved.error || jsonError(404, "PROVIDER_NOT_FOUND");
  }

  const apiBase = requireNzApiBaseUrl();
  if ("error" in apiBase) {
    return apiBase.error;
  }

  const upstreamPath = `/legal/payment-plan-terms?token=${encodeURIComponent(session.checkoutToken)}`;

  const upstream = await fetch(
    `${apiBase.url.replace(/\/$/, "")}${upstreamPath}`,
    {
      method: "GET",
      headers: { Accept: "text/html" },
      cache: "no-store",
    },
  );

  const html = await upstream.text();
  const branded = applyHostedLegalDocumentPresentation({
    html,
    tenant: resolved.tenant,
    popup,
  });
  return new Response(branded, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
