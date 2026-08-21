import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnrolmentWizard } from "@/components/enrolment/EnrolmentWizard";
import { getCourseBySlug } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";
import { getProviderExperienceConfig } from "@/lib/provider-experience/checkout";
import type { EnrolmentPaymentOption } from "@/types/enrolment";

type SandboxEnrolPageProps = {
  params: Promise<{
    providerSlug: string;
    courseSlug: string;
  }>;
  searchParams: Promise<{
    payment?: string;
  }>;
};

export async function generateMetadata({
  params,
}: SandboxEnrolPageProps): Promise<Metadata> {
  const { providerSlug, courseSlug } = await params;
  const provider = getProviderBySlug(providerSlug);
  const course = provider
    ? getCourseBySlug(provider.code, courseSlug)
    : undefined;

  if (!provider || !course) {
    return {
      title: "Enrolment",
    };
  }

  return {
    title: `Enrol · ${course.title} · ${provider.name}`,
    description: `Enrol in ${course.title} with ${provider.name} through the StudentPay Provider Experience wizard.`,
  };
}

export default async function SandboxEnrolPage({
  params,
  searchParams,
}: SandboxEnrolPageProps) {
  const { providerSlug, courseSlug } = await params;
  const { payment } = await searchParams;
  const config = getProviderExperienceConfig({ providerSlug });

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
