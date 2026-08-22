import { notFound, redirect } from "next/navigation";
import { getCourseBySlug } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";
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
