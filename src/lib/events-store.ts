// Single read/write path for events. Local JSONL file by default; Supabase
// (via its REST API, no SDK dependency) when SUPABASE_URL + SUPABASE_SERVICE_KEY
// are set. Both the logger (write) and the report page (read) go through here.

import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface StoredEvent {
  sessionId: string | null;
  profileId: string | null;
  type: string;
  payload: Record<string, unknown>;
  ts: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

const LOG_DIR = path.join(process.cwd(), "data");
const LOG_FILE = path.join(LOG_DIR, "events.jsonl");

export function storeBackend(): "supabase" | "local-file" {
  return useSupabase ? "supabase" : "local-file";
}

export async function appendEvent(e: StoredEvent): Promise<void> {
  if (useSupabase) {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY as string,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        session_id: e.sessionId,
        profile_id: e.profileId,
        event_type: e.type,
        payload: e.payload,
        ts: e.ts,
      }),
    });
    return;
  }

  await mkdir(LOG_DIR, { recursive: true });
  await appendFile(
    LOG_FILE,
    JSON.stringify({ ...e, receivedAt: new Date().toISOString() }) + "\n",
    "utf8",
  );
}

interface SupabaseRow {
  session_id: string | null;
  profile_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  ts: string;
}

export async function readEvents(): Promise<StoredEvent[]> {
  if (useSupabase) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?select=session_id,profile_id,event_type,payload,ts&order=ts.asc&limit=100000`,
      {
        headers: {
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as SupabaseRow[];
    return rows.map((r) => ({
      sessionId: r.session_id,
      profileId: r.profile_id,
      type: r.event_type,
      payload: r.payload ?? {},
      ts: r.ts,
    }));
  }

  let raw = "";
  try {
    raw = await readFile(LOG_FILE, "utf8");
  } catch {
    return [];
  }
  const out: StoredEvent[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line);
      out.push({
        sessionId: o.sessionId ?? null,
        profileId: o.profileId ?? null,
        type: o.type,
        payload: o.payload ?? {},
        ts: o.ts,
      });
    } catch {
      /* skip malformed line */
    }
  }
  return out;
}
