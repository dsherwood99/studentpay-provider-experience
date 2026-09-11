import { notFound, redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { NzCourseCatalogue } from "@/components/nz-enrolment/CourseCatalogue";
import { getNzCoursesForProvider, toPublicCourse } from "@/lib/nz-enrolment/courses";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";
import { tenantCssVars } from "@/lib/nz-enrolment/presentation";
import { getNzTenantBySlug, toPublicTenant } from "@/lib/nz-enrolment/tenants";

type PageProps = {
  params: Promise<{ providerSlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { providerSlug } = await params;
  if (!isNzEnrolmentProductAvailable()) {
    return {};
  }
  const tenant = getNzTenantBySlug(providerSlug);
  if (!tenant) {
    return {};
  }
  return {
    title: `Choose your course | ${tenant.displayName}`,
    description: `Enrol in a ${tenant.displayName} course with a StudentPay NZ payment plan.`,
  };
}

export default async function NzProviderEnrolPage({ params }: PageProps) {
  const { providerSlug } = await params;
  if (!isNzEnrolmentProductAvailable()) {
    notFound();
  }

  const tenant = getNzTenantBySlug(providerSlug);

  if (!tenant) {
    notFound();
  }

  const courses = getNzCoursesForProvider(tenant.slug);
  if (courses.length === 1) {
    redirect(`/enrol/${tenant.slug}/${courses[0].slug}`);
  }

  const publicTenant = toPublicTenant(tenant);

  return (
    <div style={tenantCssVars(publicTenant) as CSSProperties}>
      <NzCourseCatalogue
        tenant={publicTenant}
        courses={courses.map(toPublicCourse)}
      />
    </div>
  );
}
