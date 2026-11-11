import {
  configuredNzHostedTenantSlug,
  getHostedProductMode,
  getStudentpayEnv,
  resolveNzApiBaseUrl,
} from "@/lib/nz-enrolment/environment";

export const runtime = "nodejs";

/**
 * Sandbox-only wiring probe. Confirms which NZ API host this Preview is using
 * without exposing secrets. Production always 404s.
 */
export async function GET() {
  if (getStudentpayEnv() !== "sandbox") {
    return new Response(null, { status: 404 });
  }

  const api = resolveNzApiBaseUrl();
  return Response.json({
    success: true,
    studentpay_env: "sandbox",
    vercel_env: process.env.VERCEL_ENV || null,
    hosted_product_mode: getHostedProductMode(),
    hosted_tenant_slug: configuredNzHostedTenantSlug(),
    api_base_url: api.url || null,
    api_error: api.error || null,
  });
}
