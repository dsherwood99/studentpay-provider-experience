"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { KitDisclosure } from "@/components/courses/KitDisclosure";
import { PricingSummary } from "@/components/courses/PricingSummary";
import { ProviderIdentity } from "@/components/providers/ProviderIdentity";
import {
  CatalogueAgreementsStep,
  type CatalogueCheckoutSession,
} from "@/components/enrolment/CatalogueAgreementsStep";
import { CatalogueDdaStep } from "@/components/enrolment/CatalogueDdaStep";
import { CatalogueReviewConfirmStep } from "@/components/enrolment/CatalogueReviewConfirmStep";
import type { CatalogueDdaRecord } from "@/lib/provider-experience/catalogue-dda";
import { catalogueConfirmSuccessCopy } from "@/lib/provider-experience/catalogue-confirm";
import type { CatalogueCourseView } from "@/types/catalogue";
import type { CatalogueStudentDetails } from "@/lib/provider-experience/catalogue-checkout";
import type { Provider } from "@/types/provider";

type CatalogueEnrolmentFormProps = {
  provider: Provider;
  course: CatalogueCourseView;
};

type CreatedCheckout = CatalogueCheckoutSession;

type AcceptedAgreements = {
  provider_student_agreement_accepted: boolean;
  payment_plan_agreement_accepted: boolean;
  shown: { provider_student: string; payment_plan: string };
};

const emptyStudent: CatalogueStudentDetails = {
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  dateOfBirth: "",
  addressLine1: "",
  suburb: "",
  state: "VIC",
  postcode: "",
};

export function CatalogueEnrolmentForm({
  provider,
  course,
}: CatalogueEnrolmentFormProps) {
  const [student, setStudent] = useState<CatalogueStudentDetails>(emptyStudent);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedCheckout | null>(null);
  const [accepted, setAccepted] = useState<AcceptedAgreements | null>(null);
  const [dda, setDda] = useState<CatalogueDdaRecord | null>(null);
  const [confirmed, setConfirmed] = useState<{
    checkout_id: string;
    already_confirmed: boolean;
  } | null>(null);

  function update<K extends keyof CatalogueStudentDetails>(
    field: K,
    value: CatalogueStudentDetails[K],
  ) {
    setStudent((current) => ({ ...current, [field]: value }));
  }

  async function startEnrolment(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/studentpay/provider-checkouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerSlug: provider.slug,
          courseSlug: course.slug,
          catalogueStudent: student,
        }),
      });
      const body = (await response.json()) as {
        success?: boolean;
        error?: { message?: string };
        checkout_id?: string;
        opportunity_id?: string;
        contact_id?: string;
        provider_order_id?: string;
        checkout_token?: string;
        student_agreement?: CatalogueCheckoutSession["student_agreement"];
        payment_plan_agreement?: CatalogueCheckoutSession["payment_plan_agreement"];
      };

      if (!response.ok || body.success === false) {
        throw new Error(body.error?.message || "Unable to start enrolment.");
      }

      if (!body.checkout_token) {
        throw new Error("Checkout was created but no agreement token was returned.");
      }

      setCreated({
        checkout_id: body.checkout_id || "",
        opportunity_id: body.opportunity_id || "",
        contact_id: body.contact_id,
        provider_order_id: body.provider_order_id || "",
        checkout_token: body.checkout_token,
        student_agreement: body.student_agreement,
        payment_plan_agreement: body.payment_plan_agreement,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start enrolment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created && accepted && dda && confirmed) {
    const copy = catalogueConfirmSuccessCopy(confirmed.checkout_id);
    return (
      <div className="catalogue-enrol-page">
        <div className="page-shell catalogue-enrol-page__inner">
          <ProviderIdentity provider={provider} width={190} height={72} />
          <p className="course-detail-eyebrow">{course.title}</p>
          <h1>{copy.heading}</h1>
          <p>{copy.body}</p>
          <p>
            Reference: {copy.reference}
          </p>
          <Link
            href={`/providers/${provider.slug}/courses/${course.slug}`}
            className="button button--course-secondary"
          >
            Back to course
          </Link>
        </div>
      </div>
    );
  }

  if (created && accepted && dda) {
    return (
      <CatalogueReviewConfirmStep
        provider={provider}
        course={course}
        checkout={created}
        accepted={accepted}
        onConfirmed={setConfirmed}
      />
    );
  }

  if (created && accepted) {
    return (
      <CatalogueDdaStep
        provider={provider}
        course={course}
        checkout={created}
        studentFirstName={student.firstName}
        accepted={accepted}
        onComplete={setDda}
      />
    );
  }

  if (created) {
    return (
      <CatalogueAgreementsStep
        provider={provider}
        course={course}
        checkout={created}
        onComplete={setAccepted}
      />
    );
  }

  return (
    <div className="catalogue-enrol-page">
      <div className="page-shell catalogue-enrol-page__grid">
        <section>
          <Link
            href={`/providers/${provider.slug}/courses/${course.slug}`}
            className="course-detail-back-link"
          >
            ← {course.title}
          </Link>
          <h1>Student details</h1>
          <p>
            Enter the student contact details for this enrolment. Course pricing
            is taken from the catalogue, not from this form.
          </p>

          <form className="catalogue-enrol-form" onSubmit={startEnrolment}>
            <label>
              First name
              <input
                required
                value={student.firstName}
                onChange={(event) => update("firstName", event.target.value)}
              />
            </label>
            <label>
              Last name
              <input
                required
                value={student.lastName}
                onChange={(event) => update("lastName", event.target.value)}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={student.email}
                onChange={(event) => update("email", event.target.value)}
              />
            </label>
            <label>
              Mobile
              <input
                required
                value={student.mobile}
                onChange={(event) => update("mobile", event.target.value)}
              />
            </label>
            <label>
              Date of birth
              <input
                required
                type="date"
                value={student.dateOfBirth}
                onChange={(event) => update("dateOfBirth", event.target.value)}
              />
            </label>
            <label>
              Street address
              <input
                required
                value={student.addressLine1}
                onChange={(event) => update("addressLine1", event.target.value)}
              />
            </label>
            <label>
              Suburb
              <input
                required
                value={student.suburb}
                onChange={(event) => update("suburb", event.target.value)}
              />
            </label>
            <label>
              State
              <input
                required
                value={student.state}
                onChange={(event) => update("state", event.target.value)}
              />
            </label>
            <label>
              Postcode
              <input
                required
                value={student.postcode}
                onChange={(event) => update("postcode", event.target.value)}
              />
            </label>

            {error ? <p className="catalogue-enrol-form__error">{error}</p> : null}

            <button
              type="button"
              className="button button--course-primary"
              disabled={submitting}
              onClick={() => {
                void startEnrolment();
              }}
            >
              {submitting ? "Starting enrolment…" : "Start enrolment"}
            </button>
          </form>
        </section>

        <aside className="course-detail-payment-card">
          <ProviderIdentity provider={provider} width={190} height={72} />
          <h2>{course.title}</h2>
          <PricingSummary course={course} />
          <KitDisclosure text={course.kitDisclosure} />
        </aside>
      </div>
    </div>
  );
}
