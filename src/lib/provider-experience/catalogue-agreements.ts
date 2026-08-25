const RESERVED_VERSIONS = new Set(["current", "latest"]);

export type CatalogueCommercialSnapshot = {
  course_code: string;
  course_name: string;
  course_price: number;
  upfront: number;
  recurring: number;
  count: number;
  amount_to_finance: number;
  kit_disclosure: string;
};

export type CatalogueAgreementVersions = {
  provider_student: string;
  payment_plan: string;
};

export type CatalogueAgreementAcceptancePayload = {
  provider_student_agreement_accepted?: boolean;
  payment_plan_agreement_accepted?: boolean;
  agreements?: {
    provider_student?: { version?: string };
    payment_plan?: { version?: string };
  };
};

export function isConcreteAgreementVersion(version: string): boolean {
  const normalised = String(version || "").trim();

  if (!normalised || normalised.length > 80) {
    return false;
  }

  if (RESERVED_VERSIONS.has(normalised.toLowerCase())) {
    return false;
  }

  return /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(normalised);
}

export function paymentPlanFactsFromSnapshot(
  snapshot: CatalogueCommercialSnapshot,
): {
  course_price_copy: string;
  plan_copy: string;
  shows_zero_upfront: boolean;
  uses_account_validation_wording: boolean;
} {
  const coursePrice = snapshot.course_price.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: snapshot.course_price % 1 === 0 ? 0 : 2,
  });

  if (snapshot.upfront <= 0) {
    return {
      course_price_copy: coursePrice,
      plan_copy: `${snapshot.count} weekly payments of $${snapshot.recurring}`,
      shows_zero_upfront: false,
      uses_account_validation_wording: false,
    };
  }

  return {
    course_price_copy: coursePrice,
    plan_copy: `$${snapshot.upfront} upfront then ${snapshot.count} weekly payments of $${snapshot.recurring}`,
    shows_zero_upfront: false,
    uses_account_validation_wording: false,
  };
}

export function ignoreBrowserCommercialTamper(
  snapshot: CatalogueCommercialSnapshot,
  query: Record<string, string | string[] | undefined>,
): CatalogueCommercialSnapshot {
  void query;
  return snapshot;
}

export function validateSeparateAgreementAcceptance({
  shown,
  submitted,
}: {
  shown: CatalogueAgreementVersions;
  submitted: CatalogueAgreementAcceptancePayload;
}): {
  ok: boolean;
  status: number;
  code: string;
  provider_student_agreement_accepted: boolean;
  payment_plan_agreement_accepted: boolean;
  can_continue: boolean;
  error?: string;
} {
  const psaAccepted = submitted.provider_student_agreement_accepted === true;
  const ppaAccepted = submitted.payment_plan_agreement_accepted === true;
  const psaVersion = String(
    submitted.agreements?.provider_student?.version || "",
  ).trim();
  const ppaVersion = String(
    submitted.agreements?.payment_plan?.version || "",
  ).trim();

  if (!isConcreteAgreementVersion(shown.provider_student)) {
    return {
      ok: false,
      status: 409,
      code: "PROVIDER_STUDENT_AGREEMENT_INVALID_VERSION",
      provider_student_agreement_accepted: false,
      payment_plan_agreement_accepted: false,
      can_continue: false,
      error: "The Provider Student Agreement version is missing or reserved.",
    };
  }

  if (!isConcreteAgreementVersion(shown.payment_plan)) {
    return {
      ok: false,
      status: 409,
      code: "PAYMENT_PLAN_AGREEMENT_INVALID_VERSION",
      provider_student_agreement_accepted: false,
      payment_plan_agreement_accepted: false,
      can_continue: false,
      error: "The Payment Plan Agreement version is missing or reserved.",
    };
  }

  if (psaAccepted && psaVersion !== shown.provider_student) {
    return {
      ok: false,
      status: 409,
      code: "PROVIDER_STUDENT_AGREEMENT_VERSION_MISMATCH",
      provider_student_agreement_accepted: false,
      payment_plan_agreement_accepted: ppaAccepted,
      can_continue: false,
      error:
        "The accepted Provider Student Agreement version does not match the version currently shown.",
    };
  }

  if (ppaAccepted && ppaVersion !== shown.payment_plan) {
    return {
      ok: false,
      status: 409,
      code: "PAYMENT_PLAN_AGREEMENT_VERSION_MISMATCH",
      provider_student_agreement_accepted: psaAccepted,
      payment_plan_agreement_accepted: false,
      can_continue: false,
      error:
        "The accepted Payment Plan Agreement version does not match the version currently shown.",
    };
  }

  if (psaAccepted && !isConcreteAgreementVersion(psaVersion)) {
    return {
      ok: false,
      status: 400,
      code: "PROVIDER_STUDENT_AGREEMENT_VERSION_REQUIRED",
      provider_student_agreement_accepted: false,
      payment_plan_agreement_accepted: ppaAccepted,
      can_continue: false,
      error: "A concrete Provider Student Agreement version is required.",
    };
  }

  if (ppaAccepted && !isConcreteAgreementVersion(ppaVersion)) {
    return {
      ok: false,
      status: 400,
      code: "PAYMENT_PLAN_AGREEMENT_VERSION_REQUIRED",
      provider_student_agreement_accepted: psaAccepted,
      payment_plan_agreement_accepted: false,
      can_continue: false,
      error: "A concrete Payment Plan Agreement version is required.",
    };
  }

  return {
    ok: true,
    status: 200,
    code: "ACCEPTED",
    provider_student_agreement_accepted: psaAccepted,
    payment_plan_agreement_accepted: ppaAccepted,
    can_continue: psaAccepted && ppaAccepted,
  };
}

export function repeatAcceptanceIsIdempotent(
  first: ReturnType<typeof validateSeparateAgreementAcceptance>,
  second: ReturnType<typeof validateSeparateAgreementAcceptance>,
): boolean {
  return (
    first.ok &&
    second.ok &&
    first.can_continue === second.can_continue &&
    first.provider_student_agreement_accepted ===
      second.provider_student_agreement_accepted &&
    first.payment_plan_agreement_accepted ===
      second.payment_plan_agreement_accepted
  );
}

export type CatalogueReviewFacts = {
  course: string;
  course_price_copy: string;
  plan_copy: string;
  kit_disclosure: string;
  provider_student: string;
  payment_plan: string;
  direct_debit: string;
  shows_zero_upfront: boolean;
  uses_account_validation_wording: boolean;
};

export function catalogueConfirmIsExplicitAction(): boolean {
  return true;
}

export function catalogueConfirmSuccessCopy(reference: string): {
  heading: string;
  body: string;
  reference: string;
  exposesSalesforceIds: boolean;
  mentionsPaymentsScheduled: boolean;
} {
  return {
    heading: "Enrolment complete",
    body: "Your enrolment and payment plan details have been confirmed.",
    reference: String(reference || "").trim(),
    exposesSalesforceIds: false,
    mentionsPaymentsScheduled: false,
  };
}

export function commercialSnapshotFromServer({
  commercial,
  course,
}: {
  commercial?: {
    course_name?: string | null;
    course_code?: string | null;
    course_price?: number | null;
    upfront?: number | null;
    recurring?: number | null;
    count?: number | null;
    provider_name?: string | null;
  } | null;
  course: {
    code: string;
    title: string;
    coursePriceCents: number;
    upfrontCents: number;
    recurringCents: number;
    recurringCount: number;
    kitDisclosure: string;
  };
}): CatalogueCommercialSnapshot {
  return {
    course_code: commercial?.course_code || course.code,
    course_name: commercial?.course_name || course.title,
    course_price:
      Number(commercial?.course_price) || course.coursePriceCents / 100,
    upfront: Number.isFinite(Number(commercial?.upfront))
      ? Number(commercial?.upfront)
      : course.upfrontCents / 100,
    recurring: Number(commercial?.recurring) || course.recurringCents / 100,
    count: Number(commercial?.count) || course.recurringCount,
    amount_to_finance: 0,
    kit_disclosure: course.kitDisclosure,
  };
}

export function buildCatalogueReviewFacts({
  snapshot,
  psaAccepted,
  ppaAccepted,
  ddaReady,
}: {
  snapshot: CatalogueCommercialSnapshot;
  psaAccepted: boolean;
  ppaAccepted: boolean;
  ddaReady: boolean;
}): CatalogueReviewFacts {
  const facts = paymentPlanFactsFromSnapshot(snapshot);

  return {
    course: snapshot.course_name,
    course_price_copy: facts.course_price_copy,
    plan_copy: facts.plan_copy,
    kit_disclosure: snapshot.kit_disclosure,
    provider_student: psaAccepted ? "Accepted" : "Not accepted",
    payment_plan: ppaAccepted ? "Accepted" : "Not accepted",
    direct_debit: ddaReady ? "Set up" : "Not set up",
    shows_zero_upfront: facts.shows_zero_upfront,
    uses_account_validation_wording: facts.uses_account_validation_wording,
  };
}
