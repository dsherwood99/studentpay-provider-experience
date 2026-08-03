import Link from "next/link";
import type { Course } from "@/types/course";

type CourseCardProps = {
  course: Course;
  providerSlug: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CourseCard({
  course,
  providerSlug,
}: CourseCardProps) {
  return (
    <article className="course-card">
      <Link
        href={`/providers/${providerSlug}/courses/${course.slug}`}
        className={`course-card__visual course-card__visual--${course.visualTone}`}
        aria-label={`View ${course.title}`}
      >
        <span className="course-card__category">{course.category}</span>

        <div className="course-card__visual-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </Link>

      <div className="course-card__body">
        <div className="course-card__meta">
          <span>{course.deliveryMode}</span>
          <span>{course.duration}</span>
        </div>

        <h3>
          <Link href={`/providers/${providerSlug}/courses/${course.slug}`}>
            {course.title}
          </Link>
        </h3>

        <p className="course-card__description">
          {course.shortDescription}
        </p>

        <div className="course-card__badges">
          {course.badges.slice(0, 3).map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>

        <div className="course-card__footer">
          <div className="course-card__price">
            <span>From</span>
            <strong>
              ${course.paymentPlan.repaymentAmount} per{" "}
              {course.paymentPlan.frequency === "weekly"
  ? "week"
  : course.paymentPlan.frequency === "fortnightly"
    ? "fortnight"
    : "month"}
            </strong>
            <small>
              or {formatCurrency(course.paymentPlan.totalFee)} upfront
            </small>
          </div>

          <Link
            href={`/providers/${providerSlug}/courses/${course.slug}`}
            className="course-card__link"
          >
            View course
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}