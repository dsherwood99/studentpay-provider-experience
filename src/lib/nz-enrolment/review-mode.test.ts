import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import { kitDisclosureForPolicy } from "./kit-policy.ts";
import { describeDerivedWeeklyPlan } from "./plan-math.ts";
import { loadCertifiedReviewDraft, presentHostedCourseForReview } from "./review-draft-agreement.ts";
import {
  NZ_REVIEW_ENVIRONMENT_BANNER,
  isNzHostedReviewMode,
  legalGateBlocksHostedCheckout,
  reviewConfirmAdvance,
  reviewDirectDebitAdvance,
  reviewDisplayEligibility,
  reviewModeMutationResponse,
} from "./review-mode.ts";
import { getNzTenantBySlug } from "./tenants.ts";
import type { NzCourse, NzTenant } from "./types.ts";

const srcRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const repoRoot = path.resolve(srcRoot, "..");

const managed = [
  "HOSTED_PRODUCT_MODE",
  "STUDENTPAY_ENV",
  "NZ_HOSTED_TENANT_SLUG",
  "NZ_HOSTED_REVIEW_MODE",
  "VERCEL_ENV",
];
const previous: Record<string, string | undefined> = {};

function snapshotEnv() {
  for (const name of managed) {
    previous[name] = process.env[name];
    delete process.env[name];
  }
}

function restoreEnv() {
  for (const name of managed) {
    if (previous[name] === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous[name];
    }
  }
}

function enableReview() {
  process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
  process.env.NZ_HOSTED_REVIEW_MODE = "true";
}

function lashCourse(): NzCourse {
  return {
    courseCode: "BELA-LASH",
    slug: "lash-business-bundle",
    providerSlug: "bela-nz",
    name: "Lash Business Bundle",
    description: "Authoritative catalogue course.",
    paymentPlanCourseFeeCents: 280000,
    paymentInFullCourseFeeCents: 280000,
    enrolmentPaymentOptions: ["payment_plan"],
    status: "active",
    legalGateClosed: true,
    planPolicy: {
      mode: "derived_regular",
      frequency: "Weekly",
      regularInstalmentCents: 1500,
      upfrontAmountCents: 1000,
    },
  };
}

beforeEach(snapshotEnv);
afterEach(restoreEnv);

describe("hosted review mode", () => {
  it("stays off unless the review flag is set on an NZ enrolment host", () => {
    assert.equal(isNzHostedReviewMode(), false);
    assert.equal(reviewModeMutationResponse(), null);
    process.env.NZ_HOSTED_REVIEW_MODE = "true";
    assert.equal(isNzHostedReviewMode(), false);
    process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
    assert.equal(isNzHostedReviewMode(), true);
    process.env.NZ_HOSTED_REVIEW_MODE = "false";
    process.env.VERCEL_ENV = "preview";
    process.env.NZ_HOSTED_TENANT_SLUG = "bela-nz";
    assert.equal(isNzHostedReviewMode(), false);
    delete process.env.NZ_HOSTED_REVIEW_MODE;
    assert.equal(isNzHostedReviewMode(), true);
    process.env.VERCEL_ENV = "production";
    assert.equal(isNzHostedReviewMode(), false);
    process.env.VERCEL_ENV = "preview";
    process.env.NZ_HOSTED_TENANT_SLUG = "oli";
    assert.equal(isNzHostedReviewMode(), false);
    delete process.env.VERCEL_ENV;
    delete process.env.NZ_HOSTED_TENANT_SLUG;
  });

  it("refuses create, Direct Debit, GoCardless, and confirm without a network call", async () => {
    enableReview();
    let called = false;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      called = true;
      throw new Error("review mode must not call the network");
    }) as typeof fetch;
    try {
      const response = reviewModeMutationResponse();
      assert.ok(response);
      assert.equal(response.status, 403);
      const body = (await response.json()) as { error?: { code?: string } };
      assert.equal(body.error?.code, "REVIEW_MODE");
      assert.equal(called, false);
    } finally {
      globalThis.fetch = original;
    }

    const debit = reviewDirectDebitAdvance();
    assert.equal(debit.callsGoCardless, false);
    assert.equal(debit.createsDirectDebitAuthority, false);
    assert.equal(debit.postsProviderCheckout, false);
    assert.equal(debit.setupUrl, "");
    assert.equal(debit.checkoutId, null);
    assert.match(debit.message, /GoCardless/);
    assert.doesNotMatch(debit.message, /https?:\/\//);

    const confirm = reviewConfirmAdvance();
    assert.equal(confirm.postsProviderCheckout, false);
    assert.equal(confirm.createsPayment, false);
    assert.equal(confirm.agreementNumber, null);
    assert.equal(confirm.checkoutStatus, "review_complete");
  });

  it("guards every mutating hosted route before a provider checkout call", () => {
    const routes = [
      "app/api/enrolment-checkout/route.ts",
      "app/api/enrolment-checkout/confirm/route.ts",
      "app/api/studentpay/provider-checkouts/route.ts",
      "app/api/studentpay/catalogue-dda/route.ts",
      "app/api/studentpay/catalogue-confirm/route.ts",
      "app/api/studentpay/provider-checkout-confirm/route.ts",
      "app/api/studentpay/catalogue-agreements/route.ts",
    ];
    for (const relative of routes) {
      const source = fs.readFileSync(path.join(srcRoot, relative), "utf8");
      const postAt = source.indexOf("export async function POST");
      assert.ok(postAt >= 0, relative);
      const head = source.slice(postAt, postAt + 320);
      assert.match(head, /reviewModeMutationResponse\(\)/, relative);
      assert.doesNotMatch(head, /canonicalCreate|canonicalConfirm|provider-checkouts/);
    }

    const createRoute = fs.readFileSync(
      path.join(srcRoot, "app/api/enrolment-checkout/route.ts"),
      "utf8",
    );
    const confirmRoute = fs.readFileSync(
      path.join(srcRoot, "app/api/enrolment-checkout/confirm/route.ts"),
      "utf8",
    );
    const createPost = createRoute.slice(createRoute.indexOf("export async function POST"));
    const confirmPost = confirmRoute.slice(confirmRoute.indexOf("export async function POST"));
    assert.ok(
      createPost.indexOf("reviewModeMutationResponse") <
        createPost.indexOf("canonicalCreate("),
    );
    assert.ok(
      confirmPost.indexOf("reviewModeMutationResponse") <
        confirmPost.indexOf("canonicalConfirm("),
    );
    assert.match(confirmRoute, /legalGateClosed/);
    assert.match(confirmRoute, /reviewOnly === true/);
    assert.match(createRoute, /course\.legalGateClosed/);
  });

  it("keeps the agreement gate on the ordinary checkout path", () => {
    assert.equal(legalGateBlocksHostedCheckout({ legalGateClosed: true }, false), true);
    assert.equal(legalGateBlocksHostedCheckout({ legalGateClosed: true }, true), false);
    assert.equal(legalGateBlocksHostedCheckout({ legalGateClosed: false }, false), false);
    const page = fs.readFileSync(
      path.join(srcRoot, "app/enrol/[providerSlug]/[courseSlug]/page.tsx"),
      "utf8",
    );
    assert.match(page, /legalGateBlocksHostedCheckout\(nzCourse, reviewMode\)/);
    assert.match(page, /NzCourseLegalGate/);
    assert.match(page, /nzCourse\.catalogueOnly/);
    const layout = fs.readFileSync(
      path.join(srcRoot, "app/enrol/[providerSlug]/layout.tsx"),
      "utf8",
    );
    assert.match(layout, /isNzHostedReviewMode\(\) \? <NzReviewBanner \/> : null/);
    assert.equal(
      NZ_REVIEW_ENVIRONMENT_BANNER,
      "Review environment — no enrolment or payment will be created",
    );
  });

  it("renders the certified draft agreement without making it acceptable", () => {
    const hidden = presentHostedCourseForReview(
      { providerCode: "BELA_NZ" } as NzTenant,
      lashCourse(),
    );
    assert.equal(hidden.providerStudentAgreement, undefined);
    assert.equal(hidden.legalGateClosed, true);
    assert.equal(hidden.paymentPlanCourseFeeCents, 280000);

    enableReview();
    const draft = loadCertifiedReviewDraft("BELA_NZ");
    assert.ok(draft);
    assert.equal(draft.reviewOnly, true);
    assert.equal(draft.acceptancePermitted, false);
    assert.equal(
      draft.content_hash,
      "ddb6aa7a3f9c4a4fe9becb72db9ab688503b8236ebdbd6de189575de50ccef78",
    );
    assert.match(draft.html, /data-agreement-status="DRAFT_NOT_ACTIVE"/);
    assert.match(draft.html, /data-student-acceptance="false"/);
    assert.match(draft.html, /KIT_NOT_INCLUDED/);
    assert.equal(loadCertifiedReviewDraft("OLI_NZ"), null);

    const presented = presentHostedCourseForReview(
      { providerCode: "BELA_NZ" } as NzTenant,
      lashCourse(),
    );
    assert.equal(presented.legalGateClosed, true);
    assert.equal(presented.paymentPlanCourseFeeCents, 280000);
    assert.equal(presented.providerStudentAgreement?.reviewOnly, true);
    assert.equal(presented.providerStudentAgreement?.acceptancePermitted, false);
    assert.notEqual(presented.providerStudentAgreement?.html, "");

    const oli = presentHostedCourseForReview(
      { providerCode: "OLI_NZ" } as NzTenant,
      { ...lashCourse(), providerSlug: "oli", slug: "oli-course" },
    );
    assert.equal(oli.providerStudentAgreement, undefined);
  });

  it("uses the authoritative plan maths and kit disclosure without changing the fee", () => {
    const lash = describeDerivedWeeklyPlan({
      coursePriceCents: 280000,
      upfrontAmountCents: 1000,
      regularInstalmentCents: 1500,
    });
    assert.ok(lash);
    assert.equal(lash.preview.numberOfInstalments, 186);
    assert.equal(lash.preview.regularInstalmentAmountCents, 1500);
    assert.equal(lash.preview.finalInstalmentAmountCents, null);
    assert.equal(lash.preview.upfrontAmountCents, 1000);

    const fullBeauty = describeDerivedWeeklyPlan({
      coursePriceCents: 960000,
      upfrontAmountCents: 1000,
      regularInstalmentCents: 2500,
    });
    assert.ok(fullBeauty);
    assert.equal(fullBeauty.preview.fullRegularInstalmentCount, 383);
    assert.equal(fullBeauty.preview.numberOfInstalments, 384);
    assert.equal(fullBeauty.preview.finalInstalmentAmountCents, 1500);

    const hair = describeDerivedWeeklyPlan({
      coursePriceCents: 470400,
      upfrontAmountCents: 1000,
      regularInstalmentCents: 2000,
    });
    assert.ok(hair);
    assert.equal(hair.preview.regularInstalmentAmountCents, 2000);
    assert.equal(hair.preview.finalInstalmentAmountCents, 1400);

    const mastery = describeDerivedWeeklyPlan({
      coursePriceCents: 9700,
      upfrontAmountCents: 1000,
      regularInstalmentCents: 2000,
    });
    assert.ok(mastery);
    assert.equal(mastery.preview.finalInstalmentAmountCents, 700);

    const disclosure = kitDisclosureForPolicy("KIT_NOT_INCLUDED");
    assert.match(disclosure || "", /course tuition only/);
    assert.match(disclosure || "", /Kit not included/);
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    assert.match(checkout, /kitDisclosureForPolicy\(tenant\.kitPolicy\)/);
    assert.match(checkout, /data-testid="nz-review-draft-agreement"/);
    const directDebit = checkout.slice(
      checkout.indexOf("async function startDirectDebitSetup"),
      checkout.indexOf("async function confirmPayInFullFromServer"),
    );
    assert.ok(directDebit.indexOf("if (reviewMode)") < directDebit.indexOf("runDdaSetupClick"));
    const create = checkout.slice(
      checkout.indexOf("async function createCheckout"),
      checkout.indexOf("async function startDirectDebitSetup"),
    );
    assert.ok(create.indexOf("if (reviewMode)") < create.indexOf('fetch("/api/enrolment-checkout"'));
    const confirm = checkout.slice(
      checkout.indexOf("async function confirmCheckout"),
      checkout.indexOf('if (paymentMode === "neither"'),
    );
    assert.ok(
      confirm.indexOf("reviewConfirmAdvance") <
        confirm.indexOf('fetch("/api/enrolment-checkout/confirm"'),
    );
    assert.equal(fs.existsSync(path.join(repoRoot, "package.json")), true);
  });

  it("keeps Bela review isolated from OLI", () => {
    process.env.HOSTED_PRODUCT_MODE = "nz_enrolment";
    process.env.STUDENTPAY_ENV = "production";
    process.env.NZ_HOSTED_TENANT_SLUG = "bela-nz";
    enableReview();
    assert.equal(getNzTenantBySlug("oli"), undefined);
    assert.equal(getNzTenantBySlug("unknown-provider"), undefined);
    const bela = getNzTenantBySlug("bela-nz");
    assert.equal(bela?.providerCode, "BELA_NZ");
    assert.equal(bela?.kitPolicy, "KIT_NOT_INCLUDED");
    const eligibility = reviewDisplayEligibility(bela!, {
      ...lashCourse(),
      legalGateClosed: true,
    });
    assert.equal(eligibility.paymentPlanAvailable, true);
    assert.equal(eligibility.payInFullAvailable, false);
    assert.equal(
      reviewDisplayEligibility(bela!, { ...lashCourse(), catalogueOnly: true })
        .paymentPlanAvailable,
      false,
    );

    delete process.env.NZ_HOSTED_REVIEW_MODE;
    assert.equal(
      reviewDisplayEligibility(bela!, lashCourse()).paymentPlanAvailable,
      false,
    );
    assert.equal(getNzTenantBySlug("oli"), undefined);
  });
});
