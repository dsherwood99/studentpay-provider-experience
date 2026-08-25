"use client";

import { useEffect, useState } from "react";
import { DdaSetupEmbed } from "@/components/enrolment/DdaSetupEmbed";
import {
  isCatalogueDdaReady,
  type CatalogueDdaRecord
} from "@/lib/provider-experience/catalogue-dda";
import type { CatalogueCourseView } from "@/types/catalogue";
import type { Provider } from "@/types/provider";
import type { CatalogueCheckoutSession } from "@/components/enrolment/CatalogueAgreementsStep";

type AcceptedAgreements = {
  provider_student_agreement_accepted: boolean;
  payment_plan_agreement_accepted: boolean;
  shown: { provider_student: string; payment_plan: string };
};

type CatalogueDdaStepProps = {
  provider: Provider;
  course: CatalogueCourseView;
  checkout: CatalogueCheckoutSession;
  studentFirstName: string;
  accepted: AcceptedAgreements;
  onComplete: (dda: CatalogueDdaRecord) => void;
};

export function CatalogueDdaStep({
  provider,
  course,
  checkout,
  studentFirstName,
  accepted,
  onComplete
}: CatalogueDdaStepProps) {
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [dda, setDda] = useState<CatalogueDdaRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = isCatalogueDdaReady(dda);

  async function loadStatus() {
    const response = await fetch(
      `/api/studentpay/catalogue-dda?providerSlug=${encodeURIComponent(provider.slug)}&courseSlug=${encodeURIComponent(course.slug)}&checkout_id=${encodeURIComponent(checkout.checkout_id)}`,
      { cache: "no-store" }
    );
    const body = (await response.json()) as {
      success?: boolean;
      ready?: boolean;
      direct_debit?: CatalogueDdaRecord | null;
      error?: { message?: string };
    };
    if (!response.ok || body.success === false) {
      throw new Error(body.error?.message || "Unable to verify direct debit status.");
    }
    return body.direct_debit || null;
  }

  async function startSetup() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/studentpay/catalogue-dda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerSlug: provider.slug,
          courseSlug: course.slug,
          checkout_id: checkout.checkout_id,
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
        ready?: boolean;
        setup_url?: string | null;
        direct_debit?: CatalogueDdaRecord | null;
        error?: { message?: string };
      };
      if (!response.ok || body.success === false) {
        throw new Error(body.error?.message || "Unable to start direct debit setup.");
      }
      setDda(body.direct_debit || null);
      if (isCatalogueDdaReady(body.direct_debit) || body.ready) {
        return;
      }
      if (!body.setup_url) {
        throw new Error("Direct debit setup URL was not returned.");
      }
      setSetupUrl(body.setup_url);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to start direct debit setup."
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyAuthorised() {
    setVerifying(true);
    setError(null);
    try {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const latest = await loadStatus();
        setDda(latest);
        if (isCatalogueDdaReady(latest)) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setError("Direct debit is not authorised yet. Complete bank setup and try again.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to verify direct debit."
      );
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => {
    if (ready && dda) {
      onComplete(dda);
    }
  }, [dda, onComplete, ready]);

  if (ready) {
    return (
      <div className="catalogue-enrol-page">
        <div className="page-shell catalogue-agreements">
          <p className="course-detail-eyebrow">{course.title}</p>
          <h1>Direct debit is set up.</h1>
          <p>Preparing your enrolment review…</p>
        </div>
      </div>
    );
  }

  if (setupUrl) {
    return (
      <div>
        {verifying ? (
          <p className="catalogue-agreement-meta">Verifying authorisation with StudentPay…</p>
        ) : null}
        {error ? <p className="catalogue-enrol-form__error">{error}</p> : null}
        <DdaSetupEmbed
          setupUrl={setupUrl}
          studentFirstName={studentFirstName}
          courseTitle={course.title}
          lead="Set up the bank account that StudentPay will use for your payment plan."
          onAuthorised={() => {
            void verifyAuthorised();
          }}
          onRestart={() => {
            setSetupUrl(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="catalogue-enrol-page">
      <div className="page-shell catalogue-agreements">
        <p className="course-detail-eyebrow">{course.title}</p>
        <h1>Direct Debit Setup</h1>
        <p>
          Set up the bank account that StudentPay will use for your payment plan.
        </p>
        {verifying ? <p>Verifying authorisation with StudentPay…</p> : null}
        {error ? <p className="catalogue-enrol-form__error">{error}</p> : null}
        <button
          type="button"
          className="button button--course-primary"
          disabled={loading}
          onClick={() => {
            void startSetup();
          }}
        >
          {loading ? "Preparing setup…" : "Set up direct debit"}
        </button>
      </div>
    </div>
  );
}
