// Client helpers shared by the survey pages: mint a session id (UUID v4) and
// POST a completed survey to /api/survey. Fire-and-forget on the network like
// the events logger, but we await so the page can redirect only after the write
// is attempted.
import type { Answers } from "@/lib/survey";

export function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for very old browsers; server never calls this.
  return "00000000-0000-4000-8000-000000000000".replace(/[0]/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
}

export async function saveSurvey(input: {
  sessionId: string;
  survey: "pre" | "post";
  answers: Answers;
  screenedOut?: boolean;
}): Promise<void> {
  try {
    await fetch("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    /* never block the flow on a logging error */
  }
}
