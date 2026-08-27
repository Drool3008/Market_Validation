-- Events table for the validation study. Only the server (service key) writes
-- and reads it, so RLS is left off. Run this once in the Supabase SQL editor.

create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  session_id   text,
  profile_id   text,
  event_type   text not null,
  payload      jsonb not null default '{}'::jsonb,
  ts           timestamptz not null default now(),
  received_at  timestamptz not null default now()
);

create index if not exists events_type_idx    on public.events (event_type);
create index if not exists events_session_idx on public.events (session_id);
create index if not exists events_ts_idx       on public.events (ts);
