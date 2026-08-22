import Image from "next/image";
import Link from "next/link";
import { SimpleEnrolmentCheckout } from "@/components/enrolment/SimpleEnrolmentCheckout";
import type { Course } from "@/types/course";
import type { EnrolmentPaymentOption } from "@/types/enrolment";
import type { Provider } from "@/types/provider";

export type SimpleCourseContent = {
  breadcrumbLabel: string;
  breadcrumbHref: string;
  script: string;
  heroLead: string;
  providerName: string;
  providerBlurb: string[];
  overview: string[];
  visual: {
    toneClass: string;
    eyebrow: string;
    title: string;
    description: string;
    image?: string;
    codeLines?: Array<{ keyword: string; value: string }>;
  };
  highlights: string[];
  learnExtra?: string;
  detailsIntro: string;
  details: Array<{ label: string; value: string }>;
};

type SimpleEnrolmentCoursePageProps = {
  provider: Provider;
  course: Course;
  content: SimpleCourseContent;
  initialPaymentOption: EnrolmentPaymentOption;
  studentPayProviderCode?: string;
  legalApiBaseUrl?: string;
};

export function SimpleEnrolmentCoursePage({
  provider,
  course,
  content,
  initialPaymentOption,
  studentPayProviderCode,
  legalApiBaseUrl,
}: SimpleEnrolmentCoursePageProps) {
  return (
    <div className="simple-course-page">
      <section className="simple-course-hero">
        <div className="page-shell">
          <div className="simple-course-hero__breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href={content.breadcrumbHref}>{content.breadcrumbLabel}</Link>
            <span>/</span>
            <span>{course.title}</span>
          </div>

          <p className="aa-script aa-script--on-coral">{content.script}</p>
          <h1>{course.title}</h1>
          <p>{content.heroLead}</p>
          <div className="simple-course-hero__badges">
            {course.badges.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
            <span>Payment plan available</span>
          </div>
        </div>
      </section>

      <section className="simple-course-body">
        <div className="page-shell simple-course-layout">
          <div className="simple-course-column">
            <article className="simple-course-card">
              <span className="simple-course-card__label">Course Provider</span>
              <h2>{content.providerName}</h2>
              {content.providerBlurb.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>

            <article className="simple-course-card">
              <h2>Course overview</h2>
              {content.overview.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              <div
                className={`simple-course-visual ${content.visual.toneClass}`}
              >
                {content.visual.image ? (
                  <Image
                    src={content.visual.image}
                    alt=""
                    fill
                    className="simple-course-visual__image"
                    sizes="(max-width: 1100px) 100vw, 50vw"
                  />
                ) : null}

                <div className="simple-course-visual__copy">
                  <strong>{content.visual.title}</strong>
                  <span>{content.visual.description}</span>
                </div>

                {content.visual.codeLines ? (
                  <div className="simple-course-visual__code" aria-hidden="true">
                    {content.visual.codeLines.map((line) => (
                      <div key={`${line.keyword}-${line.value}`}>
                        <em>{line.keyword}</em>
                        {line.value.startsWith("(")
                          ? line.value
                          : ` ${line.value}`}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="simple-course-visual__panel">
                    <span>{content.visual.eyebrow}</span>
                    <strong>Capture. Edit. Create.</strong>
                    <p>
                      Build a portfolio across portrait, travel, events and
                      commercial photography pathways.
                    </p>
                  </div>
                )}
              </div>

              <div className="simple-course-highlights">
                {content.highlights.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>

              <h2>What you could learn</h2>
              <ul className="simple-course-list">
                {course.outcomes.map((outcome) => (
                  <li key={outcome}>{outcome}</li>
                ))}
                {content.learnExtra ? <li>{content.learnExtra}</li> : null}
              </ul>

              <h2>Course details</h2>
              <p>{content.detailsIntro}</p>
              <div className="simple-course-details">
                {content.details.map((detail) => (
                  <div key={detail.label}>
                    <strong>{detail.label}</strong>
                    {detail.value}
                  </div>
                ))}
              </div>
            </article>
          </div>

          <SimpleEnrolmentCheckout
            provider={provider}
            course={course}
            initialPaymentOption={initialPaymentOption}
            studentPayProviderCode={studentPayProviderCode}
            legalApiBaseUrl={legalApiBaseUrl}
          />
        </div>
      </section>
    </div>
  );
}
