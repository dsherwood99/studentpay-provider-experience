import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnrolmentWizard } from "@/components/enrolment/EnrolmentWizard";
import { getCourseBySlug } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";

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
      title: "Sandbox enrolment",
    };
  }

  return {
    title: `Sandbox enrol · ${course.title}`,
    description: `Create a StudentPay sandbox enrolment for ${course.title} with ${provider.name}.`,
  };
}

export default async function SandboxEnrolPage({
  params,
  searchParams,
}: SandboxEnrolPageProps) {
  const { providerSlug, courseSlug } = await params;
  const { payment } = await searchParams;

  const provider = getProviderBySlug(providerSlug);

  if (!provider) {
    notFound();
  }

  const course = getCourseBySlug(provider.code, courseSlug);

  if (!course) {
    notFound();
  }

  const initialPaymentOption =
    payment === "full" || payment === "plan" ? payment : "plan";

  return (
    <EnrolmentWizard
      provider={provider}
      course={course}
      initialPaymentOption={initialPaymentOption}
      mode="sandbox"
    />
  );
}
