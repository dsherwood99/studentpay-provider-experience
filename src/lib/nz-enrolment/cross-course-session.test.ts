import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { hostedErrorMessage } from "./errors.ts";
import {
  resolveHostedCreateProviderOrderId,
  shouldReuseProviderOrderId,
} from "./pay-in-full-flow.ts";
import {
  resolveReusableSession,
  sessionAppliesToCourse,
  sessionProviderMismatch,
} from "./session.ts";
import type { NzCheckoutSession } from "./types.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));
const checkoutRoute = fs.readFileSync(
  path.join(srcRoot, "app/api/enrolment-checkout/route.ts"),
  "utf8",
);
const statusRoute = fs.readFileSync(
  path.join(srcRoot, "app/api/enrolment-checkout/status/route.ts"),
  "utf8",
);
const confirmRoute = fs.readFileSync(
  path.join(srcRoot, "app/api/enrolment-checkout/confirm/route.ts"),
  "utf8",
);
const checkoutUi = fs.readFileSync(
  path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
  "utf8",
);
const sessionSource = fs.readFileSync(
  path.join(srcRoot, "lib/nz-enrolment/session.ts"),
  "utf8",
);
const requestContext = fs.readFileSync(
  path.join(srcRoot, "lib/nz-enrolment/request-context.ts"),
  "utf8",
);

const COURSE_A = "certificate-in-business-administration";
const COURSE_B = "certificate-in-psychology-counselling";

function oliSession(overrides?: Partial<NzCheckoutSession>): NzCheckoutSession {
  return {
    providerSlug: "oli",
    courseSlug: COURSE_A,
    providerOrderId: "HOSTED-OLI_NZ-COURSE-A",
    checkoutId: "chk_course_a",
    checkoutToken: "tok_course_a",
    opportunityId: "006COURSEA",
    ddaId: "dda_course_a",
    setupUrl: "https://pay-sandbox.gocardless.com/billing/course-a",
    paymentOption: "pay_in_full",
    student: {
      firstName: "Alex",
      lastName: "Student",
      email: "alex@example.co.nz",
      mobile: "0210000000",
      dateOfBirth: "1990-01-01",
      streetAddress: "1 Test Street",
      suburb: "Auckland",
      city: "Auckland",
      postcode: "1010",
      region: "Auckland",
      country: "New Zealand",
    },
    ...overrides,
  };
}

describe("same-provider course session reuse", () => {
  it("1. OLI course A session + OLI course A request resumes as today", () => {
    const session = oliSession();
    assert.equal(sessionAppliesToCourse(session, "oli", COURSE_A), true);
    assert.equal(resolveReusableSession(session, "oli", COURSE_A), session);
    assert.equal(sessionProviderMismatch(session, "oli"), false);
    assert.equal(
      shouldReuseProviderOrderId({
        sessionProviderSlug: session.providerSlug,
        sessionCourseSlug: session.courseSlug,
        providerSlug: "oli",
        courseSlug: COURSE_A,
        sessionProviderOrderId: session.providerOrderId,
      }),
      true,
    );
    assert.equal(
      resolveHostedCreateProviderOrderId({
        session,
        providerSlug: "oli",
        courseSlug: COURSE_A,
        fallbackOrderId: "HOSTED-OLI_NZ-NEW",
      }),
      "HOSTED-OLI_NZ-COURSE-A",
    );
  });

  it("2. OLI course A session + OLI course B GET is not TENANT_MISMATCH", () => {
    const session = oliSession();
    assert.equal(sessionProviderMismatch(session, "oli"), false);
    assert.equal(sessionAppliesToCourse(session, "oli", COURSE_B), false);
    assert.equal(resolveReusableSession(session, "oli", COURSE_B), null);
    const tenantGuard = requestContext.slice(
      requestContext.indexOf("export function assertSessionTenant"),
    );
    assert.doesNotMatch(tenantGuard, /session\.courseSlug !== courseSlug/);
    assert.match(tenantGuard, /sessionProviderMismatch\(session, providerSlug\)/);
    assert.match(checkoutRoute, /resolveReusableSession\(session, providerSlug, courseSlug\)/);
    assert.match(checkoutRoute, /assertSessionTenant\(session, providerSlug\)/);
    assert.doesNotMatch(
      checkoutRoute,
      /assertSessionTenant\(session, providerSlug, courseSlug\)/,
    );
  });

  it("3. OLI course A session + OLI course B create uses a new provider_order_id", () => {
    const session = oliSession();
    const reusable = resolveReusableSession(session, "oli", COURSE_B);
    assert.equal(reusable, null);
    const nextOrderId = resolveHostedCreateProviderOrderId({
      session: reusable,
      providerSlug: "oli",
      courseSlug: COURSE_B,
      fallbackOrderId: "HOSTED-OLI_NZ-COURSE-B",
    });
    assert.equal(nextOrderId, "HOSTED-OLI_NZ-COURSE-B");
    assert.notEqual(nextOrderId, session.providerOrderId);
    assert.notEqual(nextOrderId, session.checkoutId);
    assert.match(checkoutRoute, /resolveReusableSession\(existing, providerSlug, courseSlug\)/);
    assert.match(checkoutRoute, /resolveHostedCreateProviderOrderId/);
    assert.match(checkoutRoute, /fallbackOrderId: hostedOrderId\(tenant\)/);
    assert.doesNotMatch(checkoutRoute, /body\.providerOrderId\?\.trim\(\)/);
    assert.match(checkoutRoute, /courseSlug: course\.slug/);
    assert.match(checkoutRoute, /writeNzSession\(\{/);
  });

  it("4. completed Pay Now course A → Payment Plan course B starts clean", () => {
    const session = oliSession({
      paymentOption: "pay_in_full",
      checkoutToken: undefined,
      ddaId: undefined,
    });
    const reusable = resolveReusableSession(session, "oli", COURSE_B);
    assert.equal(reusable, null);
    assert.equal(
      resolveHostedCreateProviderOrderId({
        session: reusable,
        providerSlug: "oli",
        courseSlug: COURSE_B,
        fallbackOrderId: "HOSTED-OLI_NZ-PLAN-B",
      }),
      "HOSTED-OLI_NZ-PLAN-B",
    );
    assert.equal(session.paymentOption, "pay_in_full");
  });

  it("5. Payment Plan course A → Pay Now course B starts clean", () => {
    const session = oliSession({
      paymentOption: "interest_free_payment_plan",
      checkoutToken: "tok_plan_a",
      ddaId: "dda_plan_a",
    });
    const reusable = resolveReusableSession(session, "oli", COURSE_B);
    assert.equal(reusable, null);
    assert.equal(
      resolveHostedCreateProviderOrderId({
        session: reusable,
        providerSlug: "oli",
        courseSlug: COURSE_B,
        fallbackOrderId: "HOSTED-OLI_NZ-PIF-B",
      }),
      "HOSTED-OLI_NZ-PIF-B",
    );
  });

  it("6-7. student email is not the session boundary", () => {
    const sameEmail = oliSession();
    const differentEmail = oliSession({
      student: {
        ...sameEmail.student!,
        email: "other@example.co.nz",
      },
    });
    assert.equal(resolveReusableSession(sameEmail, "oli", COURSE_B), null);
    assert.equal(resolveReusableSession(differentEmail, "oli", COURSE_B), null);
    assert.equal(resolveReusableSession(sameEmail, "oli", COURSE_A), sameEmail);
    assert.equal(resolveReusableSession(differentEmail, "oli", COURSE_A), differentEmail);
    assert.doesNotMatch(sessionSource, /session\.student\?\.email/);
    assert.doesNotMatch(requestContext, /session\.student\?\.email/);
    assert.doesNotMatch(checkoutRoute, /existing\?\.student\?\.email/);
  });

  it("8. provider A session + provider B request still fails closed", () => {
    const session = oliSession();
    assert.equal(sessionAppliesToCourse(session, "bela-nz", COURSE_A), false);
    assert.equal(resolveReusableSession(session, "bela-nz", COURSE_A), null);
    assert.equal(sessionProviderMismatch(session, "bela-nz"), true);
    assert.match(requestContext, /jsonError\(403, "TENANT_MISMATCH"\)/);
    assert.equal(
      hostedErrorMessage("TENANT_MISMATCH", "fallback"),
      "This enrolment belongs to a different provider.",
    );
  });

  it("9. duplicate click / refresh on the same course keeps idempotency", () => {
    const session = oliSession();
    const first = resolveHostedCreateProviderOrderId({
      session,
      providerSlug: "oli",
      courseSlug: COURSE_A,
      fallbackOrderId: "HOSTED-OLI_NZ-NEW-1",
    });
    const second = resolveHostedCreateProviderOrderId({
      session,
      providerSlug: "oli",
      courseSlug: COURSE_A,
      fallbackOrderId: "HOSTED-OLI_NZ-NEW-2",
    });
    assert.equal(first, "HOSTED-OLI_NZ-COURSE-A");
    assert.equal(second, first);
    assert.equal(
      shouldReuseProviderOrderId({
        sessionProviderSlug: session.providerSlug,
        sessionCourseSlug: session.courseSlug,
        providerSlug: "oli",
        courseSlug: COURSE_A,
        sessionProviderOrderId: session.providerOrderId,
      }),
      true,
    );
  });

  it("10. status/confirm stay bound to the cookie checkout and client prices are not authoritative", () => {
    assert.match(statusRoute, /readNzSession\(\)/);
    assert.match(
      statusRoute,
      /resolveAuthoritativeCourseContext\(session\.providerSlug, session\.courseSlug\)/,
    );
    assert.doesNotMatch(statusRoute, /url\.searchParams\.get\("courseSlug"\)/);
    assert.match(confirmRoute, /readNzSession\(\)/);
    assert.match(
      confirmRoute,
      /resolveAuthoritativeCourseContext\(session\.providerSlug, session\.courseSlug\)/,
    );
    assert.doesNotMatch(confirmRoute, /body\.courseSlug/);
    assert.doesNotMatch(checkoutUi, /providerOrderId:/);
    assert.match(
      checkoutUi,
      /json\.session\?\.providerSlug === tenant\.slug &&\s*json\.session\?\.courseSlug === course\.slug/,
    );
    assert.match(checkoutUi, /json\.session\?\.courseSlug && json\.session\.courseSlug !== course\.slug/);
    assert.match(checkoutRoute, /resolveAuthoritativeCourseContext\(providerSlug, courseSlug\)/);
    assert.doesNotMatch(checkoutRoute, /body\.plan\?\.coursePrice/);
  });
});
