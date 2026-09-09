import { jsonError } from "@/lib/nz-enrolment/errors";
import {
  readNzSession,
  requireNzApiBaseUrl,
  resolveCourseContext,
} from "@/lib/nz-enrolment/request-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await readNzSession();
  if (!session?.checkoutToken) {
    return new Response("The payment plan agreement is available after your plan is created.", {
      status: 409,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const resolved = resolveCourseContext(session.providerSlug, session.courseSlug);
  if (resolved.error || !resolved.tenant) {
    return resolved.error || jsonError(404, "PROVIDER_NOT_FOUND");
  }

  const apiBase = requireNzApiBaseUrl();
  if ("error" in apiBase) {
    return apiBase.error;
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "direct-debit" ? "direct-debit" : "payment-plan";

  const upstreamPath =
    kind === "direct-debit"
      ? `/legal/direct-debit-terms?provider_code=${encodeURIComponent(resolved.tenant.providerCode)}`
      : `/legal/payment-plan-terms?token=${encodeURIComponent(session.checkoutToken)}`;

  const upstream = await fetch(
    `${apiBase.url.replace(/\/$/, "")}${upstreamPath}`,
    {
      method: "GET",
      headers: { Accept: "text/html" },
      cache: "no-store",
    },
  );

  const html = await upstream.text();
  return new Response(html, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
