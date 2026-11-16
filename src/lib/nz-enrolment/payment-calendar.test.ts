import assert from "node:assert/strict";
import test from "node:test";
import { nzPaymentCalendarPanels } from "./payment-calendar.ts";

test("keeps a full Monday grid and leaves dates outside the New Zealand window unselectable", () => {
  const panels = nzPaymentCalendarPanels({
    window: { min: "2026-11-16", max: "2026-11-23" },
    anchor: "2026-11-20",
  });
  assert.equal(panels.length, 1);
  const weeks = panels[0]?.weeks ?? [];
  assert.equal(weeks.length, 6);
  assert.ok(weeks.every((week) => week.length === 7));
  const days = weeks.flat();
  const saturday = days.find((day) => day.iso === "2026-11-21");
  const sunday = days.find((day) => day.iso === "2026-11-22");
  const before = days.find((day) => day.iso === "2026-11-15");
  const after = days.find((day) => day.iso === "2026-11-24");
  assert.equal(saturday?.selectable, true);
  assert.equal(sunday?.selectable, true);
  assert.equal(before?.inMonth, true);
  assert.equal(before?.selectable, false);
  assert.equal(after?.selectable, false);
  const first = weeks[0]?.[6];
  assert.equal(first?.iso, "2026-11-01");
  assert.equal(first?.inMonth, true);
  assert.equal(weeks[0]?.[0]?.inMonth, false);
  assert.equal(weeks[0]?.[0]?.selectable, false);
});

test("shows two even month grids for an uncapped New Zealand window", () => {
  const panels = nzPaymentCalendarPanels({
    window: { min: null, max: null },
    anchor: "2026-11-23",
  });
  assert.equal(panels.length, 2);
  assert.equal(panels[0]?.label, "November 2026");
  assert.equal(panels[1]?.label, "December 2026");
  assert.equal(panels[0]?.weeks.length, 6);
  assert.equal(panels[1]?.weeks.length, 6);
  const november = panels[0]?.weeks.flat() ?? [];
  assert.equal(november.find((day) => day.iso === "2026-11-21")?.selectable, true);
  assert.equal(november.find((day) => day.iso === "2026-11-22")?.selectable, true);
  const leading = panels[0]?.weeks[0]?.[0];
  assert.equal(leading?.inMonth, false);
  assert.equal(leading?.selectable, false);
  const decemberFirst = panels[1]?.weeks.flat().find((day) => day.iso === "2026-12-01");
  assert.equal(decemberFirst?.inMonth, true);
  assert.equal(decemberFirst?.selectable, true);
});
