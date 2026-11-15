import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuPaymentPlanEnrolPreview } from "@/components/au-enrolment/AuPaymentPlanEnrolPreview";
import { CatalogueUnavailable } from "@/components/courses/CatalogueUnavailable";
import { CatalogueEnrolmentForm } from "@/components/enrolment/CatalogueEnrolmentForm";
import { getCourseBySlug } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";
import {
  getAuPaymentPlanCourseForProvider,
  isAuPaymentPlanRouteEnabled,
} from "@/lib/au-enrolment/courses";
import { isCatalogueProvider } from "@/lib/provider-experience/catalogue";
import { getCatalogueCourse } from "@/lib/provider-experience/catalogue-server";
import { isAcademyProductionDemo } from "@/lib/provider-experience/checkout";
import { isProviderSlugBlockedByDeployment } from "@/lib/provider-experience/provider-bindings";

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
  const course = getAuPaymentPlanCourseForProvider(providerSlug, courseSlug);

  if (!course) {
    return {};
  }

  return {
    title: `${course.title} enrolment preview`,
    description:
      "Non-submittable Academy Australia preview of the Australian enrolment journey.",
    robots: { index: false, follow: false },
  };
}

export default async function SandboxEnrolPage({
  params,
  searchParams,
}: SandboxEnrolPageProps) {
  const { providerSlug, courseSlug } = await params;
  const { payment } = await searchParams;

  if (isAcademyProductionDemo() && providerSlug !== "academy-australia") {
    notFound();
  }

  if (isProviderSlugBlockedByDeployment(providerSlug)) {
    notFound();
  }

  const provider = getProviderBySlug(providerSlug);
  const auPaymentPlanCourse = provider
    ? getAuPaymentPlanCourseForProvider(provider.slug, courseSlug)
    : undefined;

  if (provider && auPaymentPlanCourse) {
    if (!isAuPaymentPlanRouteEnabled(provider.slug)) {
      notFound();
    }

    return (
      <AuPaymentPlanEnrolPreview
        provider={provider}
        course={auPaymentPlanCourse}
      />
    );
  }

  if (isCatalogueProvider(provider)) {
    const catalogueCourse = await getCatalogueCourse(provider, courseSlug);

    if (catalogueCourse.status === "unavailable") {
      return (
        <CatalogueUnavailable
          provider={provider}
          code={catalogueCourse.code}
        />
      );
    }

    if (catalogueCourse.status !== "ready") {
      notFound();
    }

    return (
      <CatalogueEnrolmentForm
        provider={provider}
        course={catalogueCourse.course}
      />
    );
  }

  const course = provider
    ? getCourseBySlug(provider.code, courseSlug)
    : undefined;

  if (!provider || !course) {
    redirect("/");
  }

  const query =
    payment === "full" || payment === "afterpay" || payment === "plan"
      ? `?payment=${payment}`
      : "";

  redirect(`/providers/${provider.slug}/courses/${course.slug}${query}`);
}
