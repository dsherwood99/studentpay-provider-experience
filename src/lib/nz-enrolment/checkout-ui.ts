export const NZ_ENROLMENT_STEPS = [
  { id: "student", label: "Your details" },
  { id: "payment", label: "Payment option" },
  { id: "plan", label: "Your plan" },
  { id: "review", label: "Review" },
  { id: "dda", label: "Direct debit" },
  { id: "agreement", label: "Agreement" },
  { id: "success", label: "Complete" },
] as const;

export type NzEnrolmentStep = (typeof NZ_ENROLMENT_STEPS)[number]["id"];

export const NZ_STUDENT_DETAILS_COPY = {
  heading: "Student details",
  lead: "Tell us about yourself. We'll use these details to set up your enrolment and StudentPay payment plan.",
} as const;

export const NZ_DEFAULT_ATTRIBUTION = "Payment plan powered by StudentPay NZ";
