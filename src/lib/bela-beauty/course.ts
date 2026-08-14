/** Matches Salesforce Provider Integration Config PIC-00002 (sandbox). */

export type BelaPaymentChoice = "pay_in_full" | "weekly_plan";

export type BelaWeeklyPlan = {
  course_price: number;
  upfront_payment: number;
  amount_to_finance: number;
  instalment_amount: number;
  number_of_instalments: number;
  payment_frequency: string;
};

export type BelaBrand = {
  background_colour: string;
  primary_colour: string;
  accent_colour: string;
  card_colour: string;
  text_colour: string;
  font_family: string;
};

/**
 * Derive financed balance + instalment count so course − upfront = n × weekly.
 * Throws if the amounts do not reconcile to the cent.
 */
export function deriveBelaWeeklyPlan({
  coursePrice,
  upfrontPayment,
  instalmentAmount,
  paymentFrequency = "Weekly",
}: {
  coursePrice: number;
  upfrontPayment: number;
  instalmentAmount: number;
  paymentFrequency?: string;
}): BelaWeeklyPlan {
  const course = Number(coursePrice);
  const upfront = Number(upfrontPayment);
  const weekly = Number(instalmentAmount);

  if (![course, upfront, weekly].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error("BELA weekly plan amounts must be finite positive numbers.");
  }

  const financed = Number((course - upfront).toFixed(2));
  if (financed <= 0) {
    throw new Error("BELA weekly plan financed balance must be positive.");
  }

  const rawCount = financed / weekly;
  const numberOfInstalments = Math.round(rawCount);
  const reconstructed = Number((numberOfInstalments * weekly).toFixed(2));

  if (
    numberOfInstalments < 1 ||
    Math.abs(rawCount - numberOfInstalments) > 1e-9 ||
    reconstructed !== financed
  ) {
    throw new Error(
      `BELA weekly plan does not reconcile: ${course} − ${upfront} ≠ n × ${weekly}.`,
    );
  }

  if (Number((upfront + reconstructed).toFixed(2)) !== course) {
    throw new Error(
      `BELA weekly plan total must equal course price (${upfront} + ${reconstructed} ≠ ${course}).`,
    );
  }

  return Object.freeze({
    course_price: course,
    upfront_payment: upfront,
    amount_to_finance: financed,
    instalment_amount: weekly,
    number_of_instalments: numberOfInstalments,
    payment_frequency: paymentFrequency,
  });
}

export const BELA_COURSE = Object.freeze({
  course_name: "Lash Business Bundle",
  course_code: "BELA_LASH_BUSINESS_BUNDLE",
  provider_name: "Bela Beauty College",
  brand_name: "Bela Beauty College",
  provider_code: "BELA_NZ",
  environment: "Sandbox",
  currency: "NZD",
  product_url:
    "https://belabeautycollege.com/products/the-ultimate-lash-business-bundle",
  brand: {
    background_colour: "#FAF7F4",
    primary_colour: "#5A332B",
    accent_colour: "#FBD2D3",
    card_colour: "#FFFFFF",
    text_colour: "#5A332B",
    font_family: "Arial, sans-serif",
  } satisfies BelaBrand,
  pay_in_full: {
    course_price: 2800,
    compare_at_price: 2800,
    savings: 0,
  },
  weekly_plan: deriveBelaWeeklyPlan({
    coursePrice: 2800,
    upfrontPayment: 10,
    instalmentAmount: 15,
    paymentFrequency: "Weekly",
  }),
});

export function isoDatePlusDays(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildOrderId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BELA-NZ-${stamp}-${rand}`;
}

type StudentInput = {
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile?: string;
  date_of_birth?: string;
  address?: {
    street_address?: string;
    suburb?: string;
    region?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

export function validateStudentInput(student: StudentInput = {}) {
  const missing: string[] = [];
  const required: Array<[string, unknown]> = [
    ["first_name", student.first_name],
    ["last_name", student.last_name],
    ["email", student.email],
    ["mobile", student.mobile],
    ["address.street_address", student.address?.street_address],
    ["address.suburb", student.address?.suburb],
    [
      "address.city",
      student.address?.city ||
        student.address?.region ||
        student.address?.state,
    ],
    ["address.postcode", student.address?.postcode],
  ];

  for (const [name, value] of required) {
    if (!value || !String(value).trim()) {
      missing.push(name);
    }
  }

  return {
    ok: missing.length === 0,
    missing,
  };
}

/**
 * Map landing-page form → Provider Checkout v1 create payload.
 */
export function buildCreateCheckoutPayload(input: {
  payment_choice?: string;
  student?: StudentInput;
  provider_order_id?: string;
  first_payment_date?: string;
  success_url?: string;
  cancel_url?: string;
} = {}) {
  const paymentChoice: BelaPaymentChoice =
    input.payment_choice === "pay_in_full" ? "pay_in_full" : "weekly_plan";

  const student = input.student || {};
  const address = student.address || {};
  const orderId = input.provider_order_id || buildOrderId();
  const firstPaymentDate = input.first_payment_date || isoDatePlusDays(7);

  const baseStudent = {
    first_name: String(student.first_name || "").trim(),
    last_name: String(student.last_name || "").trim(),
    email: String(student.email || "").trim(),
    mobile: String(student.mobile || "").trim() || undefined,
    date_of_birth: String(student.date_of_birth || "").trim() || undefined,
    address: {
      street_address: String(address.street_address || "").trim(),
      suburb: String(address.suburb || "").trim(),
      state: String(
        address.region || address.city || address.state || "",
      ).trim(),
      postcode: String(address.postcode || "").trim(),
      country: String(address.country || "New Zealand").trim(),
    },
  };

  if (paymentChoice === "pay_in_full") {
    const price = BELA_COURSE.pay_in_full.course_price;
    return {
      payment_choice: paymentChoice,
      payload: {
        provider: {
          provider_code: BELA_COURSE.provider_code,
          provider_order_id: orderId,
          provider_name: BELA_COURSE.provider_name,
          success_url: input.success_url || undefined,
          cancel_url: input.cancel_url || undefined,
        },
        student: baseStudent,
        course: {
          course_name: BELA_COURSE.course_name,
          course_code: BELA_COURSE.course_code,
          displayed_price: price,
        },
        pricing: {
          course_price: price,
          amount_to_finance: price,
          upfront_payment: price,
        },
        plan: {
          payment_type: "upfront_payment",
          payment_frequency: "Upfront",
          number_of_instalments: 1,
          instalment_amount: price,
          first_payment_date: firstPaymentDate,
        },
        metadata: {
          demo: "bela-beauty-nz",
          product_handle: "the-ultimate-lash-business-bundle",
          currency: BELA_COURSE.currency,
          hosted_on: "studentpay-provider-experience",
        },
      },
    };
  }

  const plan = BELA_COURSE.weekly_plan;
  return {
    payment_choice: paymentChoice,
    payload: {
      provider: {
        provider_code: BELA_COURSE.provider_code,
        provider_order_id: orderId,
        provider_name: BELA_COURSE.provider_name,
        success_url: input.success_url || undefined,
        cancel_url: input.cancel_url || undefined,
      },
      student: baseStudent,
      course: {
        course_name: BELA_COURSE.course_name,
        course_code: BELA_COURSE.course_code,
        displayed_price: plan.course_price,
      },
      pricing: {
        course_price: plan.course_price,
        amount_to_finance: plan.amount_to_finance,
        upfront_payment: plan.upfront_payment,
      },
      plan: {
        payment_type: "interest_free_payment_plan",
        payment_frequency: plan.payment_frequency,
        number_of_instalments: plan.number_of_instalments,
        instalment_amount: plan.instalment_amount,
        first_payment_date: firstPaymentDate,
      },
      metadata: {
        demo: "bela-beauty-nz",
        product_handle: "the-ultimate-lash-business-bundle",
        currency: BELA_COURSE.currency,
        hosted_on: "studentpay-provider-experience",
      },
    },
  };
}
