import { getHostedProductMode } from "@/lib/nz-enrolment/environment";
import {
  academyEnrolmentProxyAllowed,
  forwardAcademyEnrolment,
  prepareAcademyForwardBody,
  presentAcademyEnrolment,
  readAcademyUpstream,
  requestHost,
} from "@/lib/au-enrolment/forward";

export const runtime = "nodejs";

const RECOVERY_COOKIE = "sp_academy_enrolment_recovery";
const MAX_BODY_BYTES = 8 * 1024;

function json(body: unknown, status: number, extra?: Headers) {
  const headers = extra ?? new Headers();
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { status, headers });
}

function hostOf(request: Request): string {
  return request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = requestHost(hostOf(request));
  if (!origin) {
    const site = request.headers.get("sec-fetch-site");
    return site === "same-origin" || site === "none" || !site;
  }
  try {
    return requestHost(new URL(origin).host) === host;
  } catch {
    return false;
  }
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-vercel-forwarded-for")
    || request.headers.get("x-real-ip")
    || ""
  ).split(",")[0]?.trim() || "";
}

function recoveryTokenFor(request: Request, enrolmentId: string): string {
  if (!/^enrol_[a-f0-9]{20}$/.test(enrolmentId)) return "";
  const raw = request.headers.get("cookie") || "";
  const pair = raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${RECOVERY_COOKIE}=`));
  if (!pair) return "";
  const value = decodeURIComponent(pair.slice(RECOVERY_COOKIE.length + 1));
  const split = value.indexOf(".");
  if (split < 0) return "";
  return value.slice(0, split) === enrolmentId ? value.slice(split + 1) : "";
}

function rememberRecovery(headers: Headers, request: Request, enrolmentId: string, token: string) {
  if (!token || !/^enrol_[a-f0-9]{20}$/.test(enrolmentId)) return;
  const secure = new URL(request.url).protocol === "https:";
  headers.append(
    "set-cookie",
    `${RECOVERY_COOKIE}=${encodeURIComponent(`${enrolmentId}.${token}`)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 14}${secure ? "; Secure" : ""}`,
  );
}

export async function POST(request: Request) {
  if (!academyEnrolmentProxyAllowed(hostOf(request), getHostedProductMode())) {
    return json({ ok: false, message: "Not found." }, 404);
  }
  if (!sameOrigin(request)) {
    return json({ ok: false, message: "Invalid enrolment request." }, 403);
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ ok: false, message: "Invalid enrolment request." }, 400);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ ok: false, message: "Invalid enrolment request." }, 400);
  }
  const prepared = prepareAcademyForwardBody(parsed);
  if (!prepared.ok) return json({ ok: false, message: prepared.message }, prepared.status);
  const idempotencyKey = request.headers.get("idempotency-key") || "";
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(idempotencyKey)) {
    return json({ ok: false, message: "Invalid enrolment request." }, 400);
  }
  const enrolmentId = typeof prepared.body.enrolmentId === "string" ? prepared.body.enrolmentId : "";
  const forwarded = await forwardAcademyEnrolment({
    body: prepared.body,
    idempotencyKey,
    clientIp: clientIp(request),
    userAgent: request.headers.get("user-agent") || "",
    recoveryToken: recoveryTokenFor(request, enrolmentId),
    allowLiveCapture: requestHost(hostOf(request)) === "www.academyaustralia.com"
      || requestHost(hostOf(request)) === "academyaustralia.com",
  });
  const headers = new Headers();
  const returnedId = typeof forwarded.body.enrolmentId === "string" ? forwarded.body.enrolmentId : "";
  rememberRecovery(headers, request, returnedId, forwarded.recoveryToken);
  return json(forwarded.body, forwarded.status, headers);
}

export async function GET(request: Request) {
  if (!academyEnrolmentProxyAllowed(hostOf(request), getHostedProductMode())) {
    return json({ ok: false, message: "Not found." }, 404);
  }
  const url = new URL(request.url);
  const enrolmentId = url.searchParams.get("enrolmentId") || "";
  if (!/^enrol_[a-f0-9]{20}$/.test(enrolmentId)) {
    return json({ ok: false, message: "Enrolment not found." }, 404);
  }
  const upstream = readAcademyUpstream();
  if (!upstream.configured) {
    return json({ ok: false, message: "The Australian enrolment service is not configured, so no plan was created." }, 409);
  }
  const document = url.searchParams.get("document") === "html" ? "html" : "";
  let response: Response;
  try {
    response = await fetch(
      `${upstream.url}/api/au/enrolments?id=${encodeURIComponent(enrolmentId)}${document ? `&document=${document}` : ""}`,
      {
        headers: {
          authorization: `Bearer ${upstream.key}`,
          ...(recoveryTokenFor(request, enrolmentId)
            ? { "x-enrolment-recovery": recoveryTokenFor(request, enrolmentId) }
            : {}),
        },
        cache: "no-store",
      },
    );
  } catch {
    return json({ ok: false, retryable: true, message: "Enrolment could not be confirmed. You can try again." }, 409);
  }
  if (document) {
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
  const data = await response.json() as Record<string, unknown>;
  return json(
    presentAcademyEnrolment(
      data,
      response.status,
      requestHost(hostOf(request)) === "www.academyaustralia.com",
    ),
    response.ok ? 200 : response.status,
  );
}
