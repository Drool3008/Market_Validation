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
  | "bounce";

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
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
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
  // eslint-disable-next-line no-console
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
