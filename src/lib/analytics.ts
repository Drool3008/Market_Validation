// Thin client-side event logger. Fire-and-forget POST to /api/events.
// This is the entire measurement layer for the validation report.
// Phase 5 swaps the /api/events sink for Supabase; this client stays the same.

export type EventType =
  | "session_start"
  | "profile_selected"
  | "home_view"
  | "row_impression"
  | "row_click"
  | "card_hover"
  | "title_open"
  | "scrubber_hover"
  | "scrubber_interact"
  | "play_click"
  | "feature_dwell"
  | "bounce"
  | "nav_click"
  | "search_query"
  | "search_result_click"
  | "mylist_add"
  | "mylist_remove"
  | "rating";

// Which experience path an interaction belongs to, for the WWYE-vs-normal
// comparison in the report. The feature row uses source "watch-while-you-eat";
// everything else (other rows, nav, search, hero) is normal browsing.
export type ExperiencePath = "wwye" | "browse";

export function pathFor(source: string): ExperiencePath {
  return source === "watch-while-you-eat" ? "wwye" : "browse";
}

const SESSION_KEY = "wwye_session";
const PROFILE_KEY = "wwye_profile";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    // Honor the survey's ?sid= on prototype entry so events join the pre/post
    // rows no matter which component reads the id first (avoids an effect-order
    // race between ProfileGate and shared-layout components like FinishFeedback).
    id = new URLSearchParams(window.location.search).get("sid") || uuid();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Seed the session id from the survey's ?sid= so events.session_id joins the
// pre/post survey rows. The URL sid is authoritative on prototype entry, so it
// OVERWRITES any id a shared-layout component (e.g. FinishFeedback -> getSessionId)
// may have minted first while still on /survey/pre. Only ProfileGate calls this,
// and only when ?sid= is present, so it can't clobber a genuine mid-session id.
export function seedSessionId(sid: string): void {
  if (typeof window === "undefined" || !sid) return;
  sessionStorage.setItem(SESSION_KEY, sid);
}

export function getProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PROFILE_KEY);
}

export function setProfileId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, id);
}

export function track(
  type: EventType,
  payload: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;
  const body = {
    sessionId: getSessionId(),
    profileId: getProfileId(),
    type,
    payload,
    ts: new Date().toISOString(),
  };
  console.debug("[event]", type, payload);
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    /* fire-and-forget: never block the UI on logging */
  });
}
