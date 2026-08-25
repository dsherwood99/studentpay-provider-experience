"use client";

import { useState } from "react";
import type { CatalogueCourseView } from "@/types/catalogue";
import type { Provider } from "@/types/provider";
import { paymentPlanFactsFromSnapshot } from "@/lib/provider-experience/catalogue-agreements";

export type CatalogueCheckoutSession = {
  checkout_id: string;
  opportunity_id: string;
  contact_id?: string;
  provider_order_id: string;
  checkout_token: string;
  student_agreement?: {
    title?: string | null;
    version?: string | null;
  } | null;
  payment_plan_agreement?: {
    title?: string | null;
    version?: string | null;
  } | null;
};

type CatalogueAgreementsStepProps = {
  provider: Provider;
  course: CatalogueCourseView;
  checkout: CatalogueCheckoutSession;
  onComplete: (result: {
    provider_student_agreement_accepted: boolean;
    payment_plan_agreement_accepted: boolean;
    shown: { provider_student: string; payment_plan: string };
  }) => void;
};

export function CatalogueAgreementsStep({
  provider,
  course,
  checkout,
  onComplete,
}: CatalogueAgreementsStepProps) {
  const [providerOpen, setProviderOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [providerAccepted, setProviderAccepted] = useState(false);
  const [planAccepted, setPlanAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const psaVersion = checkout.student_agreement?.version || "";
  const ppaVersion = checkout.payment_plan_agreement?.version || "";
  const psaTitle =
    checkout.student_agreement?.title || `${provider.name} Student Agreement`;
  const ppaTitle =
    checkout.payment_plan_agreement?.title ||
    "StudentPay Payment Plan Agreement";
  const facts = paymentPlanFactsFromSnapshot({
    course_code: course.code,
    course_name: course.title,
    course_price: course.coursePriceCents / 100,
    upfront: course.upfrontCents / 100,
    recurring: course.recurringCents / 100,
    count: course.recurringCount,
    amount_to_finance:
      (course.coursePriceCents - course.upfrontCents) / 100,
    kit_disclosure: course.kitDisclosure,
  });

  async function continueAfterAgreements() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/studentpay/catalogue-agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerSlug: provider.slug,
          courseSlug: course.slug,
          checkout_id: checkout.checkout_id,
          provider_student_agreement_accepted: providerAccepted,
          payment_plan_agreement_accepted: planAccepted,
          agreements: {
            provider_student: { version: psaVersion },
            payment_plan: { version: ppaVersion },
          },
        }),
      });
      const body = (await response.json()) as {
        success?: boolean;
        can_continue?: boolean;
        error?: { message?: string };
        shown?: { provider_student: string; payment_plan: string };
        provider_student_agreement_accepted?: boolean;
        payment_plan_agreement_accepted?: boolean;
      };

      if (!response.ok || body.success === false || !body.can_continue) {
        throw new Error(
          body.error?.message ||
            "Both agreements must be accepted against the current versions.",
        );
      }

      onComplete({
        provider_student_agreement_accepted: Boolean(
          body.provider_student_agreement_accepted,
        ),
        payment_plan_agreement_accepted: Boolean(
          body.payment_plan_agreement_accepted,
        ),
        shown: body.shown || {
          provider_student: psaVersion,
          payment_plan: ppaVersion,
        },
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to record agreement acceptance.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="catalogue-enrol-page">
      <div className="page-shell catalogue-agreements">
        <p className="course-detail-eyebrow">{course.title}</p>
        <h1>Review and accept agreements</h1>
        <p>
          These documents are generated from the checkout Opportunity, not from
          the prices shown in the browser.
        </p>

        <section className="catalogue-agreement-card">
          <h2>{psaTitle}</h2>
          <p className="catalogue-agreement-meta">Version {psaVersion || "—"}</p>
          <p>
            {course.title}. {facts.course_price_copy}. {course.kitDisclosure}.
          </p>
          <button
            type="button"
            className="button button--course-secondary"
            onClick={() => setProviderOpen((open) => !open)}
          >
            {providerOpen ? "Hide agreement" : "View agreement"}
          </button>
          {providerOpen ? (
            <iframe
              className="catalogue-agreement-frame"
              title={psaTitle}
              src={`/api/studentpay/legal/provider-student-agreement?token=${encodeURIComponent(
                checkout.checkout_token,
              )}`}
            />
          ) : null}
          <label className="catalogue-agreement-accept">
            <input
              type="checkbox"
              checked={providerAccepted}
              onChange={(event) => setProviderAccepted(event.target.checked)}
            />
            I agree to the {psaTitle}
          </label>
        </section>

        <section className="catalogue-agreement-card">
          <h2>{ppaTitle}</h2>
          <p className="catalogue-agreement-meta">Version {ppaVersion || "—"}</p>
          <p>
            {facts.course_price_copy}. {facts.plan_copy}.
          </p>
          <button
            type="button"
            className="button button--course-secondary"
            onClick={() => setPlanOpen((open) => !open)}
          >
            {planOpen ? "Hide agreement" : "View agreement"}
          </button>
          {planOpen ? (
            <iframe
              className="catalogue-agreement-frame"
              title={ppaTitle}
              src={`/api/studentpay/legal/payment-plan-terms?token=${encodeURIComponent(
                checkout.checkout_token,
              )}`}
            />
          ) : null}
          <label className="catalogue-agreement-accept">
            <input
              type="checkbox"
              checked={planAccepted}
              onChange={(event) => setPlanAccepted(event.target.checked)}
            />
            I agree to the {ppaTitle}
          </label>
        </section>

        {error ? <p className="catalogue-enrol-form__error">{error}</p> : null}

        <button
          type="button"
          className="button button--course-primary"
          disabled={!providerAccepted || !planAccepted || submitting}
          onClick={() => {
            void continueAfterAgreements();
          }}
        >
          {submitting ? "Saving acceptance…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
