import { createHmac, timingSafeEqual } from "node:crypto";
import {
  isProductionAppEnv,
  requireNzEnrolmentSessionSecret,
} from "./environment.ts";
import type { NzCheckoutSession } from "./types.ts";

export const NZ_ENROLMENT_SESSION_COOKIE = "sp_nz_enrolment_session";

const MAX_AGE_SECONDS = 60 * 60 * 4;

export class NzSessionConfigError extends Error {
  constructor(message = "NZ enrolment session secret is not configured.") {
    super(message);
    this.name = "NzSessionConfigError";
  }
}

function sessionSecret(): string {
  const resolved = requireNzEnrolmentSessionSecret();
  if (resolved.error || !resolved.secret) {
    throw new NzSessionConfigError();
  }
  return resolved.secret;
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function encodeNzCheckoutSession(session: NzCheckoutSession): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

export function decodeNzCheckoutSession(
  value: string | undefined | null,
): NzCheckoutSession | null {
  if (!value) {
    return null;
  }
  const splitAt = value.lastIndexOf(".");
  if (splitAt <= 0) {
    return null;
  }
  const payload = value.slice(0, splitAt);
  const signature = value.slice(splitAt + 1);
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) {
    return null;
  }
  if (!timingSafeEqual(actualBuf, expectedBuf)) {
    return null;
  }
  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as NzCheckoutSession;
    if (!parsed?.providerSlug || !parsed?.courseSlug || !parsed?.providerOrderId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function nzSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProductionAppEnv() || process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export function publicSessionView(session: NzCheckoutSession | null) {
  if (!session) {
    return null;
  }
  return {
    providerSlug: session.providerSlug,
    courseSlug: session.courseSlug,
    providerOrderId: session.providerOrderId,
    checkoutId: session.checkoutId || null,
    hasCheckout: Boolean(session.checkoutId),
    hasSetupUrl: Boolean(session.setupUrl),
  };
}
