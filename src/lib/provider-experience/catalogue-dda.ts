export type CatalogueDdaRecord = {
  dda_id?: string | null;
  status?: string | null;
  processor?: string | null;
  processor_status?: string | null;
  processor_payer_id?: string | null;
  processor_mandate_id?: string | null;
  consent_accepted?: boolean | null;
  ready?: boolean | null;
  setup_url?: string | null;
};

export type CatalogueDdaAcceptance = {
  provider_student_agreement_accepted?: boolean;
  payment_plan_agreement_accepted?: boolean;
  can_continue?: boolean;
  agreements?: {
    provider_student?: { version?: string };
    payment_plan?: { version?: string };
  };
};

export function catalogueDdaStepAvailable(
  acceptance: CatalogueDdaAcceptance
): boolean {
  return (
    acceptance.provider_student_agreement_accepted === true &&
    acceptance.payment_plan_agreement_accepted === true &&
    acceptance.can_continue !== false
  );
}

export function isCatalogueDdaReady(dda: CatalogueDdaRecord | null | undefined): boolean {
  if (!dda) {
    return false;
  }

  if (dda.ready === true) {
    return Boolean(dda.processor_payer_id && dda.processor_mandate_id);
  }

  return Boolean(
    dda.processor_payer_id &&
      dda.processor_mandate_id &&
      dda.consent_accepted === true &&
      String(dda.processor || "Pinch").toLowerCase() === "pinch"
  );
}

export function catalogueConfirmBlockedInThisPhase(): boolean {
  return false;
}

export function catalogueDdaBindingAllowsProvider(providerCode: string): boolean {
  return providerCode === "BELA_BEAUTY_SANDBOX";
}

export function validateCatalogueDdaAccess({
  shown,
  submitted,
  checkoutProviderCode,
  requestProviderCode
}: {
  shown: { provider_student: string; payment_plan: string };
  submitted: CatalogueDdaAcceptance;
  checkoutProviderCode: string;
  requestProviderCode: string;
}): {
  ok: boolean;
  status: number;
  code: string;
  error?: string;
} {
  if (checkoutProviderCode !== requestProviderCode) {
    return {
      ok: false,
      status: 403,
      code: "PROVIDER_MISMATCH",
      error: "This checkout does not belong to the requested provider."
    };
  }

  if (!catalogueDdaBindingAllowsProvider(requestProviderCode)) {
    return {
      ok: false,
      status: 403,
      code: "PROVIDER_NOT_CATALOGUE",
      error: "Direct debit setup for this path is only available to the catalogue provider."
    };
  }

  const psaAccepted = submitted.provider_student_agreement_accepted === true;
  const ppaAccepted = submitted.payment_plan_agreement_accepted === true;
  const psaVersion = String(
    submitted.agreements?.provider_student?.version || ""
  ).trim();
  const ppaVersion = String(
    submitted.agreements?.payment_plan?.version || ""
  ).trim();

  if (!psaAccepted || !ppaAccepted) {
    return {
      ok: false,
      status: 409,
      code: "AGREEMENTS_REQUIRED",
      error:
        "Both agreements must be accepted before direct debit setup."
    };
  }

  if (
    psaVersion !== shown.provider_student ||
    ppaVersion !== shown.payment_plan
  ) {
    return {
      ok: false,
      status: 409,
      code: "AGREEMENT_VERSION_MISMATCH",
      error:
        "The accepted agreement versions do not match the versions currently shown for this checkout."
    };
  }

  return {
    ok: true,
    status: 200,
    code: "DDA_SETUP_ALLOWED"
  };
}

export function sanitiseCatalogueDdaError(message: string): string {
  const normalised = String(message || "").toLowerCase();
  if (normalised.includes("10") && normalised.includes("digit")) {
    return "The account number was rejected. Use a valid account number between 3 and 9 digits.";
  }
  return String(message || "Unable to set up direct debit.");
}

export function validateCatalogueConfirmAccess({
  shown,
  submitted,
  checkoutProviderCode,
  requestProviderCode,
  dda
}: {
  shown: { provider_student: string; payment_plan: string };
  submitted: CatalogueDdaAcceptance;
  checkoutProviderCode: string;
  requestProviderCode: string;
  dda: CatalogueDdaRecord | null | undefined;
}): {
  ok: boolean;
  status: number;
  code: string;
  error?: string;
} {
  if (checkoutProviderCode !== requestProviderCode) {
    return {
      ok: false,
      status: 403,
      code: "PROVIDER_MISMATCH",
      error: "This checkout does not belong to the requested provider."
    };
  }

  if (!catalogueDdaBindingAllowsProvider(requestProviderCode)) {
    return {
      ok: false,
      status: 403,
      code: "PROVIDER_NOT_CATALOGUE",
      error: "Catalogue confirmation is only available to the catalogue provider."
    };
  }

  const psaAccepted = submitted.provider_student_agreement_accepted === true;
  const ppaAccepted = submitted.payment_plan_agreement_accepted === true;
  const psaVersion = String(
    submitted.agreements?.provider_student?.version || ""
  ).trim();
  const ppaVersion = String(
    submitted.agreements?.payment_plan?.version || ""
  ).trim();

  if (!psaAccepted || !ppaAccepted) {
    return {
      ok: false,
      status: 409,
      code: "AGREEMENTS_REQUIRED",
      error:
        "Both agreements must be accepted before enrolment can be confirmed."
    };
  }

  if (
    psaVersion !== shown.provider_student ||
    ppaVersion !== shown.payment_plan
  ) {
    return {
      ok: false,
      status: 409,
      code: "AGREEMENT_VERSION_MISMATCH",
      error:
        "The accepted agreement versions do not match the versions currently shown for this checkout."
    };
  }

  if (!isCatalogueDdaReady(dda)) {
    return {
      ok: false,
      status: 409,
      code: "DDA_NOT_READY",
      error: "Direct debit is not ready for confirmation."
    };
  }

  return {
    ok: true,
    status: 200,
    code: "CONFIRM_ALLOWED"
  };
}
