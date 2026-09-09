import type { NzTenant } from "./types.ts";

export function getTenantApiKey(tenant: NzTenant): string {
  const named = process.env[tenant.apiKeyEnv]?.trim() || "";
  if (named) {
    return named;
  }
  const convention =
    process.env[`PROVIDER_API_KEY_${tenant.providerCode}`]?.trim() || "";
  return convention;
}

export function assertNoBrowserSecretLeak(source: string): string[] {
  const hits: string[] = [];
  if (/NEXT_PUBLIC_[A-Z0-9_]*PROVIDER_API_KEY/.test(source)) {
    hits.push("NEXT_PUBLIC_ provider API key");
  }
  if (source.includes("NEXT_PUBLIC_PROVIDER_API_KEY")) {
    hits.push("NEXT_PUBLIC_PROVIDER_API_KEY");
  }
  return hits;
}
