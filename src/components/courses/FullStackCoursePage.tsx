import Link from "next/link";
import { SimpleEnrolmentCheckout } from "@/components/enrolment/SimpleEnrolmentCheckout";
import type { Course } from "@/types/course";
import type { EnrolmentPaymentOption } from "@/types/enrolment";
import type { Provider } from "@/types/provider";

type FullStackCoursePageProps = {
  provider: Provider;
  course: Course;
  initialPaymentOption: EnrolmentPaymentOption;
  studentPayProviderCode?: string;
};

export function FullStackCoursePage({
  provider,
  course,
  initialPaymentOption,
  studentPayProviderCode,
}: FullStackCoursePageProps) {
  return (
    <div className="simple-course-page">
      <section className="simple-course-hero">
        <div className="page-shell">
          <div className="simple-course-hero__breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href={`/providers/${provider.slug}/courses`}>Technology</Link>
            <span>/</span>
            <span>{course.title}</span>
          </div>

          <p className="aa-script aa-script--on-coral">Technology accelerator</p>
          <h1>{course.title}</h1>
          <p>
            Build practical software development capability through an
            industry-focused programme designed for students moving toward full
            stack developer roles.
          </p>
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
              <h2>{course.deliveryProvider || "Mission Ready"}</h2>
              <p>
                Mission Ready is a technology education provider focused on
                helping students build practical, job-ready digital skills. Its
                accelerator-style programmes are designed to connect learning
                with real-world software development, project work and
                industry-aligned capability.
              </p>
              <p>
                This demonstration page shows how StudentPay can be embedded into
                a provider&apos;s course marketing and enrolment journey,
                allowing students to choose between upfront payment and flexible
                payment plans while keeping the provider&apos;s existing digital
                experience intact.
              </p>
            </article>

            <article className="simple-course-card">
              <h2>Course overview</h2>
              <p>
                This demo product page shows how a technology education provider
                can present a polished, high-conversion course page with clear
                course outcomes and StudentPay payment choices visible before
                checkout.
              </p>
              <p>
                The course is positioned for students looking to grow practical
                full stack development capability, strengthen project experience
                and prepare for opportunities in software development teams.
              </p>

              <div className="simple-course-visual">
                <div className="simple-course-visual__copy">
                  <strong>Build. Ship. Iterate.</strong>
                  <span>
                    Practical full stack development skills supported by
                    real-world project workflows and flexible payment options.
                  </span>
                </div>
                <div className="simple-course-visual__code" aria-hidden="true">
                  <div>
                    <em>const</em> pathway = &quot;developer&quot;;
                  </div>
                  <div>
                    <em>build</em>(&quot;frontend&quot;);
                  </div>
                  <div>
                    <em>connect</em>(&quot;backend-api&quot;);
                  </div>
                  <div>
                    <em>deploy</em>(&quot;cloud&quot;);
                  </div>
                  <div>
                    <em>graduate</em>(&quot;job-ready&quot;);
                  </div>
                </div>
              </div>

              <div className="simple-course-highlights">
                <span>Full stack development pathway</span>
                <span>Practical project experience</span>
                <span>Designed for career transition</span>
                <span>Mentor and industry support</span>
              </div>

              <h2>What you could learn</h2>
              <ul className="simple-course-list">
                {course.outcomes.map((outcome) => (
                  <li key={outcome}>{outcome}</li>
                ))}
                <li>
                  Portfolio-ready project work aligned to full stack developer
                  pathways
                </li>
              </ul>

              <h2>Course details</h2>
              <p>
                The programme is presented as a practical technology accelerator,
                combining structured learning, development projects and applied
                skills practice to help students build confidence across the full
                software development lifecycle.
              </p>
              <div className="simple-course-details">
                <div>
                  <strong>Programme type</strong>
                  Advanced developer accelerator
                </div>
                <div>
                  <strong>Format</strong>
                  {course.deliveryMode}
                </div>
                <div>
                  <strong>Focus</strong>
                  Full stack development
                </div>
                <div>
                  <strong>Outcome</strong>
                  Portfolio and job-ready capability
                </div>
              </div>
            </article>
          </div>

          <SimpleEnrolmentCheckout
            provider={provider}
            course={course}
            initialPaymentOption={initialPaymentOption}
            studentPayProviderCode={studentPayProviderCode}
          />
        </div>
      </section>
    </div>
  );
}
