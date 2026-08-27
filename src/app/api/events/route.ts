import { NextResponse } from "next/server";
import { appendEvent } from "@/lib/events-store";

// Event sink. Writes through the shared store (local JSONL, or Supabase when
// SUPABASE_URL + SUPABASE_SERVICE_KEY are set). See src/lib/events-store.ts.

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    sessionId?: string | null;
    profileId?: string | null;
    type?: string;
    payload?: Record<string, unknown>;
    ts?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  if (!body.type) {
    return NextResponse.json({ ok: false, error: "missing type" }, { status: 400 });
  }

  try {
    await appendEvent({
      sessionId: body.sessionId ?? null,
      profileId: body.profileId ?? null,
      type: body.type,
      payload: body.payload ?? {},
      ts: body.ts ?? new Date().toISOString(),
    });
  } catch {
    /* never fail the client on a logging error */
  }

  return NextResponse.json({ ok: true });
}
