// What the participant actually encountered during the prototype session.
//
// The post survey must not ask people to rate things they never met (pilot
// feedback): someone who ignored the WWYE row cannot judge its picks, and most
// phone testers never reached the best-moment graph at all. These flags gate
// those questions -- see `showIf` in src/lib/survey.ts.
//
// Kept in sessionStorage next to the session id (same lifetime, same tab) rather
// than in the events table: the post survey needs it synchronously at render time,
// and the event schema is frozen for the study.
//
// The record is CREATED at prototype entry, before any flag can be set. That is
// what separates "we know they did not do it" (record exists, flag false) from
// "we have no idea" (no record: direct link to /survey/post, fresh tab, cleared
// storage). A missing record falls back to asking everything -- never silently
// drop a guardrail answer.

const KEY = "wwye_exposure";

export interface Exposure {
  /** Opened a title from the Watch While You Eat row. */
  clickedFeature: boolean;
  /** The best-moment graph was rendered in front of them. */
  sawHeatmap: boolean;
  /** They actually hovered/tapped the graph. */
  usedHeatmap: boolean;
}

const EMPTY: Exposure = {
  clickedFeature: false,
  sawHeatmap: false,
  usedHeatmap: false,
};

/** Read the record, or null when this session never entered the prototype. */
export function readExposure(): Exposure | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Exposure>;
    return { ...EMPTY, ...parsed };
  } catch {
    return null;
  }
}

/**
 * Start the record at prototype entry. Idempotent: an existing record is left
 * alone, so re-entering the gate mid-session cannot wipe what they already saw.
 */
export function beginExposure(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, JSON.stringify(EMPTY));
  } catch {
    /* storage unavailable: readExposure returns null and the survey asks everything */
  }
}

/**
 * Flip one flag on. Creates the record if entry somehow never ran, so a real
 * exposure is never lost to ordering.
 */
export function markExposure(key: keyof Exposure): void {
  if (typeof window === "undefined") return;
  try {
    const current = readExposure() ?? EMPTY;
    if (current[key]) return;
    sessionStorage.setItem(KEY, JSON.stringify({ ...current, [key]: true }));
  } catch {
    /* ignore: see beginExposure */
  }
}
