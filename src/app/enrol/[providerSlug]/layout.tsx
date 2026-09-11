import { ProviderNativeFooter } from "@/components/nz-enrolment/ProviderNativeFooter";
import { ProviderNativeHeader } from "@/components/nz-enrolment/ProviderNativeHeader";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";
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
  if (!usesProviderNativeChrome(publicTenant)) {
    return children;
  }

  return (
    <div className={styles.frame} style={tenantCssVars(publicTenant) as CSSProperties}>
      <ProviderNativeHeader tenant={publicTenant} />
      <div className={styles.main}>{children}</div>
      <ProviderNativeFooter tenant={publicTenant} />
    </div>
  );
}
