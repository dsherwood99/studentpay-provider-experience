import Link from "next/link";
import { KitDisclosure } from "@/components/courses/KitDisclosure";
import {
  formatAudFromCents,
  formatCataloguePlanCopy,
} from "@/lib/provider-experience/catalogue-view";
import type { CatalogueCourseView } from "@/types/catalogue";

type CatalogueCourseCardProps = {
  course: CatalogueCourseView;
  providerSlug: string;
};

export function CatalogueCourseCard({
  course,
  providerSlug,
}: CatalogueCourseCardProps) {
  const href = `/providers/${providerSlug}/courses/${course.slug}`;

  return (
    <article className="course-card">
      <Link
        href={href}
        className="course-card__visual course-card__visual--beauty"
        aria-label={`View ${course.title}`}
      >
        <span className="course-card__category">Course</span>
      </Link>

      <div className="course-card__body">
        <h3>
          <Link href={href}>{course.title}</Link>
        </h3>

        <div className="course-card__footer">
          <div className="course-card__price">
            <span>Course price</span>
            <strong>{formatAudFromCents(course.coursePriceCents)}</strong>
            <small>{formatCataloguePlanCopy(course)}</small>
          </div>

          <Link href={href} className="course-card__link">
            View course
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <KitDisclosure text={course.kitDisclosure} />
      </div>
    </article>
  );
}
