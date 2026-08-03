import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseBySlug } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";

type EnrolmentPlaceholderPageProps = {
  params: Promise<{
    providerSlug: string;
    courseSlug: string;
  }>;
};

export default async function EnrolmentPlaceholderPage({
  params,
}: EnrolmentPlaceholderPageProps) {
  const { providerSlug, courseSlug } = await params;

  const provider = getProviderBySlug(providerSlug);

  if (!provider) {
    notFound();
  }

  const course = getCourseBySlug(provider.code, courseSlug);

  if (!course) {
    notFound();
  }

  return (
    <section className="enrolment-placeholder">
      <div className="page-shell enrolment-placeholder__card">
        <p className="course-detail-eyebrow">
          StudentPay Enrolment
        </p>

        <h1>{course.title}</h1>

        <p>
          The reusable enrolment wizard will be built here next.
          This route is now connected correctly from the course page.
        </p>

        <Link
          href={`/providers/${provider.slug}/courses/${course.slug}`}
          className="button button--primary"
        >
          Return to course
        </Link>
      </div>
    </section>
  );
}