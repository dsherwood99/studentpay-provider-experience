"use client";

import { useEffect, useState } from "react";
import {
  type CatalogueReviewFacts
} from "@/lib/provider-experience/catalogue-confirm";
import type { CatalogueCourseView } from "@/types/catalogue";
import type { Provider } from "@/types/provider";
import type { CatalogueCheckoutSession } from "@/components/enrolment/CatalogueAgreementsStep";

type AcceptedAgreements = {
  provider_student_agreement_accepted: boolean;
  payment_plan_agreement_accepted: boolean;
  shown: { provider_student: string; payment_plan: string };
};

type CatalogueReviewConfirmStepProps = {
  provider: Provider;
  course: CatalogueCourseView;
  checkout: CatalogueCheckoutSession;
  accepted: AcceptedAgreements;
  onConfirmed: (result: { checkout_id: string; already_confirmed: boolean }) => void;
};

type ReviewResponse = {
  success?: boolean;
  review?: CatalogueReviewFacts & {
    provider_student_title?: string;
    payment_plan_title?: string;
  };
  error?: { message?: string };
};

export function CatalogueReviewConfirmStep({
  provider,
  course,
  checkout,
  accepted,
  onConfirmed
}: CatalogueReviewConfirmStepProps) {
  const [review, setReview] = useState<ReviewResponse["review"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReview() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/studentpay/catalogue-confirm?providerSlug=${encodeURIComponent(provider.slug)}&courseSlug=${encodeURIComponent(course.slug)}&checkout_id=${encodeURIComponent(checkout.checkout_id)}`,
          { cache: "no-store" }
        );
        const body = (await response.json()) as ReviewResponse;
        if (!response.ok || body.success === false) {
          throw new Error(body.error?.message || "Unable to load enrolment review.");
        }
        if (!cancelled) {
          setReview(body.review || null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load enrolment review."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReview();
    return () => {
      cancelled = true;
    };
  }, [checkout.checkout_id, course.slug, provider.slug]);

  async function confirmEnrolment() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/studentpay/catalogue-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerSlug: provider.slug,
          courseSlug: course.slug,
          checkout_id: checkout.checkout_id,
          checkout_token: checkout.checkout_token,
          provider_student_agreement_accepted:
            accepted.provider_student_agreement_accepted,
          payment_plan_agreement_accepted:
            accepted.payment_plan_agreement_accepted,
          agreements: {
            provider_student: { version: accepted.shown.provider_student },
            payment_plan: { version: accepted.shown.payment_plan }
          }
        })
      });
      const body = (await response.json()) as {
        success?: boolean;
        checkout_id?: string;
        already_confirmed?: boolean;
        error?: { message?: string };
      };
      if (!response.ok || body.success === false) {
        throw new Error(body.error?.message || "Unable to confirm enrolment.");
      }
      onConfirmed({
        checkout_id: body.checkout_id || checkout.checkout_id,
        already_confirmed: Boolean(body.already_confirmed)
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to confirm enrolment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const psaTitle = review?.provider_student_title || `${provider.name} Student Agreement`;

  return (
    <div className="catalogue-enrol-page">
      <div className="page-shell catalogue-enrol-page__inner">
        <p className="course-detail-eyebrow">{course.title}</p>
        <h1>Review and confirm</h1>
        <p>
          Check the course, agreements and direct debit details before you confirm
          enrolment.
        </p>
        {loading ? <p>Loading enrolment details…</p> : null}
        {error ? <p className="catalogue-enrol-form__error">{error}</p> : null}
        {review ? (
          <dl className="catalogue-review">
            <div>
              <dt>Course</dt>
              <dd>{review.course}</dd>
            </div>
            <div>
              <dt>Course price</dt>
              <dd>{review.course_price_copy}</dd>
            </div>
            <div>
              <dt>Payment plan</dt>
              <dd>{review.plan_copy}</dd>
            </div>
            <div>
              <dt>{psaTitle.includes("Bela") ? "Bela Student Agreement" : psaTitle}</dt>
              <dd>{accepted.provider_student_agreement_accepted ? "Accepted" : "Not accepted"}</dd>
            </div>
            <div>
              <dt>StudentPay Payment Plan Agreement</dt>
              <dd>{accepted.payment_plan_agreement_accepted ? "Accepted" : "Not accepted"}</dd>
            </div>
            <div>
              <dt>Direct debit</dt>
              <dd>{review.direct_debit}</dd>
            </div>
          </dl>
        ) : null}
        <button
          type="button"
          className="button button--course-primary"
          disabled={loading || submitting || !review}
          onClick={() => {
            void confirmEnrolment();
          }}
        >
          {submitting ? "Confirming enrolment…" : "Confirm enrolment"}
        </button>
      </div>
    </div>
  );
}
