import { addCalendarDays, aucklandToday, defaultFirstPaymentDate } from "./plan-math.ts";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const FIRST_PAYMENT_DATE_RANGE_MESSAGE =
  "First payment date must be within the allowed range.";

export const FIRST_PAYMENT_WEEKEND_MESSAGE =
  "First payment date must be a weekday.";

export type FirstPaymentDateWindow = {
  min: string | null;
  max: string | null;
  weekdaysOnly?: boolean;
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

export function isWeekendIsoDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

export function firstPaymentDateWindow(input: {
  today?: string;
  maxDelayDays?: number | null;
  weekdaysOnly?: boolean;
}): FirstPaymentDateWindow {
  const today = input.today || aucklandToday();
  const days = input.maxDelayDays;
  const weekdaysOnly = input.weekdaysOnly ? true : undefined;
  if (!Number.isInteger(days) || !days || days <= 0) {
    return weekdaysOnly ? { min: null, max: null, weekdaysOnly } : { min: null, max: null };
  }
  return {
    min: today,
    max: addCalendarDays(today, days),
    ...(weekdaysOnly ? { weekdaysOnly } : {}),
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
  if (window.weekdaysOnly && isWeekendIsoDate(value)) {
    return false;
  }
  return true;
}

function nearestWeekdayInWindow(value: string, window: FirstPaymentDateWindow): string {
  if (!window.weekdaysOnly || !isIsoCalendarDate(value) || !isWeekendIsoDate(value)) {
    return value;
  }
  for (let step = 1; step <= 6; step += 1) {
    const next = addCalendarDays(value, step);
    if (window.max && next > window.max) {
      break;
    }
    if ((!window.min || next >= window.min) && !isWeekendIsoDate(next)) {
      return next;
    }
  }
  for (let step = 1; step <= 6; step += 1) {
    const previous = addCalendarDays(value, -step);
    if (window.min && previous < window.min) {
      break;
    }
    if ((!window.max || previous <= window.max) && !isWeekendIsoDate(previous)) {
      return previous;
    }
  }
  return value;
}

export function clampFirstPaymentDate(
  value: string | null | undefined,
  window: FirstPaymentDateWindow,
  fallback: string = defaultFirstPaymentDate(),
): string {
  if (!hasFirstPaymentDateCap(window) && !window.weekdaysOnly) {
    return isIsoCalendarDate(value) ? value : fallback;
  }
  let candidate = isIsoCalendarDate(value) ? value : fallback;
  if (window.min && candidate < window.min) {
    candidate = window.min;
  }
  if (window.max && candidate > window.max) {
    candidate = window.max;
  }
  candidate = nearestWeekdayInWindow(candidate, window);
  if (isFirstPaymentDateInWindow(candidate, window)) {
    return candidate;
  }
  const fallbackCandidate = nearestWeekdayInWindow(
    window.min && fallback < window.min ? window.min : fallback,
    window,
  );
  return isFirstPaymentDateInWindow(fallbackCandidate, window)
    ? fallbackCandidate
    : candidate;
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
  if (!hasFirstPaymentDateCap(input.window) && !input.window.weekdaysOnly) {
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
  weekdaysOnly?: boolean;
  today?: string;
}): string | null {
  const hasCap =
    Number.isInteger(input.maxDelayDays) && Boolean(input.maxDelayDays) && input.maxDelayDays! > 0;
  if (!hasCap && !input.weekdaysOnly) {
    return null;
  }
  const window = firstPaymentDateWindow({
    today: input.today,
    maxDelayDays: input.maxDelayDays,
    weekdaysOnly: input.weekdaysOnly,
  });
  const submitted = input.submittedDate || defaultFirstPaymentDate();
  if (isFirstPaymentDateInWindow(submitted, window)) {
    return null;
  }
  if (
    window.weekdaysOnly &&
    isIsoCalendarDate(submitted) &&
    isWeekendIsoDate(submitted) &&
    (!window.min || submitted >= window.min) &&
    (!window.max || submitted <= window.max)
  ) {
    return FIRST_PAYMENT_WEEKEND_MESSAGE;
  }
  return FIRST_PAYMENT_DATE_RANGE_MESSAGE;
}
