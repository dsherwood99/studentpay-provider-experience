import { notFound, redirect } from "next/navigation";
import { CatalogueUnavailable } from "@/components/courses/CatalogueUnavailable";
import { EnrolmentWizard } from "@/components/enrolment/EnrolmentWizard";
import { NzCourseNotFound } from "@/components/nz-enrolment/CourseNotFound";
import { NzEnrolmentCheckout } from "@/components/nz-enrolment/EnrolmentCheckout";
import { getCourseBySlug } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";
import { getNzCourse, toPublicCourse } from "@/lib/nz-enrolment/courses";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";
import { getNzTenantBySlug, toPublicTenant } from "@/lib/nz-enrolment/tenants";
import { isCatalogueProvider } from "@/lib/provider-experience/catalogue";
import { getCatalogueCourse } from "@/lib/provider-experience/catalogue-server";
import { getProviderExperienceConfig } from "@/lib/provider-experience/checkout";
import { isProviderSlugBlockedByDeployment } from "@/lib/provider-experience/provider-bindings";
import type { EnrolmentPaymentOption } from "@/types/enrolment";

type EnrolmentPageProps = {
  params: Promise<{
    providerSlug: string;
    courseSlug: string;
  }>;
  searchParams: Promise<{
    payment?: string;
    dda?: string;
  }>;
};

export async function generateMetadata({ params }: EnrolmentPageProps) {
  const { providerSlug, courseSlug } = await params;
  if (!isNzEnrolmentProductAvailable()) {
    return {};
  }
  const tenant = getNzTenantBySlug(providerSlug);
  const course = tenant ? getNzCourse(providerSlug, courseSlug) : undefined;
  if (!tenant || !course) {
    return {
      title: tenant ? `Course not found | ${tenant.displayName}` : "Enrolment",
    };
  }
  return {
    title: `${course.name} | ${tenant.displayName}`,
    description: `Enrol in ${course.name} with a StudentPay NZ payment plan from ${tenant.displayName}.`,
  };
}

export default async function EnrolmentPage({
  params,
  searchParams,
}: EnrolmentPageProps) {
  const { providerSlug, courseSlug } = await params;
  const { payment, dda } = await searchParams;
  if (isNzEnrolmentProductAvailable()) {
    const nzTenant = getNzTenantBySlug(providerSlug);
    if (!nzTenant) {
      notFound();
    }

    const nzCourse = getNzCourse(providerSlug, courseSlug);
    if (!nzCourse) {
      return (
        <NzCourseNotFound
          tenant={toPublicTenant(nzTenant)}
          courseSlug={courseSlug}
        />
      );
    }

    const ddaReturn = dda === "return" || dda === "cancelled" ? dda : null;
    return (
      <NzEnrolmentCheckout
        tenant={toPublicTenant(nzTenant)}
        course={toPublicCourse(nzCourse)}
        ddaReturn={ddaReturn}
      />
    );
  }

  const config = getProviderExperienceConfig();

  if (isProviderSlugBlockedByDeployment(providerSlug)) {
    notFound();
  }

  const provider = getProviderBySlug(providerSlug);

  if (!provider) {
    notFound();
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

    redirect(
      `/providers/${provider.slug}/courses/${catalogueCourse.course.slug}/enrol`,
    );
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
