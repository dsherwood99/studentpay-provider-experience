import { notFound } from "next/navigation";
import { EnrolmentWizard } from "@/components/enrolment/EnrolmentWizard";
import { getCourseBySlug } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";
import { getProviderExperienceConfig } from "@/lib/provider-experience/checkout";
import type { EnrolmentPaymentOption } from "@/types/enrolment";

type EnrolmentPageProps = {
  params: Promise<{
    providerSlug: string;
    courseSlug: string;
  }>;
  searchParams: Promise<{
    payment?: string;
  }>;
};

export default async function EnrolmentPage({
  params,
  searchParams,
}: EnrolmentPageProps) {
  const { providerSlug, courseSlug } = await params;
  const { payment } = await searchParams;
  const config = getProviderExperienceConfig();

  const provider = getProviderBySlug(providerSlug);

  if (!provider) {
    notFound();
  }

  const course = getCourseBySlug(provider.code, courseSlug);

  if (!course) {
    notFound();
  }

  const initialPaymentOption: EnrolmentPaymentOption =
    payment === "full" || payment === "afterpay" || payment === "plan"
      ? payment
      : "plan";

  return (
    <EnrolmentWizard
      provider={provider}
      course={course}
      initialPaymentOption={initialPaymentOption}
      legalApiBaseUrl={config.apiBaseUrl}
      studentPayProviderCode={config.providerCode}
    />
  );
}
