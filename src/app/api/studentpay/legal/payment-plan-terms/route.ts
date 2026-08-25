import { proxyLegalDocument } from "@/lib/provider-experience/legal-proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return proxyLegalDocument(request, "payment-plan-terms");
}
