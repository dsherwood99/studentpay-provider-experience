import {
  isFirstPaymentDateInWindow,
  isIsoCalendarDate,
  type FirstPaymentDateWindow,
} from "./first-payment-window.ts";

export type NzCalendarDay = {
  iso: string;
  inMonth: boolean;
  selectable: boolean;
};

export type NzCalendarWeek = NzCalendarDay[];

export type NzCalendarPanel = {
  month: string;
  label: string;
  weeks: NzCalendarWeek[];
};

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthStart(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  return isoDate(year, month, 1);
}

export function addCalendarMonths(iso: string, count: number): string {
  const [year, month] = monthStart(iso).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + count, 1));
  return isoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

export function formatDdMmYyyy(iso: string): string {
  if (!isIsoCalendarDate(iso)) {
    return iso;
  }
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function formatMonthLabel(iso: string): string {
  const [year, month] = monthStart(iso).split("-").map(Number);
  return new Intl.DateTimeFormat("en-NZ", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function weeksForMonth(
  monthIso: string,
  selectable: (iso: string) => boolean,
): NzCalendarWeek[] {
  const [year, month] = monthIso.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(1 - lead);
  const weeks: NzCalendarWeek[] = [];
  for (let week = 0; week < 6; week += 1) {
    const days: NzCalendarDay[] = [];
    let anySelectable = false;
    for (let index = 0; index < 7; index += 1) {
      const cursor = new Date(start);
      cursor.setUTCDate(start.getUTCDate() + week * 7 + index);
      const iso = isoDate(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth() + 1,
        cursor.getUTCDate(),
      );
      const inMonth = cursor.getUTCMonth() === month - 1;
      const canSelect = inMonth && selectable(iso);
      if (canSelect) {
        anySelectable = true;
      }
      days.push({ iso, inMonth, selectable: canSelect });
    }
    if (anySelectable) {
      weeks.push(days);
    }
  }
  return weeks;
}

function monthsInWindow(window: FirstPaymentDateWindow): string[] {
  if (!window.min || !window.max) {
    return [];
  }
  const months: string[] = [];
  let cursor = monthStart(window.min);
  const last = monthStart(window.max);
  while (cursor <= last && months.length < 3) {
    months.push(cursor);
    cursor = addCalendarMonths(cursor, 1);
  }
  return months;
}

/**
 * Two months when that covers the window. Weeks with no selectable day are omitted.
 * An uncapped New Zealand window uses the anchor month and the next month.
 * Weekends stay selectable: New Zealand does not use the Australian weekday rule.
 */
export function nzPaymentCalendarPanels(input: {
  window: FirstPaymentDateWindow;
  anchor: string;
}): NzCalendarPanel[] {
  const selectable = (iso: string) => isFirstPaymentDateInWindow(iso, input.window);
  const anchor = isIsoCalendarDate(input.anchor)
    ? monthStart(input.anchor)
    : input.window.min
      ? monthStart(input.window.min)
      : monthStart(input.anchor);
  const months =
    input.window.min && input.window.max ? monthsInWindow(input.window) : [anchor, addCalendarMonths(anchor, 1)];
  return months
    .map((month) => ({
      month,
      label: formatMonthLabel(month),
      weeks: weeksForMonth(month, selectable),
    }))
    .filter((panel) => panel.weeks.length > 0);
}
