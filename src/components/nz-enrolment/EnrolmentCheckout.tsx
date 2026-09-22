"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  NZ_CONFIRM_CTA,
  NZ_CONFIRMATION_COPY,
  NZ_DIRECT_DEBIT_COPY,
  NZ_DIRECT_DEBIT_CTA,
  NZ_PAYMENT_CHOICE_LEAD,
  NZ_PAYMENT_PLAN_CHOICE_COPY,
  NZ_PAY_IN_FULL_COPY,
  NZ_REVIEW_COPY,
  NZ_STUDENT_DETAILS_COPY,
  CONFIRMATION_GROUP_LABELS,
  CONFIRMATION_SUMMARY_GROUPS,
  combinedDetailsPrivacyAccepted,
  confirmEnabled,
  declarationsAccepted,
  decorateConfirmationRows,
  isConfirmedCheckoutStatus,
  paymentPlanConfirmationRows,
  payNowChoiceBody,
  paymentPlanChoiceCopy,
  planDisplay,
  sectionStatus,
  sectionStatusLabel,
  setCombinedDetailsPrivacyDeclaration,
  shouldConfirmCheckout,
  shouldCreateCheckout,
  shouldPollDirectDebitStatus,
  studentDetailsAreValid,
  studentDetailsStarted,
  type ConfirmationSummaryRow,
} from "@/lib/nz-enrolment/checkout-ui";
import {
  clearedStateForPaymentSwitch,
  hostedCheckoutConfirmDeclarations,
  hostedCheckoutCopy,
  hostedCheckoutCreatePlan,
  hostedCheckoutRenderFlags,
  initialHostedPaymentOption,
  paymentMethodSwitchLocked,
  resolveHostedPaymentMode,
  resolveHostedPaymentOption,
} from "@/lib/nz-enrolment/checkout-payment-mode";
import {
  defaultFirstPaymentDate,
  formatNzdFromCents,
  previewPlan,
} from "@/lib/nz-enrolment/plan-math";
import {
  authoritativePayInFullPriceCents,
} from "@/lib/nz-enrolment/pay-in-full";
import {
  enrolmentCompleteFromBrowser,
  isPayInFullOption,
  payInFullDeclarationsAccepted,
  payInFullFailureCopy,
  payInFullPhase,
  payInFullReviewErrorAfterPayment,
  payInFullSuccessCopy,
  shouldCreatePayInFullCheckout,
  shouldPollPayInFullStatus,
} from "@/lib/nz-enrolment/pay-in-full-flow";
import { confirmPayInFullElementsPayment } from "@/lib/nz-enrolment/pay-in-full-stripe";
import { PayInFullCardForm } from "@/components/nz-enrolment/PayInFullCardForm";
import { NzCourseConfigurationUnavailable } from "@/components/nz-enrolment/CourseConfigurationUnavailable";
import { ProviderNativeHeader } from "@/components/nz-enrolment/ProviderNativeHeader";
import { StudentPayAttribution } from "@/components/nz-enrolment/StudentPayAttribution";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import {
  formatEnrolmentDisplayDate,
  providerCourseWebsiteUrl,
  safeReturnToProviderUrl,
  tenantCssVars,
} from "@/lib/nz-enrolment/presentation";
import type {
  NzPaymentOptionId,
  NzPlanPreview,
  NzPublicCourse,
  NzPublicTenant,
  NzStudentDetails,
} from "@/lib/nz-enrolment/types";
import { validateStudentDetails } from "@/lib/nz-enrolment/validation";
import {
  ddaPopupPreparingHtml,
  handleManuallyClosedDdaPopup,
  parseTrustedDdaReturnMessage,
  runDdaSetupClick,
  shouldRefreshStatusAfterDdaReturn,
  shouldUseDesktopDdaPopup,
} from "@/lib/nz-enrolment/dda-popup";
import {
  hostedLegalDocumentHref,
  openLegalAgreementDocument,
  shouldUseDesktopLegalPopup,
  type HostedLegalKind,
} from "@/lib/nz-enrolment/legal-popup";
import {
  providerStudentAgreementAccepted,
} from "@/lib/nz-enrolment/hosted-agreement";
import styles from "./enrolment-checkout.module.css";

type Props = {
  tenant: NzPublicTenant;
  course: NzPublicCourse;
  ddaReturn?: "return" | "cancelled" | null;
  payInFullAvailable?: boolean;
  paymentPlanAvailable?: boolean;
};

const emptyStudent: NzStudentDetails = {
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  dateOfBirth: "",
  streetAddress: "",
  suburb: "",
  city: "",
  postcode: "",
  region: "",
  country: "New Zealand",
};

const POLL_MS = 3_000;

type StoredDraft = {
  student: NzStudentDetails;
  upfrontAmountCents: number;
  frequency: NzPublicCourse["planPolicy"]["frequency"];
  numberOfInstalments: number;
  firstPaymentDate: string;
  paymentOption?: NzPaymentOptionId;
};

function draftStorageKey(providerSlug: string, courseSlug: string): string {
  return `nz-enrolment-draft:${providerSlug}:${courseSlug}`;
}

function writeStoredDraft(providerSlug: string, courseSlug: string, draft: StoredDraft): void {
  window.sessionStorage.setItem(draftStorageKey(providerSlug, courseSlug), JSON.stringify(draft));
}

function clearStoredDraft(providerSlug: string, courseSlug: string): void {
  window.sessionStorage.removeItem(draftStorageKey(providerSlug, courseSlug));
}

function useStoredDraft(providerSlug: string, courseSlug: string): StoredDraft | null {
  const key = draftStorageKey(providerSlug, courseSlug);
  const raw = useSyncExternalStore(
    () => () => undefined,
    () => {
      try {
        return window.sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredDraft;
  } catch {
    return null;
  }
}

type StatusPayload = {
  success?: boolean;
  payment_option?: string;
  checkout?: { checkout_id?: string; opportunity_id?: string; status?: string };
  pricing?: { course_price?: number | null };
  card_payment?: {
    required?: boolean;
    client_secret?: string;
    publishable_key?: string | null;
    payment_status?: string | null;
    stripe_status?: string | null;
    ledger_posted?: boolean;
    amount?: number | null;
  };
  direct_debit?: {
    setup_complete?: boolean;
    setup_url?: string | null;
  };
  session?: {
    providerSlug?: string;
    courseSlug?: string;
    paymentOption?: NzPaymentOptionId | null;
  };
  agreement?: { number?: string | null };
  error?: { message?: string; code?: string; invalid_fields?: Record<string, string> };
};

export function NzEnrolmentCheckout({
  tenant,
  course: initialCourse,
  ddaReturn = null,
  payInFullAvailable = false,
  paymentPlanAvailable = true,
}: Props) {
  const [course, setCourse] = useState(initialCourse);
  const [configurationUnavailable, setConfigurationUnavailable] = useState(false);
  const paymentMode = resolveHostedPaymentMode({
    paymentPlanAvailable,
    payInFullAvailable,
  });
  const studentSectionRef = useRef<HTMLElement | null>(null);
  const ddaSectionRef = useRef<HTMLElement | null>(null);
  const reviewSectionRef = useRef<HTMLElement | null>(null);
  const firstErrorRef = useRef<HTMLSpanElement | null>(null);
  const confirmHelpId = useId();
  const ddaHelpId = useId();

  const storedDraft = useStoredDraft(tenant.slug, course.slug);
  const [student, setStudent] = useState<NzStudentDetails>(emptyStudent);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [upfrontAmountCents, setUpfrontAmountCents] = useState(
    course.planPolicy.upfrontAmountCents,
  );
  const [frequency, setFrequency] = useState(course.planPolicy.frequency);
  const [numberOfInstalments, setNumberOfInstalments] = useState(
    course.planPolicy.mode === "student_selected_equal"
      ? course.planPolicy.numberOfInstalments
      : 0,
  );
  const [firstPaymentDate, setFirstPaymentDate] = useState(defaultFirstPaymentDate());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sectionErrors, setSectionErrors] = useState<{
    student?: string;
    dda?: string;
    review?: string;
  }>({});
  const [setupUrl, setSetupUrl] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [agreementNumber, setAgreementNumber] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const ddaFocusedRef = useRef(false);
  const ddaPopupRef = useRef<Window | null>(null);
  const statusRefreshRef = useRef<() => Promise<void>>(async () => {});
  const ddaOpeningRef = useRef(false);
  const [ddaPopupOpen, setDdaPopupOpen] = useState(false);
  const [declarations, setDeclarations] = useState({
    payment_plan_accepted: false,
    information_confirmed: false,
    privacy_consent_accepted: false,
    provider_student_agreement_accepted: false,
  });
  const [paymentOption, setPaymentOption] = useState<NzPaymentOptionId>(
    () => initialHostedPaymentOption(paymentMode) ?? "interest_free_payment_plan",
  );
  const [paymentChoiceTouched, setPaymentChoiceTouched] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [ledgerPosted, setLedgerPosted] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<string | null>(null);
  const [authoritativePriceCents, setAuthoritativePriceCents] = useState(
    course.paymentInFullCourseFeeCents,
  );
  const [stripeSucceeded, setStripeSucceeded] = useState(false);
  const [serverErrorAfterPayment, setServerErrorAfterPayment] = useState(false);
  const [confirmCode, setConfirmCode] = useState<string | null>(null);
  const creatingRef = useRef(false);
  const payingRef = useRef(false);
  const stripeApiRef = useRef<{ stripe: Stripe; elements: StripeElements } | null>(null);
  const cardSectionRef = useRef<HTMLElement | null>(null);

  const resolvedStudent = studentDetailsStarted(student)
    ? student
    : (storedDraft?.student ?? student);
  const resolvedUpfront =
    storedDraft && !studentDetailsStarted(student)
      ? storedDraft.upfrontAmountCents
      : upfrontAmountCents;
  const resolvedFrequency =
    storedDraft && !studentDetailsStarted(student)
      ? storedDraft.frequency
      : frequency;
  const resolvedInstalments =
    storedDraft && !studentDetailsStarted(student)
      ? storedDraft.numberOfInstalments
      : numberOfInstalments;
  const resolvedFirstPaymentDate =
    storedDraft && firstPaymentDate === defaultFirstPaymentDate()
      ? storedDraft.firstPaymentDate
      : firstPaymentDate;

  const derivedPlan = course.planPolicy.mode === "derived_regular";
  const payInFullEligible = payInFullAvailable;
  const resolvedPaymentOption: NzPaymentOptionId =
    resolveHostedPaymentOption({
      mode: paymentMode,
      selected: paymentOption,
      paymentChoiceTouched,
      storedDraftOption: storedDraft?.paymentOption,
    }) ?? paymentOption;
  const isPayInFull = payInFullEligible && isPayInFullOption(resolvedPaymentOption);
  const renderFlags = hostedCheckoutRenderFlags({
    mode: paymentMode,
    selectedOption: resolvedPaymentOption,
  });
  const preview: NzPlanPreview | null = useMemo(() => {
    if (!renderFlags.allowPlanPreview && !renderFlags.showPaymentPlanChoice) {
      return null;
    }
    try {
      if (course.planPolicy.mode === "derived_regular") {
        return previewPlan({
          coursePriceCents: course.paymentPlanCourseFeeCents,
          upfrontAmountCents: course.planPolicy.upfrontAmountCents,
          frequency: course.planPolicy.frequency,
          regularInstalmentCents: course.planPolicy.regularInstalmentCents,
          firstPaymentDate: resolvedFirstPaymentDate,
        });
      }
      return previewPlan({
        coursePriceCents: course.paymentPlanCourseFeeCents,
        upfrontAmountCents: resolvedUpfront,
        frequency: resolvedFrequency,
        numberOfInstalments: resolvedInstalments,
        firstPaymentDate: resolvedFirstPaymentDate,
      });
    } catch {
      return null;
    }
  }, [
    course,
    renderFlags.allowPlanPreview,
    renderFlags.showPaymentPlanChoice,
    resolvedFirstPaymentDate,
    resolvedFrequency,
    resolvedInstalments,
    resolvedUpfront,
  ]);

  const display = preview ? planDisplay(preview) : null;
  const planChoice = preview ? paymentPlanChoiceCopy(preview) : null;
  const payNowBody = payNowChoiceBody({
    paymentInFullCourseFeeCents: course.paymentInFullCourseFeeCents,
    paymentPlanCourseFeeCents: course.paymentPlanCourseFeeCents,
  });
  const studentValid = studentDetailsAreValid(resolvedStudent);
  const studentStarted = studentDetailsStarted(resolvedStudent);
  const ddaError =
    sectionErrors.dda ||
    (ddaReturn === "cancelled"
      ? "Direct Debit setup was cancelled. You can try again without creating a second enrolment."
      : undefined);
  const alreadyCreated = Boolean(setupUrl || checkoutId);
  const alreadyConfirmed = confirmed || isConfirmedCheckoutStatus(checkoutStatus || undefined);
  const providerAgreement = course.providerStudentAgreement || null;
  const psaRequired = Boolean(providerAgreement);
  const psaAccepted = providerStudentAgreementAccepted({
    required: psaRequired,
    accepted: declarations.provider_student_agreement_accepted,
  });
  const accepted = declarationsAccepted(declarations) && psaAccepted;
  const planLocked = alreadyCreated;
  const courseWebsiteUrl = providerCourseWebsiteUrl(tenant, course);
  const returnToProviderUrl = safeReturnToProviderUrl(tenant);
  const attribution = tenant.presentation.attributionLabel;
  const displayedCoursePriceCents = isPayInFull
    ? authoritativePriceCents
    : course.paymentPlanCourseFeeCents;
  const copy = hostedCheckoutCopy({
    mode: paymentMode,
    selectedOption: resolvedPaymentOption,
    amountCents: displayedCoursePriceCents,
    tenantAttribution: attribution,
  });
  const pifDeclarationsOk =
    payInFullDeclarationsAccepted(declarations) && psaAccepted;
  const pifPhase = payInFullPhase({
    confirmed: alreadyConfirmed,
    stripeSucceeded,
    ledgerPosted,
    stripeStatus,
    paymentStatus: stripeStatus,
    confirmCode,
    serverErrorAfterPayment,
    hasClientSecret: Boolean(clientSecret),
  });
  const pifFailure = payInFullFailureCopy(pifPhase);

  const planStatus = sectionStatus({
    section: "plan",
    planReady: Boolean(preview),
    studentValid,
    studentStarted,
    studentErrors: Object.keys(fieldErrors).length > 0,
    hasCheckoutSession: alreadyCreated,
    setupComplete,
    ddaCancelled: ddaReturn === "cancelled",
    confirmed: alreadyConfirmed,
  });
  const studentStatus = sectionStatus({
    section: "student",
    planReady: Boolean(preview),
    studentValid,
    studentStarted,
    studentErrors: Object.keys(fieldErrors).length > 0,
    hasCheckoutSession: alreadyCreated,
    setupComplete,
    ddaCancelled: ddaReturn === "cancelled",
    confirmed: alreadyConfirmed,
  });
  const ddaStatus = sectionStatus({
    section: "dda",
    planReady: Boolean(preview),
    studentValid,
    studentStarted,
    studentErrors: Object.keys(fieldErrors).length > 0,
    hasCheckoutSession: alreadyCreated,
    setupComplete,
    ddaCancelled: ddaReturn === "cancelled",
    confirmed: alreadyConfirmed,
  });
  const reviewStatus = sectionStatus({
    section: "review",
    planReady: Boolean(preview),
    studentValid,
    studentStarted,
    studentErrors: Object.keys(fieldErrors).length > 0,
    hasCheckoutSession: alreadyCreated,
    setupComplete,
    ddaCancelled: ddaReturn === "cancelled",
    confirmed: alreadyConfirmed,
  });

  const canCreate =
    renderFlags.allowCheckoutCreate &&
    (isPayInFull
      ? shouldCreatePayInFullCheckout({
          eligible: payInFullEligible,
          studentValid,
          alreadyCreated,
          userClickedContinue: true,
          busy: false,
        })
      : shouldCreateCheckout({
          studentValid,
          alreadyCreated,
          userClickedDirectDebit: true,
          busy: false,
        }));
  const canConfirm = isPayInFull
    ? pifDeclarationsOk && studentValid && !alreadyConfirmed && Boolean(clientSecret)
    : confirmEnabled({
        studentValid,
        setupComplete,
        declarationsAccepted: accepted,
        busy: false,
        alreadyConfirmed,
      });

  function persistDraft() {
    writeStoredDraft(tenant.slug, course.slug, {
      student: resolvedStudent,
      upfrontAmountCents: resolvedUpfront,
      frequency: resolvedFrequency,
      numberOfInstalments: resolvedInstalments,
      firstPaymentDate: resolvedFirstPaymentDate,
      paymentOption: resolvedPaymentOption,
    });
  }

  function applyStatus(json: StatusPayload) {
    if (json.session?.providerSlug && json.session.providerSlug !== tenant.slug) {
      return;
    }
    if (json.session?.courseSlug && json.session.courseSlug !== course.slug) {
      return;
    }
    if (json.payment_option === "pay_in_full" || json.session?.paymentOption === "pay_in_full") {
      setPaymentOption("pay_in_full");
      setPaymentChoiceTouched(true);
    }
    if (json.direct_debit?.setup_url) {
      setSetupUrl(json.direct_debit.setup_url);
    }
    if (json.direct_debit?.setup_complete) {
      setSetupComplete(true);
    }
    if (json.checkout?.checkout_id) {
      setCheckoutId(json.checkout.checkout_id);
    }
    if (json.checkout?.status) {
      setCheckoutStatus(json.checkout.status);
      if (isConfirmedCheckoutStatus(json.checkout.status)) {
        setConfirmed(true);
        clearStoredDraft(tenant.slug, course.slug);
      }
    }
    if (json.agreement?.number) {
      setAgreementNumber(json.agreement.number);
    }
    if (json.pricing?.course_price != null) {
      setAuthoritativePriceCents(
        authoritativePayInFullPriceCents({
          catalogueCents: course.paymentInFullCourseFeeCents,
          serverCoursePrice: json.pricing.course_price,
        }),
      );
    }
    if (json.card_payment?.client_secret) {
      setClientSecret(json.card_payment.client_secret);
    }
    if (json.card_payment?.publishable_key) {
      setPublishableKey(json.card_payment.publishable_key);
    }
    if (json.card_payment?.ledger_posted) {
      setLedgerPosted(true);
    }
    if (json.card_payment?.stripe_status) {
      setStripeStatus(json.card_payment.stripe_status);
      if (json.card_payment.stripe_status === "succeeded") {
        setStripeSucceeded(true);
      }
    }
  }

  async function fetchStatus() {
    const response = await fetch("/api/enrolment-checkout/status", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    const json = (await response.json().catch(() => ({}))) as StatusPayload;
    if (!response.ok) {
      if (response.status !== 404 && alreadyCreated) {
        setSectionErrors((current) => ({
          ...current,
          [isPayInFull ? "review" : "dda"]:
            json.error?.message ||
            (isPayInFull
              ? "Unable to refresh payment status."
              : "Unable to refresh Direct Debit status."),
        }));
      }
      return;
    }
    applyStatus(json);
  }

  useEffect(() => {
    statusRefreshRef.current = fetchStatus;
  });

  useEffect(() => {
    function onDdaReturnMessage(event: MessageEvent) {
      const parsed = parseTrustedDdaReturnMessage(event);
      if (!parsed || !shouldRefreshStatusAfterDdaReturn(parsed)) {
        return;
      }
      const popup = ddaPopupRef.current;
      if (popup && !popup.closed) {
        try {
          popup.close();
        } catch {
          // The callback page also attempts to close itself.
        }
      }
      ddaPopupRef.current = null;
      setDdaPopupOpen(false);
      void statusRefreshRef.current();
    }
    window.addEventListener("message", onDdaReturnMessage);
    return () => window.removeEventListener("message", onDdaReturnMessage);
  }, []);

  useEffect(() => {
    if (!ddaPopupOpen) {
      return;
    }
    const timer = window.setInterval(() => {
      const popup = ddaPopupRef.current;
      if (popup && !popup.closed) {
        return;
      }
      window.clearInterval(timer);
      ddaPopupRef.current = null;
      setDdaPopupOpen(false);
      const next = handleManuallyClosedDdaPopup({
        alreadyCreated: Boolean(setupUrl || checkoutId),
      });
      if (next.refreshStatusOnce) {
        void statusRefreshRef.current();
      }
    }, 400);
    return () => window.clearInterval(timer);
  }, [ddaPopupOpen, setupUrl, checkoutId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const bootstrap = await fetch(
        `/api/enrolment-checkout?providerSlug=${encodeURIComponent(tenant.slug)}&courseSlug=${encodeURIComponent(course.slug)}`,
        { method: "GET", credentials: "same-origin", cache: "no-store" },
      );
      if (!cancelled && bootstrap.status === 503) {
        const failed = (await bootstrap.json().catch(() => ({}))) as {
          error?: { code?: string };
        };
        if (failed.error?.code === "COURSE_CONFIGURATION_UNAVAILABLE") {
          setConfigurationUnavailable(true);
          return;
        }
      }
      if (!cancelled && bootstrap.ok) {
        const json = (await bootstrap.json().catch(() => ({}))) as StatusPayload & {
          eligibility?: { pay_in_full_available?: boolean };
          courses?: NzPublicCourse[];
        };
        const overlaid = json.courses?.find(
          (item) => item.courseCode === initialCourse.courseCode,
        );
        if (overlaid) {
          setCourse(overlaid);
          setUpfrontAmountCents(overlaid.planPolicy.upfrontAmountCents);
          setFrequency(overlaid.planPolicy.frequency);
        }
        if (json.session?.paymentOption === "pay_in_full") {
          setPaymentOption("pay_in_full");
          setPaymentChoiceTouched(true);
        }
      }
      const response = await fetch("/api/enrolment-checkout/status", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = (await response.json().catch(() => ({}))) as StatusPayload;
      if (cancelled || !response.ok) {
        return;
      }
      applyStatus(json);
    })();
    return () => {
      cancelled = true;
    };
    // Resume only. Never create or confirm from this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot status resume on mount
  }, []);

  useEffect(() => {
    const pollPif = shouldPollPayInFullStatus({
      hasCheckoutSession: alreadyCreated,
      paymentOption: resolvedPaymentOption,
      alreadyConfirmed,
    });
    const pollPlan = shouldPollDirectDebitStatus({
      hasCheckoutSession: alreadyCreated,
      ddaReturn,
    });
    if (!(isPayInFull ? pollPif : pollPlan)) {
      return;
    }
    const timer = window.setInterval(() => {
      void fetchStatus();
    }, POLL_MS);
    return () => window.clearInterval(timer);
    // fetchStatus closes over latest state; interval is gated only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyCreated, ddaReturn, isPayInFull, resolvedPaymentOption, alreadyConfirmed]);

  useEffect(() => {
    if (!ddaReturn || ddaFocusedRef.current) {
      return;
    }
    const target = setupComplete ? reviewSectionRef.current : ddaSectionRef.current;
    if (!target) {
      return;
    }
    target.focus();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    ddaFocusedRef.current = true;
  }, [ddaReturn, setupComplete]);

  function updateStudent<K extends keyof NzStudentDetails>(
    key: K,
    value: NzStudentDetails[K],
  ) {
    setStudent((current) => {
      const base = studentDetailsStarted(current)
        ? current
        : (storedDraft?.student ?? current);
      return { ...base, [key]: value };
    });
  }

  async function createCheckout(): Promise<string | null> {
    if (creatingRef.current) {
      return null;
    }
    const nextErrors = validateStudentDetails(resolvedStudent);
    const createPlan = hostedCheckoutCreatePlan({
      mode: paymentMode,
      selectedOption: resolvedPaymentOption,
      plan: {
        upfrontAmountCents: resolvedUpfront,
        frequency: resolvedFrequency,
        numberOfInstalments: resolvedInstalments,
        firstPaymentDate: resolvedFirstPaymentDate,
      },
    });
    const allowed =
      Boolean(createPlan) &&
      renderFlags.allowCheckoutCreate &&
      (isPayInFull
      ? shouldCreatePayInFullCheckout({
          eligible: payInFullEligible,
          studentValid: Object.keys(nextErrors).length === 0,
          alreadyCreated,
          userClickedContinue: true,
          busy,
        })
      : shouldCreateCheckout({
          studentValid: Object.keys(nextErrors).length === 0,
          alreadyCreated,
          userClickedDirectDebit: true,
          busy,
        }));
    if (!allowed) {
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        setSectionErrors((current) => ({
          ...current,
          student: isPayInFull
            ? "Complete your details before paying in full."
            : "Complete your details before setting up Direct Debit.",
        }));
        studentSectionRef.current?.focus();
        studentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => firstErrorRef.current?.focus(), 50);
      }
      return null;
    }

    creatingRef.current = true;
    setBusy(true);
    setError("");
    setSectionErrors((current) => ({ ...current, student: undefined, dda: undefined }));
    persistDraft();
    if (!createPlan) {
      creatingRef.current = false;
      setBusy(false);
      return null;
    }
    try {
      const response = await fetch("/api/enrolment-checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerSlug: tenant.slug,
          courseSlug: course.slug,
          student: resolvedStudent,
          plan: createPlan,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as StatusPayload & {
        success?: boolean;
        payment_option?: string;
        direct_debit?: { setup_url?: string; setup_complete?: boolean };
      };
      if (!response.ok || json.success === false) {
        setFieldErrors(json.error?.invalid_fields || {});
        throw new Error(json.error?.message || "Unable to create this enrolment.");
      }
      applyStatus(json);
      if (!isPayInFull) {
        const nextSetupUrl = json.direct_debit?.setup_url || "";
        setSetupUrl(nextSetupUrl);
        setSetupComplete(Boolean(json.direct_debit?.setup_complete));
        ddaSectionRef.current?.focus();
        ddaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return nextSetupUrl;
      }
      cardSectionRef.current?.focus();
      cardSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return null;
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to create this enrolment.";
      setError(message);
      setSectionErrors((current) => ({
        ...current,
        dda: message,
      }));
      (isPayInFull ? cardSectionRef : ddaSectionRef).current?.focus();
      return null;
    } finally {
      creatingRef.current = false;
      setBusy(false);
    }
  }

  async function startDirectDebitSetup() {
    if (isPayInFull || setupComplete) {
      return;
    }
    if (ddaOpeningRef.current || busy) {
      ddaPopupRef.current?.focus();
      return;
    }
    if (ddaPopupOpen) {
      ddaPopupRef.current?.focus();
      return;
    }

    const nextErrors = validateStudentDetails(resolvedStudent);
    if (Object.keys(nextErrors).length > 0 && !alreadyCreated) {
      await createCheckout();
      return;
    }

    ddaOpeningRef.current = true;
    let sameTabUrl: string | null = null;
    try {
      const result = await runDdaSetupClick({
        popupOpen: false,
        alreadyCreated,
        setupUrl,
        setupComplete,
        canCreate: canCreate || Boolean(alreadyCreated && setupUrl),
        preferDesktopPopup: shouldUseDesktopDdaPopup({
          innerWidth: window.innerWidth,
          userAgent: window.navigator.userAgent,
        }),
        screen: window,
        openWindow(url, name, features) {
          const popup = window.open(url, name, features);
          if (!popup) {
            return null;
          }
          try {
            popup.document.write(ddaPopupPreparingHtml());
            popup.document.close();
          } catch {
            // Some browsers block writing into the blank popup; navigation still works.
          }
          ddaPopupRef.current = popup;
          setDdaPopupOpen(true);
          return {
            get closed() {
              return popup.closed;
            },
            focus: () => {
              popup.focus();
            },
            close: () => {
              popup.close();
            },
            assign: (nextUrl: string) => {
              popup.location.replace(nextUrl);
            },
          };
        },
        async createOrLoad() {
          const url = alreadyCreated ? setupUrl : await createCheckout();
          if (!url) {
            throw new Error("Unable to start Direct Debit setup.");
          }
          return { setupUrl: url };
        },
      });
      if (result.closedPopupOnError) {
        ddaPopupRef.current = null;
        setDdaPopupOpen(false);
      }
      if (result.usedSameTabFallback && result.navigatedPopupTo) {
        sameTabUrl = result.navigatedPopupTo;
      }
    } finally {
      ddaOpeningRef.current = false;
    }
    if (sameTabUrl) {
      window.location.assign(sameTabUrl);
    }
  }

  async function confirmPayInFullFromServer() {
    const confirmDeclarations = hostedCheckoutConfirmDeclarations({
      selectedOption: resolvedPaymentOption,
      declarations,
      providerStudentAgreement: providerAgreement,
    });
    if (!confirmDeclarations) {
      return;
    }
    const response = await fetch("/api/enrolment-checkout/confirm", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        declarations: confirmDeclarations,
      }),
    });
    const json = (await response.json().catch(() => ({}))) as StatusPayload & {
      success?: boolean;
      already_confirmed?: boolean;
      error?: { code?: string; message?: string };
    };
    if (json.already_confirmed || isConfirmedCheckoutStatus(json.checkout?.status)) {
      setConfirmed(true);
      setCheckoutStatus(json.checkout?.status || "confirmed");
      clearStoredDraft(tenant.slug, course.slug);
      return json;
    }
    if (!response.ok || json.success === false) {
      const code = json.error?.code || "";
      setConfirmCode(code);
      if (code === "PAYMENT_PROCESSING") {
        return json;
      }
      throw new Error(json.error?.message || "Unable to confirm this enrolment.");
    }
    setCheckoutStatus(json.checkout?.status || "confirmed");
    setConfirmed(true);
    clearStoredDraft(tenant.slug, course.slug);
    return json;
  }

  async function payInFullNow() {
    if (payingRef.current || busy || alreadyConfirmed) {
      return;
    }
    if (!pifDeclarationsOk) {
      setSectionErrors((current) => ({
        ...current,
        review: "Accept the required declarations before paying.",
      }));
      reviewSectionRef.current?.focus();
      return;
    }
    const api = stripeApiRef.current;
    if (!api || !clientSecret) {
      setSectionErrors((current) => ({
        ...current,
        review: "Card payment is still loading. Please wait a moment.",
      }));
      return;
    }
    payingRef.current = true;
    setBusy(true);
    setError("");
    setConfirmCode(null);
    setSectionErrors((current) => ({ ...current, review: undefined }));
    let paymentReceived = stripeSucceeded;
    try {
      const result = await confirmPayInFullElementsPayment({
        stripe: api.stripe,
        elements: api.elements,
        clientSecret,
        returnUrl: window.location.href,
      });
      if (result.error) {
        setConfirmCode("PAYMENT_FAILED");
        throw new Error(result.error.message || "Payment not completed.");
      }
      const status = result.paymentIntent?.status;
      setStripeStatus(status || null);
      if (status === "processing" || status === "requires_action") {
        setConfirmCode("PAYMENT_PROCESSING");
        return;
      }
      if (status !== "succeeded") {
        setConfirmCode("PAYMENT_FAILED");
        throw new Error("Payment not completed.");
      }
      setStripeSucceeded(true);
      paymentReceived = true;
      let posted = ledgerPosted;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const statusResponse = await fetch("/api/enrolment-checkout/status", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const statusJson = (await statusResponse.json().catch(() => ({}))) as StatusPayload;
        if (statusResponse.ok) {
          applyStatus(statusJson);
          if (enrolmentCompleteFromBrowser({
            stripeSucceeded: true,
            checkoutStatus: statusJson.checkout?.status,
            ledgerPosted: Boolean(statusJson.card_payment?.ledger_posted),
          })) {
            return;
          }
          posted = Boolean(statusJson.card_payment?.ledger_posted);
          if (posted) {
            break;
          }
        }
        await new Promise((resolve) => window.setTimeout(resolve, POLL_MS));
      }
      try {
        await confirmPayInFullFromServer();
      } catch (confirmError) {
        setServerErrorAfterPayment(true);
        throw confirmError;
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Payment not completed.";
      if (paymentReceived) {
        setServerErrorAfterPayment(true);
        setError("");
        setSectionErrors((current) => ({
          ...current,
          review: payInFullReviewErrorAfterPayment(message),
        }));
      } else {
        setError(message);
        setSectionErrors((current) => ({ ...current, review: message }));
      }
      reviewSectionRef.current?.focus();
    } finally {
      payingRef.current = false;
      setBusy(false);
    }
  }

  async function confirmCheckout() {
    if (
      !shouldConfirmCheckout({
        studentValid,
        setupComplete,
        declarationsAccepted: accepted,
        userClickedConfirm: true,
        busy,
        alreadyConfirmed,
      })
    ) {
      setSectionErrors((current) => ({
        ...current,
        review: "Accept the required declarations after Direct Debit is authorised.",
      }));
      reviewSectionRef.current?.focus();
      return;
    }

    setBusy(true);
    setError("");
    setSectionErrors((current) => ({ ...current, review: undefined }));
    try {
      const confirmDeclarations = hostedCheckoutConfirmDeclarations({
        selectedOption: resolvedPaymentOption,
        declarations,
        providerStudentAgreement: providerAgreement,
      });
      if (!confirmDeclarations) {
        return;
      }
      const response = await fetch("/api/enrolment-checkout/confirm", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declarations: confirmDeclarations }),
      });
      const json = (await response.json().catch(() => ({}))) as StatusPayload & {
        success?: boolean;
        already_confirmed?: boolean;
      };
      if (!response.ok || json.success === false) {
        throw new Error(json.error?.message || "Unable to confirm this enrolment.");
      }
      setAgreementNumber(json.agreement?.number || null);
      setCheckoutStatus(json.checkout?.status || "confirmed");
      setConfirmed(true);
      clearStoredDraft(tenant.slug, course.slug);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to confirm this enrolment.";
      setError(message);
      setSectionErrors((current) => ({ ...current, review: message }));
      reviewSectionRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  if (paymentMode === "neither" && !alreadyConfirmed) {
    return (
      <div
        className={styles.page}
        data-testid="nz-enrolment-unavailable"
        style={tenantCssVars(tenant) as CSSProperties}
      >
        <div className={styles.shell}>
          <section className={styles.form} aria-labelledby="nz-enrolment-unavailable-heading">
            <div className={styles.section}>
              <h1 id="nz-enrolment-unavailable-heading">Enrolment unavailable</h1>
              <p className={styles.lead}>
                This course has no eligible payment option on this checkout.
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  }


  function selectPaymentOption(next: NzPaymentOptionId) {
    if (paymentMethodSwitchLocked({ checkoutCreated: Boolean(setupUrl || checkoutId) })) {
      setError("This enrolment is already set up. Refresh to start a different payment method.");
      return;
    }
    const cleared = clearedStateForPaymentSwitch();
    setPaymentChoiceTouched(true);
    setPaymentOption(next);
    setSetupUrl(cleared.setupUrl);
    setSetupComplete(cleared.setupComplete);
    setClientSecret(cleared.clientSecret);
    setPublishableKey(cleared.publishableKey);
    setLedgerPosted(cleared.ledgerPosted);
    setStripeSucceeded(cleared.stripeSucceeded);
    setStripeStatus(cleared.stripeStatus);
    setServerErrorAfterPayment(cleared.serverErrorAfterPayment);
    setConfirmCode(cleared.confirmCode);
    setDeclarations(cleared.declarations);
    stripeApiRef.current = null;
    setSectionErrors({});
    setError("");
  }

  if (configurationUnavailable) {
    return <NzCourseConfigurationUnavailable tenant={tenant} />;
  }

  if (alreadyConfirmed) {
    const pifSuccess = isPayInFull
      ? payInFullSuccessCopy({
          courseName: course.name,
          providerName: tenant.displayName,
          amountLabel: formatNzdFromCents(displayedCoursePriceCents),
          checkoutId,
        })
      : null;
    return (
      <>
      <ProviderNativeHeader tenant={tenant} course={course} />
      <div
        className={styles.page}
        data-testid="nz-enrolment-confirmed"
        data-payment-option={isPayInFull ? "pay_in_full" : "payment_plan"}
        style={tenantCssVars(tenant) as CSSProperties}
      >
        <div className={styles.shell}>
          <section className={styles.form} aria-labelledby="nz-enrolment-confirmed-heading">
            <div className={styles.section}>
              <p className={styles.kicker}>{tenant.displayName}</p>
              <h1 id="nz-enrolment-confirmed-heading">
                {pifSuccess?.heading || NZ_CONFIRMATION_COPY.heading}
              </h1>
              <p className={styles.lead}>
                {pifSuccess
                  ? pifSuccess.lead
                  : `Your ${tenant.displayName} enrolment and StudentPay payment plan are now active.`}
              </p>
              <ConfirmationSummary
                rows={
                  pifSuccess
                    ? decorateConfirmationRows(pifSuccess.rows)
                    : paymentPlanConfirmationRows({
                        courseName: course.name,
                        courseFeeLabel: formatNzdFromCents(course.paymentPlanCourseFeeCents),
                        paymentPlanLabel: display
                          ? `${display.regularLabel}${
                              display.finalPaymentLabel ? ` · ${display.finalPaymentLabel}` : ""
                            }`
                          : null,
                        firstPaymentDate: preview?.firstPaymentDate,
                        agreementNumber,
                        checkoutId,
                      })
                }
              />
              <p className={styles.lead}>
                {pifSuccess
                  ? `${tenant.displayName} will confirm your course access separately.`
                  : `Keep an eye on ${resolvedStudent.email || "your email"} for your payment plan agreement. ${tenant.displayName} will confirm your course access separately.`}
              </p>
              {returnToProviderUrl ? (
                <div className={styles.actions}>
                  <a className={`${styles.btn} ${styles.btnPrimary}`} href={returnToProviderUrl}>
                    {tenant.presentation.returnToProviderLabel ||
                      `Return to ${tenant.displayName}`}
                  </a>
                </div>
              ) : null}
              <StudentPayAttribution />
            </div>
          </section>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    <ProviderNativeHeader tenant={tenant} course={course} />
    <div
      className={styles.page}
      data-testid="nz-enrolment-single-page"
      data-payment-mode={paymentMode}
      data-selected-option={resolvedPaymentOption}
      style={tenantCssVars(tenant) as CSSProperties}
    >
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>{tenant.legalName}</p>
            {course.category ? <p className={styles.category}>{course.category}</p> : null}
            <h1>{course.name}</h1>
            <p className={styles.lead}>
              {isPayInFull
                ? "Complete your enrolment and pay your course fee below."
                : "Complete your enrolment and set up your StudentPay payment plan below."}
            </p>
            {courseWebsiteUrl ? (
              <p className={styles.courseLink}>
                <a href={courseWebsiteUrl}>
                  View this course on the {tenant.displayName} website
                </a>
              </p>
            ) : null}
          </div>
          <aside className={styles.heroCard} aria-label="Course fee">
            <p className={styles.fee}>
              {formatNzdFromCents(
                isPayInFull ? displayedCoursePriceCents : course.paymentPlanCourseFeeCents,
              )}
            </p>
            <p className={styles.feeLabel}>Course fee</p>
            <p className={styles.planAmount}>
              {isPayInFull
                ? "Pay now"
                : display?.regularLabel || "Weekly payment plan"}
            </p>
            <p className={styles.feeHint}>
              {isPayInFull ? "Pay in full today" : "StudentPay payment plan"}
            </p>
          </aside>
        </header>

        {error && !sectionErrors.dda && !sectionErrors.review && !sectionErrors.student ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.form}>
          <CheckoutSection
            number={1}
            title={copy.paymentSectionTitle}
            status={planStatus}
            testId="nz-section-plan"
          >
            <p className={styles.lead}>
              {renderFlags.showPaymentMethodRadios
                ? NZ_PAYMENT_CHOICE_LEAD
                : copy.paymentSectionLead}
            </p>
            {renderFlags.showPaymentMethodRadios ? null : (
            <dl className={styles.review}>
              <dt>Course</dt>
              <dd>{course.name}</dd>
              <dt>{isPayInFull ? "Course price" : "Course fee"}</dt>
              <dd data-testid="nz-authoritative-price">
                {formatNzdFromCents(
                  isPayInFull ? displayedCoursePriceCents : course.paymentPlanCourseFeeCents,
                )}
              </dd>
              {renderFlags.showPayInFullSummary ? (
                <>
                  <dt>Pay now</dt>
                  <dd data-testid="nz-pay-in-full-today">
                    {formatNzdFromCents(displayedCoursePriceCents)} today
                  </dd>
                </>
              ) : renderFlags.showPlanSchedule ? (
                <>
                  <dt>Payment plan</dt>
                  <dd>
                    {display?.regularLabel || "Weekly payment plan"}
                    {display?.upfrontLabel ? (
                      <>
                        <br />
                        <span data-testid="nz-plan-upfront">{display.upfrontLabel}</span>
                      </>
                    ) : null}
                  </dd>
                  <dt>Schedule</dt>
                  <dd>
                    {display?.regularCountLabel}
                    {display?.finalPaymentLabel ? (
                      <>
                        <br />
                        {display.finalPaymentLabel}
                      </>
                    ) : null}
                  </dd>
                  <dt>Total</dt>
                  <dd>{display?.totalLabel}</dd>
                </>
              ) : null}
            </dl>
            )}

            {derivedPlan || !renderFlags.showPlanSchedule || renderFlags.showPaymentMethodRadios ? null : (
              <div className={styles.grid}>
                <TextField
                  label="Payment-plan deposit (NZD)"
                  name="upfront"
                  type="number"
                  value={String(resolvedUpfront / 100)}
                  disabled={planLocked}
                  onChange={(value) =>
                    setUpfrontAmountCents(Math.round(Number(value || 0) * 100))
                  }
                />
                <label className={styles.field}>
                  <span>Frequency</span>
                  <select
                    value={resolvedFrequency}
                    disabled={planLocked}
                    onChange={(event) =>
                      setFrequency(event.target.value as typeof frequency)
                    }
                  >
                    {tenant.checkout.availableFrequencies.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <TextField
                  label="Number of instalments"
                  name="instalments"
                  type="number"
                  value={String(resolvedInstalments)}
                  disabled={planLocked}
                  onChange={(value) => setNumberOfInstalments(Number(value || 0))}
                />
              </div>
            )}

            {renderFlags.showPaymentMethodRadios ? (
              <fieldset className={styles.choiceGrid} data-testid="nz-pay-in-full-secondary">
                <legend className={styles.choiceLegend}>Choose how to pay</legend>
                {renderFlags.showPayInFullChoice ? (
                <label
                  className={styles.choiceCard}
                  data-selected={isPayInFull ? "true" : undefined}
                  data-testid="nz-pay-in-full-choice"
                >
                  <input
                    type="radio"
                    name="how-to-pay"
                    checked={isPayInFull}
                    disabled={planLocked}
                    onChange={() => selectPaymentOption("pay_in_full")}
                  />
                  <span>
                    <strong>{NZ_PAY_IN_FULL_COPY.choiceTitle}</strong>
                    <em data-testid="nz-pay-now-amount">
                      <span data-testid="nz-authoritative-price">
                        {formatNzdFromCents(course.paymentInFullCourseFeeCents)}
                      </span>
                    </em>
                    <span className={styles.choiceCardBody} data-testid="nz-pay-now-body">
                      {payNowBody}
                    </span>
                    {isPayInFull ? (
                      <span className={styles.srOnly} data-testid="nz-pay-in-full-today">
                        {formatNzdFromCents(displayedCoursePriceCents)} today
                      </span>
                    ) : null}
                  </span>
                </label>
                ) : null}
                {renderFlags.showPaymentPlanChoice ? (
                <label
                  className={styles.choiceCard}
                  data-selected={!isPayInFull ? "true" : undefined}
                  data-testid="nz-payment-plan-choice"
                >
                  <input
                    type="radio"
                    name="how-to-pay"
                    checked={!isPayInFull}
                    disabled={planLocked}
                    onChange={() => selectPaymentOption("interest_free_payment_plan")}
                  />
                  <span>
                    <strong>{NZ_PAYMENT_PLAN_CHOICE_COPY.title}</strong>
                    <em data-testid="nz-payment-plan-amount">
                      {planChoice?.weeklyAmountLabel ||
                        display?.regularLabel ||
                        formatNzdFromCents(course.paymentPlanCourseFeeCents)}
                      {planChoice ? (
                        <span className={styles.choiceCardPeriod}> {planChoice.periodSuffix}</span>
                      ) : null}
                    </em>
                    <span className={styles.choiceCardBody} data-testid="nz-payment-plan-body">
                      {planChoice?.body || NZ_PAYMENT_PLAN_CHOICE_COPY.lead}
                    </span>
                    {planChoice ? (
                      <small data-testid="nz-payment-plan-total">{planChoice.totalLine}</small>
                    ) : null}
                  </span>
                </label>
                ) : null}
              </fieldset>
            ) : null}
            {!preview && renderFlags.allowPlanPreview ? (
              <p className={styles.error} role="alert">
                This plan cannot be reconciled in integer cents.
              </p>
            ) : null}
          </CheckoutSection>

          <CheckoutSection
            number={2}
            title={NZ_STUDENT_DETAILS_COPY.heading}
            status={studentStatus}
            testId="nz-section-student"
            sectionRef={studentSectionRef}
          >
            <p className={styles.lead}>
              {copy.studentLead}
            </p>
            {sectionErrors.student ? (
              <p className={styles.error} role="alert">
                {sectionErrors.student}
              </p>
            ) : null}
            <div className={styles.grid}>
              <TextField
                label="First name"
                name="given-name"
                autoComplete="given-name"
                value={resolvedStudent.firstName}
                error={fieldErrors.firstName}
                errorRef={fieldErrors.firstName ? firstErrorRef : undefined}
                onChange={(value) => updateStudent("firstName", value)}
              />
              <TextField
                label="Last name"
                name="family-name"
                autoComplete="family-name"
                value={resolvedStudent.lastName}
                error={fieldErrors.lastName}
                onChange={(value) => updateStudent("lastName", value)}
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                value={resolvedStudent.email}
                error={fieldErrors.email}
                onChange={(value) => updateStudent("email", value)}
              />
              <TextField
                label="Mobile"
                name="tel"
                type="tel"
                autoComplete="tel"
                value={resolvedStudent.mobile}
                error={fieldErrors.mobile}
                onChange={(value) => updateStudent("mobile", value)}
              />
              <TextField
                label="Date of birth"
                name="bday"
                type="date"
                autoComplete="bday"
                value={resolvedStudent.dateOfBirth}
                error={fieldErrors.dateOfBirth}
                onChange={(value) => updateStudent("dateOfBirth", value)}
              />
              <TextField
                label="Country"
                name="country-name"
                autoComplete="country-name"
                value={resolvedStudent.country}
                error={fieldErrors.country}
                onChange={(value) => updateStudent("country", value)}
              />
              <TextField
                label="Street address"
                name="address-line1"
                autoComplete="address-line1"
                value={resolvedStudent.streetAddress}
                error={fieldErrors.streetAddress}
                span
                onChange={(value) => updateStudent("streetAddress", value)}
              />
              <TextField
                label="Suburb"
                name="address-level3"
                autoComplete="address-line2"
                value={resolvedStudent.suburb}
                error={fieldErrors.suburb}
                onChange={(value) => updateStudent("suburb", value)}
              />
              <TextField
                label="City / region"
                name="address-level1"
                autoComplete="address-level1"
                value={resolvedStudent.region}
                error={fieldErrors.region}
                onChange={(value) => {
                  setStudent((current) => {
                    const base = studentDetailsStarted(current)
                      ? current
                      : (storedDraft?.student ?? current);
                    return { ...base, region: value, city: value };
                  });
                }}
              />
              <TextField
                label="Postcode"
                name="postal-code"
                autoComplete="postal-code"
                value={resolvedStudent.postcode}
                error={fieldErrors.postcode}
                onChange={(value) => updateStudent("postcode", value)}
              />
            </div>
          </CheckoutSection>

          {renderFlags.showPayInFullSummary ? (
            <CheckoutSection
              number={3}
              title={NZ_PAY_IN_FULL_COPY.cardHeading}
              status={
                ledgerPosted || stripeSucceeded
                  ? "complete"
                  : clientSecret
                    ? "ready"
                    : studentValid
                      ? "ready"
                      : "not_started"
              }
              testId="nz-section-card"
              sectionRef={cardSectionRef}
            >
              <p className={styles.lead}>
                Pay {formatNzdFromCents(displayedCoursePriceCents)} securely by card. The amount
                cannot be changed.
              </p>
              {!alreadyCreated ? (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}
                    disabled={!canCreate || busy}
                    onClick={() => void createCheckout()}
                  >
                    {busy ? "Preparing card payment…" : copy.continueCta}
                  </button>
                </div>
              ) : null}
              {clientSecret && publishableKey ? (
                <PayInFullCardForm
                  clientSecret={clientSecret}
                  publishableKey={publishableKey}
                  disabled={busy || alreadyConfirmed || pifPhase === "processing"}
                  onReady={(api) => {
                    stripeApiRef.current = api;
                  }}
                  onError={(message) => {
                    setSectionErrors((current) => ({ ...current, review: message }));
                  }}
                />
              ) : alreadyCreated ? (
                <p className={styles.note} role="status">
                  Loading secure card payment…
                </p>
              ) : null}
              {pifFailure.title ? (
                <div className={styles.completePanel} role="status" data-testid="nz-pay-in-full-status">
                  <h3>{pifFailure.title}</h3>
                  <p>{pifFailure.body}</p>
                </div>
              ) : null}
              {sectionErrors.dda ? (
                <p className={styles.error} role="alert">
                  {sectionErrors.dda}
                </p>
              ) : null}
            </CheckoutSection>
          ) : renderFlags.showDdaSection ? (
          <CheckoutSection
            number={3}
            title={NZ_DIRECT_DEBIT_COPY.heading}
            status={ddaStatus}
            testId="nz-section-dda"
            sectionRef={ddaSectionRef}
          >
            <p className={styles.lead}>
              {tenant.checkout.wording?.ddaLead ||
                "You are setting up a Direct Debit authority with StudentPay NZ. This is not a card payment."}
            </p>
            <div className={styles.ddaLayout}>
              {renderFlags.showFirstPaymentDate ? (
                <div className={styles.ddaDateCol}>
                  <TextField
                    label="First payment date"
                    name="first-payment-date"
                    type="date"
                    value={resolvedFirstPaymentDate}
                    disabled={planLocked}
                    onChange={setFirstPaymentDate}
                  />
                  <p className={styles.ddaDateHint}>
                    Scheduled payments start on{" "}
                    {formatEnrolmentDisplayDate(resolvedFirstPaymentDate)}.
                  </p>
                </div>
              ) : null}
              <div className={styles.ddaActionCol}>
                {setupComplete ? (
                  <div
                    className={styles.ddaStatusPanel}
                    data-state="complete"
                    data-testid="nz-dda-complete"
                    role="status"
                  >
                    <h3>{NZ_DIRECT_DEBIT_COPY.authorisedTitle}</h3>
                    <p>{NZ_DIRECT_DEBIT_COPY.authorisedBody}</p>
                  </div>
                ) : (
                  <div
                    className={styles.ddaStatusPanel}
                    data-state={ddaPopupOpen ? "waiting" : studentValid ? "ready" : "blocked"}
                  >
                    {ddaPopupOpen ? (
                      <div data-testid="nz-dda-waiting" role="status">
                        <h3>{NZ_DIRECT_DEBIT_COPY.waitingTitle}</h3>
                        <p id={ddaHelpId}>{NZ_DIRECT_DEBIT_COPY.waitingBody}</p>
                      </div>
                    ) : (
                      <p id={ddaHelpId}>
                        {studentValid
                          ? alreadyCreated
                            ? "Continue Direct Debit setup in the secure StudentPay window. This page stays open."
                            : "Your details are ready. Set up Direct Debit when you are ready to continue."
                          : "Complete your details above before setting up Direct Debit."}
                      </p>
                    )}
                    <div className={styles.ddaStatusActions}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}
                        disabled={(!canCreate && !alreadyCreated) || busy || ddaPopupOpen}
                        aria-describedby={ddaHelpId}
                        onClick={() => void startDirectDebitSetup()}
                      >
                        {ddaPopupOpen
                          ? NZ_DIRECT_DEBIT_COPY.waitingTitle
                          : busy
                            ? "Creating enrolment…"
                            : alreadyCreated
                              ? "Continue Direct Debit setup"
                              : NZ_DIRECT_DEBIT_CTA}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {ddaError ? (
              <p className={styles.error} role="alert">
                {ddaError}
              </p>
            ) : null}
          </CheckoutSection>
          ) : null}

          <CheckoutSection
            number={4}
            title={renderFlags.showPayInFullSummary ? NZ_REVIEW_COPY.payHeading : NZ_REVIEW_COPY.heading}
            status={reviewStatus}
            testId="nz-section-review"
            sectionRef={reviewSectionRef}
          >
            <div className={styles.reviewSplit}>
            <aside
              className={styles.summaryCard}
              aria-label="Enrolment summary"
              data-testid="nz-enrolment-summary"
            >
              <h3>Your enrolment</h3>
            <dl className={styles.review}>
              <dt>Course</dt>
              <dd>{course.name}</dd>
              {renderFlags.showPayInFullSummary ? (
                <>
                  <dt>Pay now</dt>
                  <dd>{formatNzdFromCents(displayedCoursePriceCents)}</dd>
                  <dt>Payment today</dt>
                  <dd>{formatNzdFromCents(displayedCoursePriceCents)}</dd>
                </>
              ) : (
                <>
                  <dt>Course fee</dt>
                  <dd>{formatNzdFromCents(course.paymentPlanCourseFeeCents)}</dd>
                </>
              )}
              {renderFlags.showPayInFullSummary ? null : renderFlags.showPlanSchedule ? (
                <>
                  <dt>Payment plan</dt>
                  <dd>
                    {display?.regularLabel}
                    {display?.finalPaymentLabel ? ` · ${display.finalPaymentLabel}` : ""}
                  </dd>
                  <dt>Regular instalment</dt>
                  <dd>
                    {preview
                      ? formatNzdFromCents(preview.regularInstalmentAmountCents)
                      : "—"}
                  </dd>
                  {preview?.hasResidualFinal && preview.finalInstalmentAmountCents != null ? (
                    <>
                      <dt>Final residual</dt>
                      <dd>{formatNzdFromCents(preview.finalInstalmentAmountCents)}</dd>
                    </>
                  ) : null}
                  {renderFlags.showFirstPaymentDate ? (
                    <>
                      <dt>First payment date</dt>
                      <dd>{resolvedFirstPaymentDate}</dd>
                    </>
                  ) : null}
                </>
              ) : null}
              <dt>Student</dt>
              <dd>
                {resolvedStudent.firstName} {resolvedStudent.lastName}
                {resolvedStudent.email ? ` · ${resolvedStudent.email}` : ""}
              </dd>
            </dl>
            </aside>
            <div className={styles.reviewConfirm}>
            <fieldset className={styles.checks}>
              <legend>Agreements</legend>
              {providerAgreement ? (
                <>
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={declarations.provider_student_agreement_accepted}
                      onChange={(event) =>
                        setDeclarations((current) => ({
                          ...current,
                          provider_student_agreement_accepted: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      I have read and agree to the {providerAgreement.title}
                      {providerAgreement.version
                        ? ` (version ${providerAgreement.version})`
                        : ""}
                      . This is separate from the StudentPay Payment Plan Agreement.
                    </span>
                  </label>
                  <details className={styles.agreementPanel}>
                    <summary>
                      Read {providerAgreement.title} version {providerAgreement.version}
                    </summary>
                    <div
                      className={styles.agreementHtml}
                      dangerouslySetInnerHTML={{ __html: providerAgreement.html }}
                    />
                  </details>
                </>
              ) : null}
              {renderFlags.showPayInFullSummary ? null : renderFlags.showPaymentPlanAccepted ? (
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={declarations.payment_plan_accepted}
                    onChange={(event) =>
                      setDeclarations((current) => ({
                        ...current,
                        payment_plan_accepted: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    {providerAgreement ? (
                      <>I have read and agree to the </>
                    ) : (
                      <>
                        I have read and agree to the{" "}
                        <a href={tenant.termsUrl} target="_blank" rel="noreferrer">
                          {tenant.displayName} terms
                        </a>
                        {renderFlags.showPpaLink || renderFlags.showDdsaLink ? ", " : "."}
                      </>
                    )}
                    {renderFlags.showPpaLink ? (
                      <>
                        {providerAgreement ? "" : null}
                        <LegalAgreementLink kind="payment-plan">
                          StudentPay Payment Plan Agreement
                        </LegalAgreementLink>
                      </>
                    ) : null}
                    {renderFlags.showDdsaLink ? (
                      <>
                        {renderFlags.showPpaLink ? " and the " : ""}
                        <LegalAgreementLink kind="direct-debit">
                          Direct Debit Service Agreement
                        </LegalAgreementLink>
                      </>
                    ) : null}
                    {providerAgreement || renderFlags.showPpaLink || renderFlags.showDdsaLink
                      ? "."
                      : null}
                  </span>
                </label>
              ) : null}
              <label className={styles.check} data-testid="nz-combined-details-privacy">
                <input
                  type="checkbox"
                  checked={combinedDetailsPrivacyAccepted(declarations)}
                  onChange={(event) =>
                    setDeclarations((current) => ({
                      ...current,
                      ...setCombinedDetailsPrivacyDeclaration(event.target.checked),
                    }))
                  }
                />
                <span>
                  I confirm my details are true and complete, have read the{" "}
                  <a href={tenant.privacyUrl} target="_blank" rel="noreferrer">
                    privacy information
                  </a>
                  , and consent to {tenant.legalName} and StudentPay NZ using my details to
                  process this enrolment.
                </span>
              </label>
            </fieldset>
            <p id={confirmHelpId} className={styles.lead}>
              {renderFlags.showPayInFullSummary
                ? !studentValid
                  ? "Complete your details before paying."
                  : !clientSecret
                    ? "Continue to card payment before confirming."
                    : !pifDeclarationsOk
                      ? "Accept the required declarations before paying."
                      : pifPhase === "processing"
                        ? "Payment is being processed. Do not pay again."
                        : pifPhase === "confirming_enrolment" ||
                            pifPhase === "server_error_after_payment"
                          ? "Payment received. We are confirming your enrolment."
                          : "Ready to pay in full by card."
                : !studentValid
                  ? "Complete your details before confirming."
                  : !setupComplete
                    ? "Authorise Direct Debit before confirming enrolment."
                    : !canConfirm
                      ? "Accept every declaration to confirm enrolment."
                      : "Ready to confirm enrolment and activate the payment plan."}
            </p>
            {sectionErrors.review ? (
              <p className={styles.error} role="alert">
                {sectionErrors.review}
              </p>
            ) : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}
                disabled={
                  renderFlags.showPayInFullSummary
                    ? busy ||
                      alreadyConfirmed ||
                      !clientSecret ||
                      !pifDeclarationsOk ||
                      pifPhase === "processing" ||
                      pifPhase === "confirming_enrolment" ||
                      pifPhase === "server_error_after_payment"
                    : !canConfirm || busy
                }
                aria-describedby={confirmHelpId}
                onClick={() =>
                  void (renderFlags.showPayInFullSummary ? payInFullNow() : confirmCheckout())
                }
              >
                {renderFlags.showPayInFullSummary
                  ? busy
                    ? stripeSucceeded
                      ? "Confirming enrolment…"
                      : "Processing payment…"
                    : copy.confirmCta
                  : busy
                    ? "Confirming…"
                    : NZ_CONFIRM_CTA}
              </button>
            </div>
            </div>
            </div>
          </CheckoutSection>
        </div>
        <StudentPayAttribution />
      </div>
    </div>
    </>
  );
}

function ConfirmationSummary({ rows }: { rows: ConfirmationSummaryRow[] }) {
  const visibleGroups = CONFIRMATION_SUMMARY_GROUPS.filter((group) =>
    rows.some((row) => row.group === group),
  );
  const showGroupLabels = visibleGroups.length > 1;

  return (
    <div className={styles.confirmationCard} data-testid="nz-enrolment-confirmed-summary">
      {visibleGroups.map((group) => {
        const items = rows.filter((row) => row.group === group);
        return (
          <div key={group} className={styles.confirmationGroup} data-group={group}>
            {showGroupLabels &&
            !(items.length === 1 && items[0].label === CONFIRMATION_GROUP_LABELS[group]) ? (
              <p className={styles.confirmationGroupLabel}>{CONFIRMATION_GROUP_LABELS[group]}</p>
            ) : null}
            <dl className={styles.confirmationTable}>
              {items.map((row) => (
                <div
                  key={row.label}
                  className={styles.confirmationRow}
                  data-tone={row.tone || "default"}
                >
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

function CheckoutSection({
  number,
  title,
  status,
  testId,
  children,
  sectionRef,
}: {
  number: number;
  title: string;
  status: ReturnType<typeof sectionStatus>;
  testId: string;
  children: ReactNode;
  sectionRef?: RefObject<HTMLElement | null>;
}) {
  const headingId = `nz-section-heading-${number}`;
  return (
    <section
      className={styles.section}
      data-testid={testId}
      data-status={status}
      aria-labelledby={headingId}
      tabIndex={-1}
      ref={sectionRef}
    >
      <div className={styles.sectionHeading}>
        <p className={styles.kicker}>
          <span className={styles.sectionIndex}>{number}</span>
          <span className={styles.statusBadge} data-status={status}>
            {sectionStatusLabel(status)}
          </span>
        </p>
        <h2 id={headingId}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
  span,
  disabled,
  errorRef,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  error?: string;
  span?: boolean;
  disabled?: boolean;
  errorRef?: RefObject<HTMLSpanElement | null>;
}) {
  const id = `nz-enrol-${name}`;
  const errorId = `${id}-error`;
  return (
    <label className={styles.field} data-span={span ? "2" : undefined} data-invalid={Boolean(error)}>
      <span>{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        inputMode={type === "number" ? "decimal" : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <span id={errorId} className={styles.error} role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

function LegalAgreementLink({
  kind,
  children,
}: {
  kind: HostedLegalKind;
  children: ReactNode;
}) {
  const href = hostedLegalDocumentHref(kind);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      data-testid={kind === "payment-plan" ? "nz-legal-ppa-link" : "nz-legal-ddsa-link"}
      onClick={(event) => {
        openLegalAgreementDocument({
          href,
          preferDesktopPopup: shouldUseDesktopLegalPopup({
            innerWidth: window.innerWidth,
            userAgent: navigator.userAgent,
            maxTouchPoints: navigator.maxTouchPoints,
          }),
          screen: {
            screenX: window.screenX,
            screenY: window.screenY,
            outerWidth: window.outerWidth,
            outerHeight: window.outerHeight,
          },
          openWindow: (url, name, features) => window.open(url, name, features),
          event,
        });
      }}
    >
      {children}
    </a>
  );
}
