import type { AuPaymentPlanCourse } from "@/lib/au-enrolment/courses";
import {
  formatAudCents,
  upfrontCollectionNote,
} from "@/lib/au-enrolment/courses";

type AuPaymentPlanFactsProps = {
  course: AuPaymentPlanCourse;
};

const factRows = [
  ["Course price", (course: AuPaymentPlanCourse) => formatAudCents(course.schedule.coursePriceCents)],
  ["Upfront payment", (course: AuPaymentPlanCourse) => formatAudCents(course.schedule.upfrontPaymentCents)],
  ["Weekly instalment", (course: AuPaymentPlanCourse) => formatAudCents(course.schedule.weeklyAmountCents)],
  ["Weekly payments", (course: AuPaymentPlanCourse) => String(course.schedule.numberOfInstallments)],
  ["Final payment", (course: AuPaymentPlanCourse) => formatAudCents(course.schedule.finalPaymentCents)],
  ["Total", (course: AuPaymentPlanCourse) => formatAudCents(course.schedule.coursePriceCents)],
] as const;

export function AuPaymentPlanFacts({ course }: AuPaymentPlanFactsProps) {
  const collectionNote = upfrontCollectionNote(course);

  return (
    <div className="au-plan-facts">
      <dl>
        {factRows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value(course)}</dd>
          </div>
        ))}
      </dl>
      {collectionNote ? <p>{collectionNote}</p> : null}
    </div>
  );
}
