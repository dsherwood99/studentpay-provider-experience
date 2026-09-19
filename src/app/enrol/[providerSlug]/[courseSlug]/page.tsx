import { notFound, redirect } from "next/navigation";
import { CatalogueUnavailable } from "@/components/courses/CatalogueUnavailable";
import { EnrolmentWizard } from "@/components/enrolment/EnrolmentWizard";
import { NzCourseConfigurationUnavailable } from "@/components/nz-enrolment/CourseConfigurationUnavailable";
import { NzCourseNotFound } from "@/components/nz-enrolment/CourseNotFound";
import { NzEnrolmentCheckout } from "@/components/nz-enrolment/EnrolmentCheckout";
import { getCourseBySlug } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";
import { getNzCourse, toPublicCourse } from "@/lib/nz-enrolment/courses";
import { resolveAuthoritativeHostedCourse } from "@/lib/nz-enrolment/api-catalogue-overlay";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";
import { resolveHostedPayInFullEligibility } from "@/lib/nz-enrolment/pay-in-full";
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
  const localCourse = tenant ? getNzCourse(providerSlug, courseSlug) : undefined;
  const resolved =
    tenant && localCourse
      ? await resolveAuthoritativeHostedCourse(tenant, localCourse)
      : null;
  if (tenant && resolved?.status === "unavailable") {
    return {
      title: `Enrolment options unavailable | ${tenant.displayName}`,
    };
  }
  const course = resolved?.status === "ok" ? resolved.course : undefined;
  if (!tenant || !course) {
    return {
      title: tenant ? `Course not found | ${tenant.displayName}` : "Enrolment",
    };
  }
  const eligibility = resolveHostedPayInFullEligibility({ tenant, course });
  const paymentLabel =
    eligibility.payInFullAvailable && !eligibility.paymentPlanAvailable
      ? "StudentPay NZ"
      : "a StudentPay NZ payment plan";
  return {
    title: `${course.name} | ${tenant.displayName}`,
    description: `Enrol in ${course.name} with ${paymentLabel} from ${tenant.displayName}.`,
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

    const localCourse = getNzCourse(providerSlug, courseSlug);
    if (!localCourse) {
      return (
        <NzCourseNotFound
          tenant={toPublicTenant(nzTenant)}
          courseSlug={courseSlug}
        />
      );
    }
    const resolved = await resolveAuthoritativeHostedCourse(
      nzTenant,
      localCourse,
    );
    if (resolved.status === "unavailable") {
      return (
        <NzCourseConfigurationUnavailable tenant={toPublicTenant(nzTenant)} />
      );
    }
    const nzCourse = resolved.course;

    const ddaReturn = dda === "return" || dda === "cancelled" ? dda : null;
    const eligibility = resolveHostedPayInFullEligibility({
      tenant: nzTenant,
      course: nzCourse,
    });
    return (
      <NzEnrolmentCheckout
        tenant={toPublicTenant(nzTenant)}
        course={toPublicCourse(nzCourse)}
        ddaReturn={ddaReturn}
        payInFullAvailable={eligibility.payInFullAvailable}
        paymentPlanAvailable={eligibility.paymentPlanAvailable}
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
