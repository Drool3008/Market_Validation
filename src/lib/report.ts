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

// WWYE-vs-normal-browsing path comparison. Interactions carry payload.path
// ("wwye" | "browse"); rows written before that field existed are treated as
// "browse" (see pathOf).
export type PathKey = "wwye" | "browse";

export interface PathComparison {
  // Funnel event counts split by path.
  funnel: { label: string; wwye: number; browse: number }[];
  // Median seconds from session start to that session's first play_click,
  // bucketed by the first play's path.
  timeToFirstPlaySec: { wwye: number | null; browse: number | null };
  // Median title_opens before the first play, bucketed by the first play's path.
  tilesBeforeStart: { wwye: number | null; browse: number | null; overall: number | null };
  // Sessions that saw home but never pressed play, over sessions that saw home.
  giveUpRate: number;
  giveUpSessions: number;
  sessionsWithHome: number;
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
  pathComparison: PathComparison;
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

// Median that reports an empty bucket as null (renders as "-") rather than 0,
// so "no sessions" is distinguishable from "median is genuinely 0".
function medianOrNull(nums: number[]): number | null {
  return nums.length ? median(nums) : null;
}

function roundOrNull(v: number | null): number | null {
  return v === null ? null : Math.round(v);
}

// payload.path is "wwye" | "browse"; missing on pre-path rows -> "browse".
function pathOf(e: StoredEvent): PathKey {
  return e.payload?.path === "wwye" ? "wwye" : "browse";
}

// Path comparison: WWYE feature journey vs normal browsing. All per-session
// metrics attribute to the path of the session's FIRST play_click.
function pathComparison(events: StoredEvent[]): PathComparison {
  // Funnel counts split by path.
  const funnelCounts: Record<string, { wwye: number; browse: number }> = {
    row_click: { wwye: 0, browse: 0 },
    title_open: { wwye: 0, browse: 0 },
    play_click: { wwye: 0, browse: 0 },
  };

  // Group events per session so we can reason about first-play and ordering.
  const bySession = new Map<string, StoredEvent[]>();
  for (const e of events) {
    if (funnelCounts[e.type]) funnelCounts[e.type][pathOf(e)]++;
    if (!e.sessionId) continue;
    const g = bySession.get(e.sessionId);
    if (g) g.push(e);
    else bySession.set(e.sessionId, [e]);
  }

  const tByPath = { wwye: [] as number[], browse: [] as number[] };
  const tilesByPath = { wwye: [] as number[], browse: [] as number[] };
  const tilesOverall: number[] = [];
  let sessionsWithHome = 0;
  let giveUpSessions = 0;

  for (const evs of bySession.values()) {
    // ts.asc from the store, but sort defensively — don't trust arrival order.
    const sorted = [...evs].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));

    const start = sorted.find((e) => e.type === "session_start" || e.type === "home_view");
    const firstPlay = sorted.find((e) => e.type === "play_click");

    if (start) {
      sessionsWithHome++;
      if (!firstPlay) giveUpSessions++;
    }

    if (firstPlay) {
      const p = pathOf(firstPlay);
      // Time-to-first-play needs a start anchor; skip sessions with only a play.
      if (start) {
        const secs = (Date.parse(firstPlay.ts) - Date.parse(start.ts)) / 1000;
        if (Number.isFinite(secs) && secs >= 0) tByPath[p].push(secs);
      }
      // Tiles opened before the first play (strictly earlier ts).
      const tiles = sorted.filter(
        (e) => e.type === "title_open" && e.ts < firstPlay.ts,
      ).length;
      tilesByPath[p].push(tiles);
      tilesOverall.push(tiles);
    }
  }

  return {
    funnel: [
      { label: "Row clicked", wwye: funnelCounts.row_click.wwye, browse: funnelCounts.row_click.browse },
      { label: "Title opened", wwye: funnelCounts.title_open.wwye, browse: funnelCounts.title_open.browse },
      { label: "Pressed play", wwye: funnelCounts.play_click.wwye, browse: funnelCounts.play_click.browse },
    ],
    timeToFirstPlaySec: {
      wwye: roundOrNull(medianOrNull(tByPath.wwye)),
      browse: roundOrNull(medianOrNull(tByPath.browse)),
    },
    tilesBeforeStart: {
      wwye: medianOrNull(tilesByPath.wwye),
      browse: medianOrNull(tilesByPath.browse),
      overall: medianOrNull(tilesOverall),
    },
    giveUpRate: sessionsWithHome ? giveUpSessions / sessionsWithHome : 0,
    giveUpSessions,
    sessionsWithHome,
  };
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
    pathComparison: pathComparison(events),
    verdict,
    checks,
  };
}
