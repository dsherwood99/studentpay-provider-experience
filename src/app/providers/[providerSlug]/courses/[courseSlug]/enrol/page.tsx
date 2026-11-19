import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AuEnrolmentCheckout } from "@/components/au-enrolment/AuEnrolmentCheckout";
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
    enrolment?: string;
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
    title: `${course.title} enrolment`,
    description:
      "Academy Australia enrolment for the approved weekly plan.",
    robots: { index: false, follow: false },
  };
}

export default async function SandboxEnrolPage({
  params,
  searchParams,
}: SandboxEnrolPageProps) {
  const { providerSlug, courseSlug } = await params;
  const { payment, enrolment } = await searchParams;
  const headerStore = await headers();
  const requestHost = headerStore.get("x-forwarded-host") || headerStore.get("host") || "";

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
    if (!isAuPaymentPlanRouteEnabled(provider.slug, requestHost)) {
      notFound();
    }

    return (
      <AuEnrolmentCheckout
        provider={provider}
        course={auPaymentPlanCourse}
        enrolmentId={enrolment}
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
