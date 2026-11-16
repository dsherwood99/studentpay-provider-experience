import assert from "node:assert/strict";
import test from "node:test";
import { nzPaymentCalendarPanels } from "./payment-calendar.ts";

test("keeps weekends selectable and drops weeks outside a capped New Zealand window", () => {
  const panels = nzPaymentCalendarPanels({
    window: { min: "2026-11-16", max: "2026-11-23" },
    anchor: "2026-11-20",
  });
  const days = panels.flatMap((panel) => panel.weeks.flat());
  const saturday = days.find((day) => day.iso === "2026-11-21");
  const sunday = days.find((day) => day.iso === "2026-11-22");
  assert.equal(saturday?.selectable, true);
  assert.equal(sunday?.selectable, true);
  assert.equal(
    days.some((day) => day.iso === "2026-11-15"),
    false,
  );
  assert.equal(
    days.some((day) => day.selectable && day.iso > "2026-11-23"),
    false,
  );
  assert.ok(panels.every((panel) => panel.weeks.length > 0 && panel.weeks.length < 6));
});

test("shows two months for an uncapped New Zealand window without a weekday filter", () => {
  const panels = nzPaymentCalendarPanels({
    window: { min: null, max: null },
    anchor: "2026-11-23",
  });
  assert.equal(panels.length, 2);
  assert.equal(panels[0]?.label, "November 2026");
  assert.equal(panels[1]?.label, "December 2026");
  const november = panels[0]?.weeks.flat() ?? [];
  assert.equal(november.find((day) => day.iso === "2026-11-21")?.selectable, true);
  assert.equal(november.find((day) => day.iso === "2026-11-22")?.selectable, true);
  const lastWeek = panels[0]?.weeks.at(-1) ?? [];
  assert.ok(lastWeek.some((day) => day.selectable));
  assert.ok(panels[0] && panels[0].weeks.length <= 6);
});
