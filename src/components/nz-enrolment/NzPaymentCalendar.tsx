"use client";

import { useMemo, useState } from "react";
import {
  addCalendarMonths,
  formatMonthLabel,
  nzPaymentCalendarPanels,
} from "@/lib/nz-enrolment/payment-calendar";
import type { FirstPaymentDateWindow } from "@/lib/nz-enrolment/first-payment-window";
import styles from "./bela-au-checkout.module.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  value: string;
  window: FirstPaymentDateWindow;
  onChange: (iso: string) => void;
};

export function NzPaymentCalendar({ value, window, onChange }: Props) {
  const capped = Boolean(window.min && window.max);
  const [viewMonth, setViewMonth] = useState(value || window.min || "");
  const panels = useMemo(
    () =>
      nzPaymentCalendarPanels({
        window,
        anchor: capped ? value || window.min || viewMonth : viewMonth || value,
      }),
    [capped, value, viewMonth, window],
  );

  function move(iso: string, direction: number) {
    const selectable = panels
      .flatMap((panel) => panel.weeks.flat())
      .filter((day) => day.selectable)
      .map((day) => day.iso);
    const index = selectable.indexOf(iso);
    const next = selectable[index + direction];
    if (next) {
      onChange(next);
    }
  }

  return (
    <div className={styles.calendar}>
      {capped ? null : (
        <div className={styles.calendarNav}>
          <button
            type="button"
            className={styles.calendarNavButton}
            onClick={() => setViewMonth((current) => addCalendarMonths(current || value, -1))}
          >
            Previous
          </button>
          <button
            type="button"
            className={styles.calendarNavButton}
            onClick={() => setViewMonth((current) => addCalendarMonths(current || value, 1))}
          >
            Next
          </button>
        </div>
      )}
      <div className={styles.calendarMonths}>
        {panels.map((panel) => (
          <div key={panel.month}>
            <p className={styles.calendarMonth}>{panel.label || formatMonthLabel(panel.month)}</p>
            <div className={styles.calendarWeekdays}>
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            {panel.weeks.map((week) => (
              <div key={week[0]?.iso} className={styles.calendarWeek}>
                {week.map((day) => {
                  const selected = day.iso === value;
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      disabled={!day.selectable}
                      aria-pressed={selected}
                      aria-label={day.iso}
                      className={
                        selected
                          ? styles.calendarDaySelected
                          : day.selectable
                            ? styles.calendarDay
                            : styles.calendarDayQuiet
                      }
                      onClick={() => {
                        if (day.selectable) {
                          onChange(day.iso);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (!day.selectable) {
                          return;
                        }
                        if (event.key === "ArrowRight") {
                          event.preventDefault();
                          move(day.iso, 1);
                        }
                        if (event.key === "ArrowLeft") {
                          event.preventDefault();
                          move(day.iso, -1);
                        }
                      }}
                    >
                      {day.inMonth ? Number(day.iso.slice(-2)) : ""}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
