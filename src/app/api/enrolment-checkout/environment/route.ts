import {
  configuredNzHostedTenantSlug,
  getHostedProductMode,
  getStudentpayEnv,
  resolveNzApiBaseUrl,
} from "@/lib/nz-enrolment/environment";

export const runtime = "nodejs";

type ApiEnvironmentProbe = {
  environment?: string | null;
  host?: string | null;
  git_commit_sha?: string | null;
  git_commit_ref?: string | null;
  vercel_env?: string | null;
  salesforce_configured?: boolean | null;
  gocardless_configured?: boolean | null;
  error?: string | null;
};

async function probeNzApiEnvironment(apiBaseUrl: string): Promise<ApiEnvironmentProbe> {
  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/v1/environment`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    const json = (await response.json().catch(() => ({}))) as {
      environment?: string;
      host?: string;
      deployment?: {
        git_commit_sha?: string | null;
        git_commit_ref?: string | null;
        vercel_env?: string | null;
      };
      readiness?: {
        salesforce_configured?: boolean;
        payment_processor_configured?: boolean;
      };
      error?: { message?: string };
    };
    if (!response.ok) {
      return { error: json.error?.message || `HTTP ${response.status}` };
    }
    return {
      environment: json.environment || null,
      host: json.host || null,
      git_commit_sha: json.deployment?.git_commit_sha || null,
      git_commit_ref: json.deployment?.git_commit_ref || null,
      vercel_env: json.deployment?.vercel_env || null,
      salesforce_configured: json.readiness?.salesforce_configured ?? null,
      gocardless_configured: json.readiness?.payment_processor_configured ?? null,
      error: null,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "API environment probe failed",
    };
  }
}

/**
 * Sandbox-only wiring probe. Confirms which NZ API host this Preview is using
 * without exposing secrets. Production always 404s.
 */
export async function GET() {
  if (getStudentpayEnv() !== "sandbox") {
    return new Response(null, { status: 404 });
  }

  const api = resolveNzApiBaseUrl();
  const upstream = api.url ? await probeNzApiEnvironment(api.url) : null;

  return Response.json({
    success: true,
    studentpay_env: "sandbox",
    vercel_env: process.env.VERCEL_ENV || null,
    git_commit_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    git_commit_ref: process.env.VERCEL_GIT_COMMIT_REF || null,
    hosted_product_mode: getHostedProductMode(),
    hosted_tenant_slug: configuredNzHostedTenantSlug(),
    api_base_url: api.url || null,
    api_error: api.error || null,
    api_environment: upstream?.environment || null,
    api_host: upstream?.host || null,
    api_git_commit_sha: upstream?.git_commit_sha || null,
    api_git_commit_ref: upstream?.git_commit_ref || null,
    api_vercel_env: upstream?.vercel_env || null,
    api_salesforce_configured: upstream?.salesforce_configured ?? null,
    api_gocardless_configured: upstream?.gocardless_configured ?? null,
    api_probe_error: upstream?.error || null,
  });
}
