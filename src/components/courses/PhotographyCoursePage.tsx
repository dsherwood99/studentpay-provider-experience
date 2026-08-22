import { SimpleEnrolmentCoursePage } from "@/components/courses/SimpleEnrolmentCoursePage";
import { photographyCourseContent } from "@/config/simple-course-content";
import type { Course } from "@/types/course";
import type { EnrolmentPaymentOption } from "@/types/enrolment";
import type { Provider } from "@/types/provider";

type PhotographyCoursePageProps = {
  provider: Provider;
  course: Course;
  initialPaymentOption: EnrolmentPaymentOption;
  studentPayProviderCode?: string;
  legalApiBaseUrl?: string;
};

export function PhotographyCoursePage({
  provider,
  course,
  initialPaymentOption,
  studentPayProviderCode,
  legalApiBaseUrl,
}: PhotographyCoursePageProps) {
  return (
    <SimpleEnrolmentCoursePage
      provider={provider}
      course={course}
      content={photographyCourseContent}
      initialPaymentOption={initialPaymentOption}
      studentPayProviderCode={studentPayProviderCode}
      legalApiBaseUrl={legalApiBaseUrl}
    />
  );
}
