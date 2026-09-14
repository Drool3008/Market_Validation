> **SUPERSEDED — do not use for validation.** Build spec. Its repo structure and data model no longer match the code. See README sections 8, 11, 15.
> Folded into `README.md`. Kept only for history.

# BUILD SPEC — Netflix Fake-Door Validation App

This is the implementation spec for Claude Code. A basic version of this project
already exists; **do not rebuild from scratch.** First audit what is there against
this spec (see Section 1), then fill the gaps phase by phase. Every phase has a
**Definition of Done (DoD)** — treat those checkboxes as acceptance criteria.

The product is a high-fidelity Netflix look-alike web app that plants two proposed
features, instruments every click, and produces a behavioral-data report. It is a
**fake-door / wizard-of-oz** test: the surface looks real; the machinery is mocked
wherever mocking does not change the click signal. Nothing here streams real video.

**The feature under test:**

- **Watch While You Eat.** A home-page row that surfaces the most-loved episode of
  shows the user already watches, to kill choice paralysis at mealtime. It must ship
  and test independently.

---

## 1. How to Use This Spec

1. **Audit before building.** Read the existing tree, list installed deps, and check
   what exists against Section 4 (structure), Section 5 (data model), Section 6
   (events). Produce a short gap list before writing code.
2. **Build by phase** (Section 9). Do not skip; each phase leaves the app runnable.
3. **Check each phase against its DoD** — verifiable by running the app, querying the
   DB, or reading the events table.
4. **Never fake the signal.** UI may be mocked; click/event tracking must be real and
   correct. If a choice would corrupt the behavioral data, stop and flag it.
5. **Keep a JSON seed fallback** so the demo runs even if the crawler or Supabase is
   unavailable during a test session.

---

## 2. Tech Stack

Suggested current-stable versions — pin exact versions in `package.json` at Phase 0.

- **Framework:** Next.js (App Router) + React + TypeScript
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion (card hover-scale, row transitions) — only where it
  matches Netflix motion
- **Backend / DB:** Supabase (hosted Postgres) — catalog, demo profiles, append-only
  events log
- **Hosting:** Vercel (responsive web: desktop, tablet, mobile browser)
- **Crawler:** standalone Node/TS (fetch + Cheerio; Playwright only if needed) —
  offline one-shot, not in the request path
- **Analytics:** custom event logging into a Supabase table; report is plain SQL

**Not used:** native mobile app, TV app, real recommendation ML, real video
streaming, real-time sync backend.

---

## 3. Environment & Setup

Create `.env.local` (mirror in Vercel). Never commit secrets.

```
NEXT_PUBLIC_SUPABASE_URL=            # Supabase project URL (client-safe)
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # anon key (client-safe, RLS-guarded)
SUPABASE_SERVICE_ROLE_KEY=           # server/crawler only — never expose to client
```

DoD: `npm run dev` serves; `npm run build` passes; empty Vercel deploy is green;
`.env.example` documents every variable with no real values.

---

## 4. Repo Structure

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # profile gate ("Who's watching?")
│   ├── home/page.tsx             # home with catalog rows + WWYE row
│   ├── title/[id]/page.tsx       # title/episode page
│   ├── watch/[id]/page.tsx       # mock player + heatmap scrubber
│   └── report/page.tsx           # internal report view (SQL-backed)
├── components/                   # Row, TitleCard, MoodChips, HeatmapScrubber, ...
├── lib/
│   ├── supabase.ts               # typed Supabase client (client + server)
│   ├── analytics.ts              # client event logger (batches → events table)
│   ├── heatmap.ts                # synthetic best-moment curve generator
│   └── profiles.ts               # demo profile definitions
├── crawler/
│   ├── crawl.ts                  # SeriesGraph/IMDb per-episode rating scrape
│   └── seed.ts                   # write catalog → Supabase and/or JSON
├── data/catalog.seed.json        # committed fallback catalog
├── supabase/migrations/          # SQL: shows, episodes, demo_profiles, events
├── .env.example
└── package.json
```

---

## 5. Data Model (Supabase / Postgres)

Migrations under `supabase/migrations/`. Enable RLS; `events` accepts anon inserts,
everything else is client-read-only.

```sql
create table shows (
  id text primary key, title text not null, year_start int,
  genre text[], poster_url text, created_at timestamptz default now()
);
create table episodes (
  id text primary key, show_id text not null references shows(id),
  season int not null, episode int not null, title text,
  rating numeric, is_most_loved boolean default false,
  mood_tags text[], runtime_min int, created_at timestamptz default now()
);
create table demo_profiles (
  id text primary key, name text not null, show_ids text[] not null,
  created_at timestamptz default now()
);
create table events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null, profile_id text, event_type text not null,
  payload jsonb default '{}'::jsonb, created_at timestamptz default now()
);
create index on events (event_type);
create index on events (session_id);
create index on events (created_at);
```

DoD: migrations apply to a fresh project; seed populates `shows`/`episodes`/
`demo_profiles`; `events` accepts a browser anon insert and rejects client
update/delete.

---

## 6. Event Schema — the core of the test

Every interaction fires exactly once with the payload shown. Generic rows also fire
`row_impression`/`row_click` so WWYE has a baseline.

**Watch While You Eat:** `session_start` (device, viewport) · `profile_selected`
(profile_id) · `home_view` · `row_impression` (row_id, is_feature) · `row_click`
(row_id, is_feature — PRIMARY) · `card_hover` (show_id, episode_id) · `title_open`
(show_id, episode_id) · `scrubber_hover` (episode_id, position) · `scrubber_interact`
(episode_id, timestamp) · `play_click` (episode_id, from=start|best_moment) ·
`feature_dwell` (ms) · `bounce` (seconds).

**Logger contract (`lib/analytics.ts`):** thin batching wrapper. `track(type,
payload)` enqueues; flush on interval and on `visibilitychange`/`beforeunload`. One
`session_id` (uuid) per visit. No third-party analytics framework. Never block the UI
on a network write.

DoD: a scripted click-through produces the exact expected rows in order with correct
payloads; `is_feature` distinguishes WWYE from generic rows; nothing missing or
double-fired.

---

## 7. Feature Specs & Acceptance Criteria

### 7.1 Watch While You Eat

Personalized surfacing from the profile's `show_ids`; best-episode (`is_most_loved`)
per show; mood chips filter by `mood_tags`; start-anywhere with a synthetic
best-moment heatmap (hover curve+thumbnail, click seeks the mock player).

DoD:
- [ ] WWYE row renders on home, populated from the chosen profile, best-episode per show
- [ ] Mood chips filter the row correctly
- [ ] Title/episode page shows start-from-beginning vs. best-moment choice
- [ ] Heatmap scrubber: hover shows curve+thumbnail, click seeks mock player
- [ ] Every interaction fires the Section 6 WWYE events with correct payloads
- [ ] Generic rows also fire impression/click (baseline exists)
- [ ] Works responsively on desktop, tablet, and mobile-browser widths

---

## 8. Supporting Components

- **Crawler.** Offline one-shot; ~20–40 popular shows with per-episode ratings;
  derive `is_most_loved`; write to Supabase + `data/catalog.seed.json`. Respect
  `robots.txt`, rate-limit, cache. Fall back to
  the seed if a source blocks scraping — never hard-fail the demo.
- **Heatmap (`lib/heatmap.ts`).** Deterministic synthetic curve per episode, one
  clear peak = "most-loved scene."
- **Demo profiles (`lib/profiles.ts`).** Sitcom Unwinder, Crime Junkie, Prestige
  Bingeing, Comfort Rewatcher — each mapping to `show_ids`; choice logs
  `profile_selected` and segments the report.
- **Report (`app/report/page.tsx`).** SQL over `events`: WWYE funnel (impression →
  row_click → title_open → play → scrubber), feature-vs-baseline CTR, dwell,
  skip/bounce. Segment by profile and device.

---

## 9. Phased Build Plan (with DoD)

- **Phase 0 — Setup.** DoD: dev serves, build passes, empty deploy green.
- **Phase 1 — Netflix clone shell.** Profile gate, home, title page, mock player,
  placeholder data. DoD: pixel-close look; all routes navigable; responsive.
- **Phase 2 — Catalog crawl.** Crawler + seed; wire to real catalog; JSON fallback.
  DoD: catalog populated with real ratings; `is_most_loved` derived; fallback works.
- **Phase 3 — Watch While You Eat.** DoD: Section 7.1 checklist green.
- **Phase 4 — Best-moment heatmap.** DoD: scrubber interactions fire correct events.
- **Phase 5 — Instrumentation.** Wire every Section 6 event; verify
  rows land in Supabase. DoD: Section 6 checklist green.
- **Phase 6 — Deploy & collect.** Lock thresholds, deploy, recruit, collect. DoD:
  production URL live; a real session produces a complete event stream.
- **Phase 7 — Analyze & report.** DoD: `/report` renders live numbers from `events`.

**Gate:** do not start Phase 6 until success thresholds are set (see Open Items).

---

## 10. Success Thresholds (report logic)

Pre-register before collecting; do not move goalposts after.

- **Watch While You Eat — validated** if all of: WWYE row CTR ≥ **1.5×** the
  session's average generic-row CTR; ≥ **X%** of sessions produce a `row_click`;
  median dwell ≥ **Y seconds** among clicked sessions. Weak if CTR beats baseline but
  dwell is low; not validated if CTR ≤ baseline or bounce dominates.

`X`, `Y`, and the CTR multiple are placeholders — see Open Items.

---

## 11. Legal & Ethics (build-relevant)

- Non-commercial academic mock; reproduces Netflix's visual language only to make the
  fake door honest. Not distributed or claimed as Netflix. Trademarks belong to
  Netflix.
- Crawled ratings seed a small academic catalog only; crawler respects `robots.txt`,
  rate-limits, caches, runs offline; falls back to the seed if disallowed.
- Tester data is pseudonymous (`session_id` only). No PII. Show a one-line notice that
  this is a research prototype and interactions are logged.

---

## Open Items (decide before Phase 6)

- Concrete thresholds: `X%`, `Y seconds`, CTR multiple.
- WWYE row placement (and whether to A/B two placements).
- Final profile set and catalog list (~20–40 shows).
- Tester count and recruitment channel.
- Optional one-question exit micro-survey.
- Final feature name.