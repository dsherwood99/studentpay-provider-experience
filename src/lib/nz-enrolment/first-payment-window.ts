import { addCalendarDays, aucklandToday, defaultFirstPaymentDate } from "./plan-math.ts";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const FIRST_PAYMENT_DATE_RANGE_MESSAGE =
  "First payment date must be within the allowed range.";

export type FirstPaymentDateWindow = {
  min: string | null;
  max: string | null;
};

export function isIsoCalendarDate(value: string | null | undefined): value is string {
  const match = ISO_DATE.exec(String(value || "").trim());
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function firstPaymentDateWindow(input: {
  today?: string;
  maxDelayDays?: number | null;
}): FirstPaymentDateWindow {
  const today = input.today || aucklandToday();
  const days = input.maxDelayDays;
  if (!Number.isInteger(days) || !days || days <= 0) {
    return { min: null, max: null };
  }
  return {
    min: today,
    max: addCalendarDays(today, days),
  };
}

export function hasFirstPaymentDateCap(window: FirstPaymentDateWindow): boolean {
  return Boolean(window.min && window.max);
}

export function isFirstPaymentDateInWindow(
  value: string | null | undefined,
  window: FirstPaymentDateWindow,
): boolean {
  if (!isIsoCalendarDate(value)) {
    return false;
  }
  if (window.min && value < window.min) {
    return false;
  }
  if (window.max && value > window.max) {
    return false;
  }
  return true;
}

export function clampFirstPaymentDate(
  value: string | null | undefined,
  window: FirstPaymentDateWindow,
  fallback: string = defaultFirstPaymentDate(),
): string {
  if (!hasFirstPaymentDateCap(window)) {
    return isIsoCalendarDate(value) ? value : fallback;
  }
  if (!isIsoCalendarDate(value)) {
    return isFirstPaymentDateInWindow(fallback, window) ? fallback : window.min!;
  }
  if (window.min && value < window.min) {
    return window.min;
  }
  if (window.max && value > window.max) {
    return window.max;
  }
  return value;
}

export function resolveHostedFirstPaymentDate(input: {
  selectedDate: string;
  storedDate?: string | null;
  defaultDate?: string;
  window: FirstPaymentDateWindow;
  checkoutCreated: boolean;
}): string {
  const defaultDate = input.defaultDate || defaultFirstPaymentDate();
  const selectedIsDefault = input.selectedDate === defaultDate;
  const candidate =
    selectedIsDefault && input.storedDate ? input.storedDate : input.selectedDate;
  if (input.checkoutCreated) {
    return candidate;
  }
  if (!hasFirstPaymentDateCap(input.window)) {
    return candidate;
  }
  if (isFirstPaymentDateInWindow(candidate, input.window)) {
    return candidate;
  }
  return clampFirstPaymentDate(defaultDate, input.window, defaultDate);
}

export function hostedFirstPaymentDateError(input: {
  submittedDate?: string | null;
  maxDelayDays?: number | null;
  today?: string;
}): string | null {
  if (!Number.isInteger(input.maxDelayDays) || !input.maxDelayDays || input.maxDelayDays <= 0) {
    return null;
  }
  const window = firstPaymentDateWindow({
    today: input.today,
    maxDelayDays: input.maxDelayDays,
  });
  const submitted = input.submittedDate || defaultFirstPaymentDate();
  if (isFirstPaymentDateInWindow(submitted, window)) {
    return null;
  }
  return FIRST_PAYMENT_DATE_RANGE_MESSAGE;
}
