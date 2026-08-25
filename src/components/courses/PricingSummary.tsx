import {
  formatAudFromCents,
  formatCataloguePlanCopy,
} from "@/lib/provider-experience/catalogue-view";
import type { CatalogueCourseView } from "@/types/catalogue";

type PricingSummaryProps = {
  course: CatalogueCourseView;
};

export function PricingSummary({ course }: PricingSummaryProps) {
  return (
    <div className="catalogue-pricing">
      <p className="catalogue-pricing__label">Course price</p>
      <p className="catalogue-pricing__price">
        {formatAudFromCents(course.coursePriceCents)}
      </p>
      <p className="catalogue-pricing__label">Payment plan</p>
      <p className="catalogue-pricing__plan">{formatCataloguePlanCopy(course)}</p>
    </div>
  );
}
