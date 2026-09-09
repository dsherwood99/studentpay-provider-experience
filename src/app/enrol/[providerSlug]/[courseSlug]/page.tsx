import { notFound, redirect } from "next/navigation";
import { CatalogueUnavailable } from "@/components/courses/CatalogueUnavailable";
import { EnrolmentWizard } from "@/components/enrolment/EnrolmentWizard";
import { NzEnrolmentCheckout } from "@/components/nz-enrolment/EnrolmentCheckout";
import { getCourseBySlug } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";
import { getNzCourse, toPublicCourse } from "@/lib/nz-enrolment/courses";
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

export default async function EnrolmentPage({
  params,
  searchParams,
}: EnrolmentPageProps) {
  const { providerSlug, courseSlug } = await params;
  const { payment, dda } = await searchParams;
  const nzTenant = getNzTenantBySlug(providerSlug);
  const nzCourse = nzTenant ? getNzCourse(providerSlug, courseSlug) : undefined;

  if (nzTenant && nzCourse) {
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
