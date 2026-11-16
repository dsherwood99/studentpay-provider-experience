import { getHostedProductMode } from "@/lib/nz-enrolment/environment";
import { academyEnrolmentProxyAllowed, exchangeAcademyResume, requestHost } from "@/lib/au-enrolment/forward";

export const runtime = "nodejs";

function json(body: unknown, status: number, cookie = "") {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  if (cookie) headers.set("set-cookie", cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

export async function POST(request: Request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  if (!academyEnrolmentProxyAllowed(host, getHostedProductMode())) {
    return json({ ok: false, message: "Not found." }, 404);
  }
  let parsed: { credential?: unknown; dateOfBirth?: unknown };
  try {
    parsed = await request.json();
  } catch {
    return json({ ok: false, message: "Invalid enrolment request." }, 400);
  }
  const exchanged = await exchangeAcademyResume({
    credential: typeof parsed.credential === "string" ? parsed.credential : "",
    dateOfBirth: typeof parsed.dateOfBirth === "string" ? parsed.dateOfBirth : "",
  });
  if (!exchanged.enrolmentId) {
    return json({ ok: false, message: exchanged.message }, exchanged.status);
  }
  const secure = requestHost(host) === "www.academyaustralia.com" || requestHost(host) === "academyaustralia.com";
  return json(
    { ok: true, enrolmentId: exchanged.enrolmentId, message: exchanged.message },
    200,
    `sp_academy_enrolment_recovery=${encodeURIComponent(`${exchanged.enrolmentId}.${exchanged.token}`)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 14}${secure ? "; Secure" : ""}`,
  );
}
