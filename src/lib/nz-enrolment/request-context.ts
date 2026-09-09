import { cookies } from "next/headers";
import { getNzCourse } from "./courses.ts";
import { jsonError } from "./errors.ts";
import { getTenantApiKey } from "./secrets.ts";
import {
  decodeNzCheckoutSession,
  encodeNzCheckoutSession,
  NZ_ENROLMENT_SESSION_COOKIE,
  nzSessionCookieOptions,
} from "./session.ts";
import { getNzTenantBySlug } from "./tenants.ts";
import type { NzCheckoutSession, NzCourse, NzTenant } from "./types.ts";

export async function readNzSession(): Promise<NzCheckoutSession | null> {
  const store = await cookies();
  return decodeNzCheckoutSession(store.get(NZ_ENROLMENT_SESSION_COOKIE)?.value);
}

export async function writeNzSession(session: NzCheckoutSession): Promise<void> {
  const store = await cookies();
  store.set(
    NZ_ENROLMENT_SESSION_COOKIE,
    encodeNzCheckoutSession(session),
    nzSessionCookieOptions(),
  );
}

export function resolveTenantContext(providerSlug: string): {
  tenant?: NzTenant;
  error?: Response;
} {
  const tenant = getNzTenantBySlug(providerSlug);
  if (!tenant) {
    return { error: jsonError(404, "PROVIDER_NOT_FOUND") };
  }
  return { tenant };
}

export function resolveCourseContext(
  providerSlug: string,
  courseSlug: string,
): {
  tenant?: NzTenant;
  course?: NzCourse;
  error?: Response;
} {
  const tenantResult = resolveTenantContext(providerSlug);
  if (tenantResult.error || !tenantResult.tenant) {
    return tenantResult;
  }
  const course = getNzCourse(providerSlug, courseSlug);
  if (!course) {
    return { error: jsonError(404, "CHECKOUT_NOT_FOUND", "Course not found.") };
  }
  return { tenant: tenantResult.tenant, course };
}

export function requireTenantKey(tenant: NzTenant): {
  apiKey?: string;
  error?: Response;
} {
  const apiKey = getTenantApiKey(tenant);
  if (!apiKey) {
    return { error: jsonError(503, "NOT_CONFIGURED") };
  }
  return { apiKey };
}

export function assertSessionTenant(
  session: NzCheckoutSession | null,
  providerSlug: string,
  courseSlug?: string,
): Response | null {
  if (!session) {
    return null;
  }
  if (session.providerSlug !== providerSlug) {
    return jsonError(403, "TENANT_MISMATCH");
  }
  if (courseSlug && session.courseSlug !== courseSlug) {
    return jsonError(403, "TENANT_MISMATCH");
  }
  return null;
}
