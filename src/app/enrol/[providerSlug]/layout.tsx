import { ProviderNativeFooter } from "@/components/nz-enrolment/ProviderNativeFooter";
import { NzReviewBanner } from "@/components/nz-enrolment/ReviewBanner";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";
import { isNzHostedReviewMode } from "@/lib/nz-enrolment/review-mode";
import type { CSSProperties, ReactNode } from "react";
import { tenantCssVars, usesProviderNativeChrome } from "@/lib/nz-enrolment/presentation";
import { getNzTenantBySlug, toPublicTenant } from "@/lib/nz-enrolment/tenants";
import styles from "@/components/nz-enrolment/provider-chrome.module.css";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ providerSlug: string }>;
};

export default async function NzEnrolProviderLayout({
  children,
  params,
}: LayoutProps) {
  const { providerSlug } = await params;

  if (!isNzEnrolmentProductAvailable()) {
    return children;
  }

  const tenant = getNzTenantBySlug(providerSlug);
  if (!tenant) {
    return children;
  }

  const publicTenant = toPublicTenant(tenant);
  const reviewBanner = isNzHostedReviewMode() ? <NzReviewBanner /> : null;
  if (!usesProviderNativeChrome(publicTenant)) {
    return (
      <>
        {reviewBanner}
        {children}
      </>
    );
  }

  return (
    <div className={styles.frame} style={tenantCssVars(publicTenant) as CSSProperties}>
      {reviewBanner}
      <div className={styles.main}>{children}</div>
      <ProviderNativeFooter tenant={publicTenant} />
    </div>
  );
}
