-- Pre/post questionnaire responses that wrap a prototype session. Written by the
-- server route /api/survey via the Supabase REST API (service key preferred, anon
-- fallback). Shares session_id with public.events so a participant's answers and
-- their clicks join on one id. Run once in the Supabase SQL editor.

create table if not exists public.survey_responses (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null,
  survey       text not null,              -- 'pre' | 'post'
  screened_out boolean default false,
  answers      jsonb not null,             -- { question_id: value, ... } (multi = array)
  created_at   timestamptz default now()
);

create index if not exists survey_responses_session_idx
  on public.survey_responses (session_id);

-- RLS: anon may insert only. No client read/update/delete (analysis reads use the
-- service key, which bypasses RLS).
alter table public.survey_responses enable row level security;

create policy survey_responses_anon_insert
  on public.survey_responses
  for insert
  to anon
  with check (true);
