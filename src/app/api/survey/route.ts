import { NextResponse } from "next/server";

// Survey sink. Inserts one row into public.survey_responses via the Supabase REST
// API, mirroring src/lib/events-store.ts (service key preferred, anon fallback).
// No supabase-js. When Supabase is unconfigured, we no-op OK so the flow still
// works locally (matches the events fire-and-forget posture).

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req: Request) {
  let body: {
    sessionId?: string;
    survey?: string;
    screenedOut?: boolean;
    answers?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  if (!body.sessionId || (body.survey !== "pre" && body.survey !== "post")) {
    return NextResponse.json(
      { ok: false, error: "missing sessionId or survey" },
      { status: 400 },
    );
  }
  if (!body.answers || typeof body.answers !== "object") {
    return NextResponse.json({ ok: false, error: "missing answers" }, { status: 400 });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    // ponytail: no local-file fallback for surveys — Supabase is the only sink
    // that matters for analysis. Local dev with empty env just no-ops OK.
    return NextResponse.json({ ok: true, stored: false });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/survey_responses`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      session_id: body.sessionId,
      survey: body.survey,
      screened_out: Boolean(body.screenedOut),
      answers: body.answers,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: "insert failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, stored: true });
}
