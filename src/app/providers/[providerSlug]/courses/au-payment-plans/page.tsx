import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuPaymentPlanDirectory } from "@/components/au-enrolment/AuPaymentPlanDirectory";
import {
  ACADEMY_AUSTRALIA_PROVIDER_SLUG,
  auPaymentPlanCourses,
} from "@/lib/au-enrolment/courses";
import { getProviderBySlug } from "@/config/providers";
import { isProviderSlugBlockedByDeployment } from "@/lib/provider-experience/provider-bindings";

type AuPaymentPlanDirectoryPageProps = {
  params: Promise<{
    providerSlug: string;
  }>;
};

export const metadata: Metadata = {
  title: "Australian payment-plan demonstrations",
  description:
    "Academy Australia test courses for reviewing the Australian weekly payment-plan journey.",
  robots: { index: false, follow: false },
};

export default async function AuPaymentPlanDirectoryPage({
  params,
}: AuPaymentPlanDirectoryPageProps) {
  const { providerSlug } = await params;

  if (
    providerSlug !== ACADEMY_AUSTRALIA_PROVIDER_SLUG ||
    isProviderSlugBlockedByDeployment(providerSlug)
  ) {
    notFound();
  }

  const provider = getProviderBySlug(providerSlug);

  if (!provider) {
    notFound();
  }

  return (
    <AuPaymentPlanDirectory provider={provider} courses={auPaymentPlanCourses} />
  );
}
