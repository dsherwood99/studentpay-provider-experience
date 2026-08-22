import { SimpleEnrolmentCoursePage } from "@/components/courses/SimpleEnrolmentCoursePage";
import { fullStackCourseContent } from "@/config/simple-course-content";
import type { Course } from "@/types/course";
import type { EnrolmentPaymentOption } from "@/types/enrolment";
import type { Provider } from "@/types/provider";

type FullStackCoursePageProps = {
  provider: Provider;
  course: Course;
  initialPaymentOption: EnrolmentPaymentOption;
  studentPayProviderCode?: string;
  legalApiBaseUrl?: string;
};

export function FullStackCoursePage({
  provider,
  course,
  initialPaymentOption,
  studentPayProviderCode,
  legalApiBaseUrl,
}: FullStackCoursePageProps) {
  return (
    <SimpleEnrolmentCoursePage
      provider={provider}
      course={course}
      content={fullStackCourseContent}
      initialPaymentOption={initialPaymentOption}
      studentPayProviderCode={studentPayProviderCode}
      legalApiBaseUrl={legalApiBaseUrl}
    />
  );
}
