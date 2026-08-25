import { getProviderExperienceConfig } from "@/lib/provider-experience/checkout";
import { getProviderBindingBySlug } from "@/lib/provider-experience/provider-bindings";

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
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() || "";
  const providerSlug = url.searchParams.get("providerSlug")?.trim() || "";

  if (!token) {
    return new Response("The agreement link is missing its checkout token.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const binding = providerSlug
    ? getProviderBindingBySlug(providerSlug)
    : undefined;
  const apiBaseUrl =
    binding?.defaultApiBaseUrl || getProviderExperienceConfig().apiBaseUrl;

  const upstream = await fetch(
    `${apiBaseUrl}${legalPath(kind)}?token=${encodeURIComponent(token)}`,
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
