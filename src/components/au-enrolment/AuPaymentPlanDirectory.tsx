import Link from "next/link";
import { AuDemoNotice } from "@/components/au-enrolment/AuDemoNotice";
import { AuPaymentPlanFacts } from "@/components/au-enrolment/AuPaymentPlanFacts";
import { ProviderIdentity } from "@/components/providers/ProviderIdentity";
import {
  auPaymentPlanCoursePath,
  auPaymentPlanEnrolPath,
  formatAuInstalmentSummary,
  type AuPaymentPlanCourse,
} from "@/lib/au-enrolment/courses";
import type { Provider } from "@/types/provider";

type AuPaymentPlanDirectoryProps = {
  provider: Provider;
  courses: readonly AuPaymentPlanCourse[];
};

export function AuPaymentPlanDirectory({
  provider,
  courses,
}: AuPaymentPlanDirectoryProps) {
  return (
    <div className="course-catalogue-page au-plan-directory">
      <section className="course-catalogue-hero">
        <div className="page-shell course-catalogue-hero__grid">
          <div>
            <Link
              href={`/providers/${provider.slug}`}
              className="provider-back-link"
            >
              ← {provider.name}
            </Link>

            <p className="provider-eyebrow">Australian payment-plan demonstrations</p>

            <h1>Review Australian weekly payment plans.</h1>

            <p>
              These demonstration courses use verified Australian payment terms
              so the enrolment journey can be reviewed before a sandbox checkout
              is connected.
            </p>
          </div>

          <ProviderIdentity provider={provider} width={235} height={90} />
        </div>
      </section>

      <section className="course-catalogue-content">
        <div className="page-shell">
          <AuDemoNotice />

          <div className="course-catalogue-toolbar">
            <div>
              <strong>
                {courses.length}{" "}
                {courses.length === 1
                  ? "demonstration course"
                  : "demonstration courses"}
              </strong>
              <span>
                Further courses are added through the Australian payment-plan
                configuration.
              </span>
            </div>
          </div>

          <div className="au-plan-list">
            {courses.map((course) => (
              <article key={course.code} className="au-plan-card">
                <p className="au-plan-card__kicker">Demonstration</p>
                <h2>
                  <Link href={auPaymentPlanCoursePath(course.slug)}>
                    {course.title}
                  </Link>
                </h2>

                {course.exclusions.length > 0 ? (
                  <p className="au-plan-card__exclusion">
                    {course.exclusions.join(". ")}.
                  </p>
                ) : null}

                {course.inclusions.length > 0 ? (
                  <p className="au-plan-card__inclusion">
                    Includes {course.inclusions.join(", ")}.
                  </p>
                ) : null}

                <p className="au-plan-card__summary">
                  {formatAuInstalmentSummary(course)}
                </p>

                <AuPaymentPlanFacts course={course} />

                <div className="au-plan-card__actions">
                  <Link
                    href={auPaymentPlanEnrolPath(course.slug)}
                    className="button button--primary"
                  >
                    Enrol Now
                  </Link>
                  <Link
                    href={auPaymentPlanCoursePath(course.slug)}
                    className="au-plan-card__view"
                  >
                    View course
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
