import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuPaymentPlanDirectory } from "@/components/au-enrolment/AuPaymentPlanDirectory";
import {
  auPaymentPlanCourses,
  isAuPaymentPlanRouteEnabled,
} from "@/lib/au-enrolment/courses";
import { getProviderBySlug } from "@/config/providers";

type AuPaymentPlanDirectoryPageProps = {
  params: Promise<{
    providerSlug: string;
  }>;
};

export const metadata: Metadata = {
  title: "Australian payment plans",
  description:
    "Academy Australia weekly payment plans. Enrolment submission is held.",
  robots: { index: false, follow: false },
};

export default async function AuPaymentPlanDirectoryPage({
  params,
}: AuPaymentPlanDirectoryPageProps) {
  const { providerSlug } = await params;

  if (!isAuPaymentPlanRouteEnabled(providerSlug)) {
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
