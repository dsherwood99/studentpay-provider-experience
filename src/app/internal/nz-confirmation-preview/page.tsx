import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { EnrolmentConfirmation } from "@/components/nz-enrolment/EnrolmentConfirmation";
import { ProviderNativeHeader } from "@/components/nz-enrolment/ProviderNativeHeader";
import { StudentPayAttribution } from "@/components/nz-enrolment/StudentPayAttribution";
import {
  NZ_CONFIRMATION_COPY,
  NZ_PAY_IN_FULL_CONFIRMATION_NEXT_STEPS,
  decorateConfirmationRows,
  paymentPlanConfirmationNarrative,
  paymentPlanConfirmationRows,
} from "@/lib/nz-enrolment/checkout-ui";
import { previewCoursePlan } from "@/lib/nz-enrolment/canonical";
import { getNzCourse, toPublicCourse } from "@/lib/nz-enrolment/courses";
import { NZ_TENANTS, toPublicTenant } from "@/lib/nz-enrolment/tenants";
import { payInFullSuccessCopy } from "@/lib/nz-enrolment/pay-in-full-flow";
import { formatNzdFromCents } from "@/lib/nz-enrolment/plan-math";
import { safeReturnToProviderUrl, tenantCssVars } from "@/lib/nz-enrolment/presentation";
import {
  gstInclusiveDisplayRows,
  isGstInclusiveBreakdown,
} from "@/lib/nz-enrolment/tax-presentation";
import styles from "@/components/nz-enrolment/enrolment-checkout.module.css";
import type { NzCourse, NzTenant } from "@/lib/nz-enrolment/types";

export const dynamic = "force-dynamic";

const PREVIEW_OLI_COURSE: NzCourse = {
  courseCode: "ADM101",
  slug: "certificate-in-business-administration",
  providerSlug: "oli",
  name: "Certificate in Business Administration",
  category: "Administration",
  description:
    "Certificate in Business Administration — Online Learning Institute. Payment-plan course fee is the StudentPay financed amount.",
  paymentPlanCourseFeeCents: 183425,
  paymentInFullCourseFeeCents: 160425,
  status: "active",
  duration: "Self-paced",
  planPolicy: {
    mode: "derived_regular",
    frequency: "Weekly",
    regularInstalmentCents: 2500,
    upfrontAmountCents: 0,
  },
};

const PREVIEW_BELA_COURSE: NzCourse = {
  courseCode: "BELA_LASH_BUSINESS_BUNDLE",
  slug: "lash-business-bundle",
  providerSlug: "bela-nz",
  name: "Lash Business Bundle",
  description:
    "Lash Business Bundle — Bela Beauty College. Payment-plan course fee is the StudentPay financed amount.",
  paymentPlanCourseFeeCents: 280_000,
  paymentInFullCourseFeeCents: 280_000,
  enrolmentPaymentOptions: ["payment_plan"],
  status: "active",
  duration: "Self-paced",
  planPolicy: {
    mode: "derived_regular",
    frequency: "Weekly",
    regularInstalmentCents: 1500,
    upfrontAmountCents: 1000,
  },
};

const PREVIEW_STUDENTS: Record<string, string> = {
  oli: "Alex Taylor",
  "bela-nz": "Jamie Reid",
};

function Fixture({
  tenant,
  course,
  payNow,
}: {
  tenant: NzTenant;
  course: NzCourse;
  payNow: boolean;
}) {
  const publicTenant = toPublicTenant(tenant);
  const studentName = PREVIEW_STUDENTS[tenant.slug] || null;
  const checkoutId = `${tenant.providerCode}-PREVIEW-CONFIRM`;
  const gstSource = payNow
    ? course.paymentInFullCourseFeeCents
    : course.paymentPlanCourseFeeCents;
  const gstRows = isGstInclusiveBreakdown(tenant.checkout.taxPresentation)
    ? gstInclusiveDisplayRows(gstSource, tenant.checkout.taxPresentation)
    : null;
  const payNowCopy = payNow
    ? payInFullSuccessCopy({
        courseName: course.name,
        providerName: tenant.displayName,
        amountLabel: formatNzdFromCents(course.paymentInFullCourseFeeCents),
        checkoutId,
      })
    : null;
  const preview = payNow
    ? null
    : previewCoursePlan(course, { firstPaymentDate: "2026-11-18" });
  const schedule = preview ? paymentPlanConfirmationNarrative(preview) : null;
  const rows = payNowCopy
    ? decorateConfirmationRows([
        ...payNowCopy.rows.slice(0, 2),
        ...(studentName ? [{ label: "Student", value: studentName }] : []),
        ...(gstRows || []).map((row) => ({ ...row, group: "course" as const })),
        ...payNowCopy.rows.slice(2).map((row) =>
          row.label === "Reference" ? { ...row, label: "Checkout reference" } : row,
        ),
      ])
    : paymentPlanConfirmationRows({
        courseName: course.name,
        providerName: tenant.displayName,
        studentName,
        courseFeeLabel: formatNzdFromCents(course.paymentPlanCourseFeeCents),
        courseFeeRows: gstRows?.map((row) => ({ ...row, group: "course" as const })),
        agreementNumber: "PPA-000018",
        checkoutId,
      });

  return (
    <div
      className={styles.page}
      data-testid={`nz-confirmation-preview-${tenant.slug}`}
      data-payment-option={payNow ? "pay_in_full" : "payment_plan"}
      style={tenantCssVars(publicTenant) as CSSProperties}
    >
      <ProviderNativeHeader tenant={publicTenant} course={toPublicCourse(course)} />
      <div className={styles.shell}>
        <EnrolmentConfirmation
          heading={payNowCopy?.heading || NZ_CONFIRMATION_COPY.heading}
          lead={payNowCopy?.lead || NZ_CONFIRMATION_COPY.lead}
          schedule={schedule}
          rows={rows}
          nextSteps={payNow ? NZ_PAY_IN_FULL_CONFIRMATION_NEXT_STEPS : NZ_CONFIRMATION_COPY.nextSteps}
          returnHref={safeReturnToProviderUrl(publicTenant)}
          returnLabel={
            tenant.presentation.returnToProviderLabel || `Return to ${tenant.displayName}`
          }
        />
        <StudentPayAttribution />
      </div>
    </div>
  );
}

export default async function NzConfirmationPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; variant?: string }>;
}) {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  const { tenant: tenantSlug, variant } = await searchParams;
  const payNow = variant === "pay-now";
  const oli = NZ_TENANTS.find((tenant) => tenant.slug === "oli");
  const oliCourse =
    getNzCourse("oli", "certificate-in-business-administration") || PREVIEW_OLI_COURSE;
  const bela = NZ_TENANTS.find((tenant) => tenant.slug === "bela-nz");
  const requested = tenantSlug?.trim().toLowerCase();
  const fixtures = [
    oli && oliCourse ? { tenant: oli, course: oliCourse } : null,
    bela ? { tenant: bela, course: PREVIEW_BELA_COURSE } : null,
  ].filter((item): item is { tenant: NzTenant; course: NzCourse } => Boolean(item));
  const visible = requested
    ? fixtures.filter((item) => item.tenant.slug === requested)
    : fixtures;
  const shown = payNow
    ? visible.filter((item) =>
        (item.course.enrolmentPaymentOptions || ["payment_plan", "pay_in_full"]).includes(
          "pay_in_full",
        ),
      )
    : visible;

  if (shown.length === 0) {
    notFound();
  }

  return (
    <main>
      {shown.map((item) => (
        <Fixture
          key={item.tenant.slug}
          tenant={item.tenant}
          course={item.course}
          payNow={payNow}
        />
      ))}
    </main>
  );
}
