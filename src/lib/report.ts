import type { StoredEvent } from "./events-store";
import { THRESHOLDS } from "./report-config";

// Turns raw events into the validation metrics. Pure function so it is easy to
// reason about and reuse (report page now, exported report later).

const FEATURE_ROW = "watch-while-you-eat";

export interface Report {
  sessions: number;
  funnel: { label: string; count: number }[];
  featureCTR: number;
  genericCTR: number;
  ctrRatio: number;
  sessionsClickedPct: number;
  medianDwellSec: number;
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

  for (const e of events) {
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
    }
  }

  const featureCTR = featureImpr ? featureClicks / featureImpr : 0;
  const genericCTR = genericImpr ? genericClicks / genericImpr : 0;
  const ctrRatio = genericCTR ? featureCTR / genericCTR : 0;
  const sessionsClickedPct = sessions ? clickedSessions.size / sessions : 0;
  const medianDwellSec = Math.round(median(dwellMs) / 1000);

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
    verdict,
    checks,
  };
}
