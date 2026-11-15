export type JourneyMark = {
  name: string;
  at: number;
  performanceMs: number;
  detail: Record<string, number | string | null> | null;
};

type JourneyStore = {
  marks: JourneyMark[];
};

declare global {
  interface Window {
    __spNzJourney?: JourneyStore;
  }
}

export function numericJourneyTimings(
  value: unknown,
): Record<string, number> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const timings: Record<string, number> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[a-z0-9_]+$/i.test(key) || typeof item !== "number" || !Number.isFinite(item)) {
      continue;
    }
    timings[key] = Math.round(item);
  }
  return timings;
}

export function navigationTiming(): Record<string, number> {
  if (typeof performance === "undefined") {
    return {};
  }
  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (!nav) {
    return {};
  }
  const span = (end: number, start: number) => Math.max(0, Math.round(end - start));
  return {
    dns_ms: span(nav.domainLookupEnd, nav.domainLookupStart),
    connect_ms: span(nav.connectEnd, nav.connectStart),
    ttfb_ms: span(nav.responseStart, nav.requestStart),
    download_ms: span(nav.responseEnd, nav.responseStart),
    dom_interactive_ms: span(nav.domInteractive, nav.startTime),
    dom_complete_ms: span(nav.domComplete, nav.startTime),
    load_event_ms: span(nav.loadEventEnd, nav.startTime),
  };
}

export function recordJourneyMark(
  name: string,
  detail?: Record<string, number | string | null>,
): JourneyMark | null {
  if (typeof window === "undefined") {
    return null;
  }
  const mark: JourneyMark = {
    name,
    at: Date.now(),
    performanceMs: Math.round(performance.now()),
    detail: detail && Object.keys(detail).length > 0 ? detail : null,
  };
  const store = (window.__spNzJourney ||= { marks: [] });
  store.marks.push(mark);
  try {
    sessionStorage.setItem("sp_nz_journey", JSON.stringify(store));
    document.documentElement.dataset.nzJourney = JSON.stringify(store);
  } catch {
    // Private browsing can refuse storage. The in-memory mark still stands.
  }
  return mark;
}

export function entryClickDelta(): Record<string, number | string | null> {
  if (typeof window === "undefined") {
    return {};
  }
  const params = new URLSearchParams(window.location.search);
  const clickedAt = Number(params.get("entryClickedAt"));
  const entry = params.get("entry");
  const detail: Record<string, number | string | null> = {};
  if (entry) {
    detail.entry = entry;
  }
  if (Number.isFinite(clickedAt) && clickedAt > 0) {
    detail.entry_to_mark_ms = Date.now() - clickedAt;
  }
  return detail;
}
