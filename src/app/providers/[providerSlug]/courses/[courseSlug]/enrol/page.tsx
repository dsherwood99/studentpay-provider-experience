import { notFound, redirect } from "next/navigation";
import { CatalogueEnrolmentForm } from "@/components/enrolment/CatalogueEnrolmentForm";
import { getCourseBySlug } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";
import { isCatalogueProvider } from "@/lib/provider-experience/catalogue";
import { getCatalogueCourse } from "@/lib/provider-experience/catalogue-server";
import { isAcademyProductionDemo } from "@/lib/provider-experience/checkout";

type SandboxEnrolPageProps = {
  params: Promise<{
    providerSlug: string;
    courseSlug: string;
  }>;
  searchParams: Promise<{
    payment?: string;
  }>;
};

export default async function SandboxEnrolPage({
  params,
  searchParams,
}: SandboxEnrolPageProps) {
  const { providerSlug, courseSlug } = await params;
  const { payment } = await searchParams;

  if (isAcademyProductionDemo() && providerSlug !== "academy-australia") {
    notFound();
  }

  const provider = getProviderBySlug(providerSlug);

  if (isCatalogueProvider(provider)) {
    const catalogueCourse = await getCatalogueCourse(provider, courseSlug);

    if (!catalogueCourse) {
      notFound();
    }

    return (
      <CatalogueEnrolmentForm provider={provider} course={catalogueCourse} />
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
