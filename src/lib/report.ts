import type { StoredEvent } from "./events-store";
import { THRESHOLDS } from "./report-config";

// Turns raw events into the validation metrics. Pure function so it is easy to
// reason about and reuse (report page now, exported report later).

const FEATURE_ROW = "watch-while-you-eat";

export interface Segment {
  key: string;
  sessions: number;
  featureCTR: number;
  medianDwellSec: number;
}

export interface Report {
  sessions: number;
  funnel: { label: string; count: number }[];
  featureCTR: number;
  genericCTR: number;
  ctrRatio: number;
  sessionsClickedPct: number;
  medianDwellSec: number;
  medianBounceSec: number;
  bounceRate: number;
  segmentsByProfile: Segment[];
  segmentsByDevice: Segment[];
  verdict: "validated" | "weak" | "not-validated";
  checks: { label: string; pass: boolean; detail: string }[];
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function bool(e: StoredEvent, key: string): boolean {
  return Boolean(e.payload?.[key]);
}

function deviceFromWidth(w: unknown): string {
  if (typeof w !== "number") return "unknown";
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

// Shared feature-CTR + median-dwell computation. Used for the overall report and
// for each segment so the numbers are defined the same way everywhere.
function coreMetrics(events: StoredEvent[]): {
  sessions: number;
  featureImpr: number;
  featureClicks: number;
  featureCTR: number;
  medianDwellSec: number;
} {
  const sessionIds = new Set<string>();
  let featureImpr = 0;
  let featureClicks = 0;
  const dwellMs: number[] = [];

  for (const e of events) {
    if (e.sessionId) sessionIds.add(e.sessionId);
    switch (e.type) {
      case "row_impression":
        if (bool(e, "isFeature")) featureImpr++;
        break;
      case "row_click":
        if (bool(e, "isFeature")) featureClicks++;
        break;
      case "feature_dwell":
        if (typeof e.payload?.ms === "number") dwellMs.push(e.payload.ms as number);
        break;
    }
  }

  return {
    sessions: sessionIds.size,
    featureImpr,
    featureClicks,
    featureCTR: featureImpr ? featureClicks / featureImpr : 0,
    medianDwellSec: Math.round(median(dwellMs) / 1000),
  };
}

function segment(events: StoredEvent[], keyOf: (e: StoredEvent) => string): Segment[] {
  const groups = new Map<string, StoredEvent[]>();
  for (const e of events) {
    const k = keyOf(e);
    const g = groups.get(k);
    if (g) g.push(e);
    else groups.set(k, [e]);
  }
  return [...groups.entries()]
    .map(([key, evs]) => {
      const m = coreMetrics(evs);
      return { key, sessions: m.sessions, featureCTR: m.featureCTR, medianDwellSec: m.medianDwellSec };
    })
    .sort((a, b) => b.sessions - a.sessions);
}

export function buildReport(events: StoredEvent[]): Report {
  const sessions = new Set(events.map((e) => e.sessionId).filter(Boolean)).size;

  let featureImpr = 0;
  let featureClicks = 0;
  let genericImpr = 0;
  let genericClicks = 0;
  const dwellMs: number[] = [];
  const clickedSessions = new Set<string>();

  let featureTitleOpens = 0;
  let featurePlays = 0;
  let scrubberInteracts = 0;

  const bounceSec: number[] = [];
  const leftWithoutEngaging = new Set<string>();

  // sessionId -> device, derived from session_start width.
  const deviceBySession = new Map<string, string>();

  for (const e of events) {
    if (e.type === "session_start" && e.sessionId && !deviceBySession.has(e.sessionId)) {
      deviceBySession.set(e.sessionId, deviceFromWidth(e.payload?.w));
    }
    switch (e.type) {
      case "row_impression":
        if (bool(e, "isFeature")) featureImpr++;
        else genericImpr++;
        break;
      case "row_click":
        if (bool(e, "isFeature")) {
          featureClicks++;
          if (e.sessionId) clickedSessions.add(e.sessionId);
        } else genericClicks++;
        break;
      case "title_open":
        if (e.payload?.source === FEATURE_ROW) featureTitleOpens++;
        break;
      case "play_click":
        if (e.payload?.source === FEATURE_ROW) featurePlays++;
        break;
      case "scrubber_interact":
        scrubberInteracts++;
        break;
      case "feature_dwell":
        if (typeof e.payload?.ms === "number") dwellMs.push(e.payload.ms as number);
        break;
      case "bounce":
        if (typeof e.payload?.seconds === "number") bounceSec.push(e.payload.seconds as number);
        if (e.payload?.featureEngaged === false && e.sessionId) leftWithoutEngaging.add(e.sessionId);
        break;
    }
  }

  const featureCTR = featureImpr ? featureClicks / featureImpr : 0;
  const genericCTR = genericImpr ? genericClicks / genericImpr : 0;
  const ctrRatio = genericCTR ? featureCTR / genericCTR : 0;
  const sessionsClickedPct = sessions ? clickedSessions.size / sessions : 0;
  const medianDwellSec = Math.round(median(dwellMs) / 1000);
  const medianBounceSec = Math.round(median(bounceSec));
  const bounceRate = sessions ? leftWithoutEngaging.size / sessions : 0;

  const segmentsByProfile = segment(events, (e) => e.profileId ?? "unknown");
  const segmentsByDevice = segment(events, (e) =>
    deviceBySession.get(e.sessionId ?? "") ?? "unknown",
  );

  const checks = [
    {
      label: `Feature CTR beats generic rows by ${THRESHOLDS.ctrMultiple}x`,
      pass: ctrRatio >= THRESHOLDS.ctrMultiple,
      detail: `${(featureCTR * 100).toFixed(0)}% vs ${(genericCTR * 100).toFixed(0)}% (${ctrRatio.toFixed(2)}x)`,
    },
    {
      label: `At least ${(THRESHOLDS.minSessionsClickedPct * 100).toFixed(0)}% of sessions click the feature`,
      pass: sessionsClickedPct >= THRESHOLDS.minSessionsClickedPct,
      detail: `${(sessionsClickedPct * 100).toFixed(0)}% of ${sessions} sessions`,
    },
    {
      label: `Median dwell at least ${THRESHOLDS.minMedianDwellSec}s`,
      pass: medianDwellSec >= THRESHOLDS.minMedianDwellSec,
      detail: `${medianDwellSec}s median`,
    },
  ];

  const passCount = checks.filter((c) => c.pass).length;
  const verdict =
    passCount === checks.length
      ? "validated"
      : passCount === 0
        ? "not-validated"
        : "weak";

  return {
    sessions,
    funnel: [
      { label: "Feature row seen", count: featureImpr },
      { label: "Feature row clicked", count: featureClicks },
      { label: "Episode opened", count: featureTitleOpens },
      { label: "Pressed play", count: featurePlays },
      { label: "Used best-moment scrubber", count: scrubberInteracts },
    ],
    featureCTR,
    genericCTR,
    ctrRatio,
    sessionsClickedPct,
    medianDwellSec,
    medianBounceSec,
    bounceRate,
    segmentsByProfile,
    segmentsByDevice,
    verdict,
    checks,
  };
}
