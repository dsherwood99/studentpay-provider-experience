import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AcademyNzTestEnrolment } from "@/components/courses/AcademyNzTestEnrolment";
import { SimpleEnrolmentCoursePage } from "@/components/courses/SimpleEnrolmentCoursePage";
import { photographyCourseContent } from "@/config/simple-course-content";
import { getCourseBySlug } from "@/config/courses";
import { getProviderBySlug } from "@/config/providers";

export const metadata: Metadata = {
  title: "Professional Photography — NZ Test",
  description:
    "Unlisted New Zealand sandbox checkout test. The price is illustrative and this page is not a live Academy Australia enrolment.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AcademyNzPhotographyTestPage() {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  const provider = getProviderBySlug("academy-australia");
  const liveCourse = getCourseBySlug("ACADEMY_AUSTRALIA", "professional-photography");
  if (!provider || !liveCourse) {
    notFound();
  }

  const course = {
    ...liveCourse,
    code: "ACADEMY_NZ_PHOTO_TEST",
    slug: "professional-photography-nz-test",
    title: "Professional Photography — NZ Test",
    shortDescription:
      "New Zealand checkout test. The payment plan below is an illustrative comparison schedule, not Academy Australia's course fee.",
  };

  return (
    <>
      <div className="page-shell" style={{ paddingTop: "1.5rem" }}>
        <p className="simple-checkout__note" data-testid="academy-nz-test-banner">
          New Zealand checkout test. This page is not indexed, is not a live
          enrolment, and does not replace the Professional Photography course.
          The price is illustrative.
        </p>
      </div>
      <SimpleEnrolmentCoursePage
        provider={provider}
        course={course}
        content={{
          ...photographyCourseContent,
          script: "New Zealand checkout test",
          breadcrumbLabel: "Courses",
          breadcrumbHref: "/providers/academy-australia/courses",
          heroLead:
            "Same Academy Australia photography layout, with a separate StudentPay NZ sandbox checkout for performance comparison.",
        }}
        initialPaymentOption="plan"
        enrolment={<AcademyNzTestEnrolment />}
      />
    </>
  );
}
