import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { ProviderNativeHeader } from "@/components/nz-enrolment/ProviderNativeHeader";
import { StudentPayAttribution } from "@/components/nz-enrolment/StudentPayAttribution";
import {
  CONFIRMATION_SUMMARY_GROUPS,
  NZ_CONFIRMATION_COPY,
  paymentPlanConfirmationRows,
  planDisplay,
} from "@/lib/nz-enrolment/checkout-ui";
import { previewCoursePlan } from "@/lib/nz-enrolment/canonical";
import { getNzCourse, toPublicCourse } from "@/lib/nz-enrolment/courses";
import { NZ_TENANTS, toPublicTenant } from "@/lib/nz-enrolment/tenants";
import { formatNzdFromCents } from "@/lib/nz-enrolment/plan-math";
import { tenantCssVars } from "@/lib/nz-enrolment/presentation";
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

function Fixture({ tenant, course }: { tenant: NzTenant; course: NzCourse }) {
  const preview = previewCoursePlan(course, { firstPaymentDate: "2026-11-18" });
  const display = planDisplay(preview);
  const gstRows = isGstInclusiveBreakdown(tenant.checkout.taxPresentation)
    ? gstInclusiveDisplayRows(
        course.paymentPlanCourseFeeCents,
        tenant.checkout.taxPresentation,
      )
    : null;
  const rows = paymentPlanConfirmationRows({
    courseName: course.name,
    providerName: tenant.displayName,
    courseFeeLabel: formatNzdFromCents(course.paymentPlanCourseFeeCents),
    courseFeeRows: gstRows?.map((row) => ({ ...row, group: "payments" as const })),
    paymentPlanLabel: display.regularCountLabel,
    totalPayableLabel: display.totalLabel,
    finalPaymentLabel: display.finalPaymentLabel,
    firstPaymentDate: preview.firstPaymentDate,
    agreementNumber: "PPA-000018",
    checkoutId: `${tenant.providerCode}-PREVIEW-CONFIRM`,
  });
  const publicTenant = toPublicTenant(tenant);
  const visibleGroups = CONFIRMATION_SUMMARY_GROUPS.filter((group) =>
    rows.some((row) => row.group === group),
  );

  return (
    <div
      className={styles.page}
      data-testid={`nz-confirmation-preview-${tenant.slug}`}
      style={tenantCssVars(publicTenant) as CSSProperties}
    >
      <ProviderNativeHeader tenant={publicTenant} course={toPublicCourse(course)} />
      <div className={styles.shell}>
        <section className={styles.confirmation}>
          <div className={styles.confirmationHero}>
            <span className={styles.successMark} aria-hidden="true">
              <Check strokeWidth={2.75} />
            </span>
            <p className={styles.kicker}>{tenant.displayName}</p>
            <h1>{NZ_CONFIRMATION_COPY.heading}</h1>
            <p className={styles.lead}>{NZ_CONFIRMATION_COPY.lead}</p>
            <p className={styles.confirmationAmount}>
              <span className={styles.confirmationAmountValue}>{display.heroLabel}</span>
              <span className={styles.confirmationAmountHint}>repayment amount</span>
            </p>
          </div>
          <div className={styles.confirmationCard} data-testid="nz-enrolment-confirmed-summary">
            {visibleGroups.map((group) => {
              const items = rows.filter((row) => row.group === group);
              return (
                <div key={group} className={styles.confirmationGroup} data-group={group}>
                  <dl className={styles.confirmationTable}>
                    {items.map((row) => (
                      <div
                        key={row.label}
                        className={styles.confirmationRow}
                        data-tone={row.tone || "default"}
                      >
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
          <div className={styles.nextSteps}>
            <p className={styles.nextStepsHeading}>{NZ_CONFIRMATION_COPY.nextStepsHeading}</p>
            <ol>
              {NZ_CONFIRMATION_COPY.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className={styles.actions}>
            <span className={`${styles.btn} ${styles.btnPrimary}`}>
              {tenant.presentation.returnToProviderLabel || `Return to ${tenant.displayName}`}
            </span>
          </div>
          <p className={styles.confirmationSupport}>
            Support reference: <span>{tenant.providerCode}-PREVIEW-CONFIRM</span>
          </p>
          <StudentPayAttribution />
        </section>
      </div>
    </div>
  );
}

export default async function NzConfirmationPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  const { tenant: tenantSlug } = await searchParams;
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

  if (visible.length === 0) {
    notFound();
  }

  return (
    <main>
      {visible.map((item) => (
        <Fixture key={item.tenant.slug} tenant={item.tenant} course={item.course} />
      ))}
    </main>
  );
}
