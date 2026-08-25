import { getProviderExperienceConfig } from "@/lib/provider-experience/checkout";

export const runtime = "nodejs";

type LegalKind = "provider-student-agreement" | "payment-plan-terms";

function legalPath(kind: LegalKind): string {
  return kind === "provider-student-agreement"
    ? "/legal/provider-student-agreement"
    : "/legal/payment-plan-terms";
}

export async function proxyLegalDocument(
  request: Request,
  kind: LegalKind,
): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token")?.trim() || "";

  if (!token) {
    return new Response("The agreement link is missing its checkout token.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const config = getProviderExperienceConfig();
  const upstream = await fetch(
    `${config.apiBaseUrl}${legalPath(kind)}?token=${encodeURIComponent(token)}`,
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
