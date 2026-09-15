# Watch While You Eat — Netflix Fake-Door Validation

> Working title. Naming is deliberately open (see [Open Questions](#12-open-questions--risks)).

A market-validation project. We build a high-fidelity Netflix look-alike web app,
plant one new feature inside it ("Watch While You Eat"), instrument every click,
put it in front of real testers, and measure whether people actually engage with
the feature or ignore it. The output is not a shippable product. The output is a
**report** that answers one question with behavioral data:

> **If Netflix added a "Watch While You Eat" row that surfaces the most-loved
> episodes of shows you already watch, would people click it, browse it, and stick
> with it, or skip it and do something else?**

This is a **fake-door test**. Netflix is not integrating anything. We are
simulating the experience convincingly enough that the click data is real, then
reporting on it.

**This file is the single source of truth.** It carries the hypothesis, the
architecture, the shipped event schema, the shipped questionnaire verbatim, the
test protocol, and the verification procedure. Nothing else needs to be read
alongside it.

---

## Quickstart

Prerequisites: **Node 22** (see `.nvmrc`), **pnpm 11** (`corepack enable`).

```bash
pnpm install
cp .env.local.example .env.local    # then fill in values (see table below)
pnpm dev                            # http://localhost:3000
```

Walk the full participant flow from `http://localhost:3000/survey/pre`.

**Environment (`.env.local`):**

| Var | Needed for | Notes |
|---|---|---|
| `SUPABASE_URL` | events + survey storage | Supabase project URL. Blank: events fall back to `data/events.jsonl`, surveys no-op. |
| `SUPABASE_SERVICE_KEY` | events + survey storage | `service_role` key, **server-only**, never expose to the browser. |
| `TMDB_BEARER` | catalog crawler only | Only for re-running `pnpm crawl`. The catalog is baked into the repo, so the app runs without it. Not set on Vercel, and does not need to be. |

**Commands:**

| Command | Does |
|---|---|
| `pnpm dev` | Run locally with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm check` | Study invariants self-check (feature-row size, survey gating) |
| `pnpm crawl` | Re-scrape the catalog (offline, one-shot, needs `TMDB_BEARER`) |

**Database:** apply the migrations in `supabase/migrations/`, `0001_events.sql` then
`0002_survey_responses.sql`, in the Supabase SQL editor, in order.

**Deploy:** hosted on **Vercel** (project `market-validation`). Push to `main`
auto-deploys. Set `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in the Vercel project env.
Smoke test after deploy: `/report` shows `store: supabase`.

**Key routes:**

| Route | Is |
|---|---|
| `/survey/start` | Feature-blind intro: task, duration, consent, meal scenario. **Give participants this link.** |
| `/survey/pre` | Pre-visit form, mints the `session_id`, screens participants |
| `/?sid=<session_id>` | Profile gate ("Who's watching?"), seeds the session id |
| `/browse` | The Netflix home: billboard, rows, WWYE row, nav, search, detail modal |
| `/watch/[episodeId]` | Mock player with the best-moment heatmap scrubber |
| `/survey/post?sid=<session_id>` | Post-visit form |
| `/survey/thanks` | Closing screen |
| `/report` | Internal validation dashboard, live from the event store |
| `/api/events` | Event sink (POST) |
| `/api/survey` | Survey sink (POST) |

---

## Table of Contents

1. [The Hypothesis](#1-the-hypothesis)
2. [Background & Problem](#2-background--problem)
3. [The Feature: How It Works](#3-the-feature-how-it-works)
4. [Fake-Door Scope: What Is and Is Not Real](#4-fake-door-scope-what-is-and-is-not-real)
5. [Success Metrics & Pre-Registered Thresholds](#5-success-metrics--pre-registered-thresholds)
6. [System Architecture](#6-system-architecture)
7. [Data Pipeline](#7-data-pipeline)
8. [Instrumentation & Event Schema](#8-instrumentation--event-schema)
9. [Demo Profiles & Personalization](#9-demo-profiles--personalization)
10. [UX Flows & Screens](#10-ux-flows--screens)
11. [Build Status (Phased)](#11-build-status-phased)
12. [Open Questions & Risks](#12-open-questions--risks)
13. [The Final Report Structure](#13-the-final-report-structure)
14. [Tech Stack & Why](#14-tech-stack--why)
15. [Repo Structure](#15-repo-structure)
16. [Legal & Ethics](#16-legal--ethics)
17. [Participant Task Flow](#17-participant-task-flow)
18. [The Questionnaire (shipped, verbatim)](#18-the-questionnaire-shipped-verbatim)
19. [Claim Map & Analysis Mapping](#19-claim-map--analysis-mapping)
20. [Test Plan & Session Protocol](#20-test-plan--session-protocol)
21. [Verifying This Build](#21-verifying-this-build)

---

## 1. The Hypothesis

**Primary hypothesis (H1):** Users presented with a personalized "Watch While You
Eat" row will click into it at a rate meaningfully higher than they click a generic
Netflix content row, and once inside they will spend real time browsing rather than
bouncing.

**What we are measuring, in order (the funnel):**

1. Do they **click** the feature at all? (top-of-funnel appeal)
2. After clicking, do they **browse** the shows/episodes inside it? (depth)
3. If they browse, **how much time** do they spend on the feature? (dwell)
4. Or do they **skip it entirely** and go do something else? (bounce)

**Null hypothesis (H0):** The feature performs no better than a generic row and/or
users bounce immediately. If H0 holds, the idea is not validated.

Thresholds that decide validated vs. not-validated are defined up front in
[Section 5](#5-success-metrics--pre-registered-thresholds) so the result is not
massaged after the fact.

---

## 2. Background & Problem

The insight this is built on:

- When you have good food in front of you, you want good, low-friction
  entertainment to go with it. Something familiar and enjoyable, not a gamble.
- Many people default to YouTube in that moment because it is fast. If they open
  Netflix, a large chunk of the session is spent **browsing the catalog** rather
  than watching. Choice paralysis kills the moment.
- Netflix's home page already merchandises with contextual rows ("Continue
  Watching", "Top Picks", "US TV Shows", "Growing Up as a Millennial", etc.).
  A "Watch While You Eat" row is the same shelf mechanic aimed at a specific,
  high-intent moment.

The bet: a row that removes the "what do I put on" decision by surfacing the
**best, already-enjoyed episodes** of shows the user already watches will convert
that hesitation into a fast, satisfying choice.

We target **Netflix specifically** and **TV shows first** (episodic, low
commitment, easy to rewatch a single great episode). Movies are a possible
extension, not the initial scope.

---

## 3. The Feature: How It Works

The "Watch While You Eat" row lives on the Netflix home page, among the other
catalog rows, and behaves like this:

1. **Personalized surfacing.** The row is populated from the shows the user has
   watched/browsed. Ordering favors shows the user engages with most.
   (In the demo, "watch history" comes from a pre-seeded profile, see
   [Section 9](#9-demo-profiles--personalization).)

2. **Best-episode picks.** For each surfaced show, it suggests the **single episode
   most enjoyed by a lot of people** (highest-rated), not a random one. The
   "enjoyed by a lot of people" signal comes from crawled per-episode rating data
   (see [Section 7](#7-data-pipeline)). Implementation:
   `bestEpisodeForShow()` in `src/data/catalog.ts` reduces a show's episodes to the
   max `rating`. There is no stored `is_most_loved` flag, it is derived at runtime.

3. **Mood / emotion categories.** Because "the right thing to eat to" is
   mood-dependent, the feature offers mood sub-filters. Shipped moods: `funny`,
   `cozy`, `tense`, `feelgood`, `emotional`, `mindbender`. In the demo these are
   curated tags layered on top of the crawled episodes (wizard-of-oz), not a real
   emotion classifier. Filtering happens in `buildFeatureRow()`
   (`src/lib/feature.ts`).

4. **Start-anywhere with a "best moment" graph.** The user does not have to rewatch
   the whole episode. On the detail modal they get two options:
   - **Start from the beginning**, or
   - Use a **YouTube-style engagement graph** over the scrubber. Hovering (desktop)
     or tapping (touch) the timeline reveals a curve peaking at the most-loved
     scene plus an episode thumbnail, and commits playback to that moment.
     Touch was added after pilot testing: phones have no hover, so the target
     audience could not reach the mechanic at all. A tap seeks to the tapped
     point, the same decision a click makes, so `scrubber_interact.t` means "the
     moment they chose" on both. Peak-jumping stays the separate
     "Jump to the Best Moment" button's job.

   The heatmap curve is **dummy/synthetic data** in the demo (confirmed scope),
   shaped to look believable, with a clear peak at the "best moment".

   **This mechanic is exclusive to the WWYE feature.** Titles opened from a generic
   row get a standard Netflix-style detail modal with no heatmap, which is what
   preserves an uncontaminated control path. See
   [Section 10](#10-ux-flows--screens).

The point of the demo is not real streaming. It is to make all of the above feel
real enough that the tester's clicks are honest signal.

---

## 4. Fake-Door Scope: What Is and Is Not Real

This is a **wizard-of-oz** fake door: the surface looks fully functional, the
machinery behind it is mocked where mocking does not change the behavioral signal.

| Element | Real | Mocked / Dummy | Why |
|---|---|---|---|
| Netflix-identical UI (home, rows, hover, detail modal, nav, search) | Real | | The look has to be honest or the test is invalid |
| Catalog: shows, episodes, ratings, "most-loved" ranking | Real (crawled) | | The "best episode" claim must be credible |
| "Watch While You Eat" row | Real UI | | Behavior is what we measure |
| Mood filters | Real UI | Mood tags curated | Tag source does not affect the click behavior |
| Personalization / watch history | | Pre-seeded demo profiles | No Netflix data access, profiles simulate history |
| Best-moment heatmap graph | Real UI | Synthetic curve data | Confirmed dummy, per-scene data does not exist cleanly |
| "New & Hot" ordering | Real UI | `show.year` descending as a recency proxy | No recency field in the seed data |
| Actual video playback | | Mock player (poster + trailer + fake timeline) | We measure intent and browse, not watching |
| My List / thumbs ratings | Real UI | `localStorage` only, not persisted server-side | Realism affordance, the events are what we keep |
| Click / dwell / browse tracking | Real | | This is the entire point |

**Not built:** native mobile apps (APK), TV app, real recommendation ML, real
video streaming, any Netflix account integration.

---

## 5. Success Metrics & Pre-Registered Thresholds

All events are captured via custom event logging (see
[Section 8](#8-instrumentation--event-schema)). The `/report` page is built from these.

**The funnel (primary):**

| Stage | Event | Question it answers |
|---|---|---|
| Row impression | `row_impression` (feature scrolls into view) | Did they even see it? |
| **Row click** | `row_click` (opened the feature) | **Do they click it?** (H1 core) |
| Title open | `title_open` | Do they browse inside it? |
| Play / start | `play_click` | Do they commit to watching? |
| Scrubber use | `scrubber_interact` | Do they use the signature "best moment" jump? |

**Supporting metrics:**

- **Feature dwell time** (`feature_dwell`, `ms` payload): time spent inside the
  feature per session. Median and distribution.
- **Skip / bounce rate**: sessions that saw the row but never clicked it, or left
  home within N seconds without engaging (`bounce`, with a `featureEngaged` flag).
- **Comparison baseline**: click-through of the "Watch While You Eat" row vs. the
  average of the other (generic) rows in the same session. This controls for
  novelty and general clickiness.
- **Path comparison**: every relevant event carries a `path` of `"wwye"` or
  `"browse"`, so the report computes funnel, median time-to-first-play,
  tiles-opened-before-start, and give-up rate separately per path.

**Pre-registered success thresholds.** These live in code at
`src/lib/report-config.ts` and are read by `/report`, they are not hard-coded into
the analysis after the fact:

```ts
export const THRESHOLDS = {
  ctrMultiple: 1.5,          // feature CTR must beat avg generic-row CTR by this
  minSessionsClickedPct: 0.3, // >= 30% of sessions must click into the feature
  minMedianDwellSec: 20,      // median dwell (s) among sessions that clicked
};
```

- **Validated** if all three hold.
- **Weak / inconclusive** if CTR beats baseline but dwell is low (curiosity, not
  utility).
- **Not validated** if CTR is at or below baseline, or bounce dominates.

> **GATE, still open.** The three numbers above are the **defaults committed in
> code, not agreed values**. They must be confirmed (or changed) with the team and
> written down **before recruiting testers**. Changing them after collection
> defeats the point of a pre-registered test. This is the one blocker on starting
> data collection.

---

## 6. System Architecture

```
                    ┌──────────────────────────────┐
                    │  Tester (desktop or mobile   │
                    │  browser, responsive web)    │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼────────────────┐
                    │  Next.js / React app (Vercel) │
                    │  - Netflix-clone UI           │
                    │  - "Watch While You Eat" row  │
                    │  - Mock player + heatmap      │
                    │  - Pre/post survey forms      │
                    │  - Event logger (client)      │
                    └───┬───────────┬───────────────┘
                        │           │
       reads catalog    │           │  POST /api/events
       (static, bundled)│           │  POST /api/survey
                        ▼           ▼
       ┌──────────────────┐   ┌───────────────────────────────┐
       │ src/data/        │   │  Supabase (Postgres)          │
       │  catalog.seed    │   │  - events (append-only)       │
       │  .json           │   │  - survey_responses           │
       │ (89 shows,       │   └───────────────▲───────────────┘
       │  285 episodes)   │                   │ read (service key)
       └────────▲─────────┘                   │
                │ seeds                ┌──────┴──────┐
       ┌────────┴──────────────┐       │ /report     │
       │ Crawler (Node/TS,     │       │ dashboard   │
       │ offline, TMDB)        │       └─────────────┘
       └───────────────────────┘
```

Note what this diagram corrects: **the catalog does not live in Supabase.** It is a
static JSON file bundled into the app (`src/data/catalog.seed.json`, loaded through
`src/data/catalog.ts`). Supabase holds only the two study tables, `events` and
`survey_responses`. There is no `shows`, `episodes`, or `demo_profiles` table.
Demo profiles are also static, in `src/data/profiles.ts`.

- **Frontend + hosting:** Next.js (App Router) on Vercel. Responsive so one build
  covers desktop web, tablet, and mobile browser viewports. No native app.
- **Backend / storage:** Supabase (hosted Postgres) for the append-only events log
  and the survey responses. Written through server routes over the Supabase REST
  API, no `supabase-js` SDK.
- **Crawler:** a standalone offline Node/TypeScript script that runs before the
  demo and writes the seed JSON. It does not run at request time.
- **Report:** `/report`, a server-rendered dashboard reading the event store live on
  each request.

---

## 7. Data Pipeline

### 7.1 Catalog crawl (real data)

**Source:** TMDB, via `crawler/crawl.ts` (needs `TMDB_BEARER`). Per-show metadata,
episode lists, and per-episode ratings.

**Shipped catalog:** **89 shows** and **285 episodes** in
`src/data/catalog.seed.json`.

| Entity | Fields |
|---|---|
| show | `id`, `title`, `kind`, `year`, `genres`, `color`, `description`, `posterUrl`, `backdropUrl`, `trailers` |
| episode | `id`, `showId`, `season`, `number`, `title`, `rating`, `runtime`, `moods`, `synopsis`, `stillUrl` |

**Derived, not stored:** the "most-loved" episode per show is computed at runtime by
`bestEpisodeForShow()` (max `rating`). There is no `is_most_loved` column.

**Feature row size:** each demo profile carries 14 shows, so the WWYE row renders 14
picks before mood filtering. Pilot testers shown a ~4-item row judged the thin set
rather than the concept, which is a measurement problem, not a taste finding.
`pnpm check` asserts every profile stays at 10 or more.

**Output:** a static JSON seed committed to the repo. The app never depends on the
crawler being live, and the crawler never runs in the request path.

**Crawler behavior:** respect `robots.txt`, rate-limit requests, cache
aggressively, run offline/one-shot. See [Section 16](#16-legal--ethics).

### 7.2 Mood tags (curated layer)

Rating data does not carry mood. Mood categories are a **curated/dummy tagging
layer** on episodes, assigned via `crawler/mood.ts`. All 285 episodes carry at least
one tag. Shipped distribution:

| Mood | Episodes |
|---|---|
| `tense` | 200 |
| `emotional` | 155 |
| `mindbender` | 109 |
| `funny` | 96 |
| `feelgood` | 92 |
| `cozy` | 67 |

This is acceptable wizard-of-oz scope: the tag source does not affect what we
measure (the click behavior).

### 7.3 Best-moment heatmap (dummy data)

Confirmed dummy. `src/lib/heatmap.ts` generates a **deterministic synthetic
engagement curve** per episode: a smooth series with one clear peak, labeled the
"most-loved scene". Hover shows the curve plus a thumbnail, click seeks the mock
player to that timestamp. No real per-scene data is fetched.

---

## 8. Instrumentation & Event Schema

Custom event logging. One append-only table drives the entire report.

### 8.1 `events` table (`supabase/migrations/0001_events.sql`)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (pk) | `gen_random_uuid()` |
| `session_id` | `text` | one per tester visit, joins to `survey_responses` |
| `profile_id` | `text` | which demo profile was chosen |
| `event_type` | `text not null` | see below |
| `payload` | `jsonb not null default '{}'` | event-specific detail |
| `ts` | `timestamptz not null default now()` | client-supplied when available |
| `received_at` | `timestamptz not null default now()` | server receipt time |

Indexes on `event_type`, `session_id`, `ts`. **RLS is off**: only the server
(service key) reads or writes this table.

### 8.2 `survey_responses` table (`supabase/migrations/0002_survey_responses.sql`)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (pk) | |
| `session_id` | `uuid not null` | joins to `events.session_id` |
| `survey` | `text not null` | `'pre'` or `'post'` |
| `screened_out` | `boolean default false` | true if a screener ended the study |
| `answers` | `jsonb not null` | `{ question_id: value }` |
| `created_at` | `timestamptz default now()` | |

RLS **on**: anon may `insert` only. Analysis reads use the service key, which
bypasses RLS.

### 8.3 Event types as shipped

Every event is fired through `track()` in `src/lib/analytics.ts`. Events that can
occur on either path carry `path: "wwye" | "browse"`, derived by `pathFor(rowId)`,
which is what makes the feature-vs-control comparison possible.

| `event_type` | Fired when | Payload as shipped |
|---|---|---|
| `session_start` | app loads | `ua`, `w` (viewport width) |
| `profile_selected` | tester picks a demo profile | `profileId` |
| `home_view` | home rendered | `profileId` |
| `row_impression` | a row scrolls into viewport | `rowId`, `isFeature`, `count` |
| `row_click` | user opens a title from a row (PRIMARY) | `rowId`, `isFeature`, `episodeId`, `path` |
| `card_hover` | hover a title card | `showId`, `episodeId`, `rowId`, `path` |
| `title_open` | detail modal opens | `showId`, `episodeId`, `source`, `path` |
| `scrubber_hover` | hover the heatmap timeline | `episodeId`, `t` |
| `scrubber_interact` | click/seek via heatmap | `episodeId`, `t` |
| `play_click` | press play (mock) | `episodeId`, `from`, `t`, `source`, `path` |
| `feature_dwell` | detail modal closes | `episodeId`, `ms`, `path` |
| `bounce` | leaves the page | `seconds`, `featureEngaged` |
| `nav_click` | top-nav destination chosen | `destination`, `path: "browse"` |
| `search_query` | search executed | `query`, `resultCount`, `path: "browse"` |
| `search_result_click` | search result opened | `query`, `episodeId`, `path: "browse"` |
| `mylist_add` / `mylist_remove` | My List toggled | `showId`, `episodeId`, `path` |
| `rating` | thumbs up/down set | `showId`, `episodeId`, `value`, `path` |

Generic rows also fire `row_impression` / `row_click` so the **baseline** the
feature is measured against exists in every session.

**Client logger contract:** `track(type, payload)` posts to `/api/events`. One
`session_id` per visit, held in `sessionStorage`, seeded from `?sid=` when present.
Never blocks the UI on a network write.

### 8.4 Exposure flags (not events)

The post survey must not ask people to rate things they never met. What the
participant actually encountered is recorded in `sessionStorage` by
`src/lib/exposure.ts`, alongside the session id, **not** in the `events` table: the
survey needs it synchronously at render time and the event schema is frozen.

| Flag | Set when |
|---|---|
| `clickedFeature` | A title is opened from the Watch While You Eat row |
| `sawHeatmap` | The best-moment graph is rendered in front of them |
| `usedHeatmap` | They hover, tap, or key into the graph |

The record is **created empty at prototype entry** (the profile gate). That is what
separates "we know they did not do it" (record exists, flag false) from "we have no
idea" (no record: direct link to `/survey/post`, fresh tab, cleared storage). No
record falls back to asking every question, so a guardrail answer is never silently
dropped. See [Section 18.3](#183-conditional-questions).

> **Known operational hazard.** `src/app/api/events/route.ts` wraps the store write
> in `catch {}` and returns `{ok: true}` regardless. A Supabase outage, a paused
> project, or a rotated key therefore produces **silent** event loss: the
> participant sees nothing wrong and the session is gone. Before each batch of
> sessions, confirm the `events` row count actually increased. Do not rely on the
> API response.

---

## 9. Demo Profiles & Personalization

No real Netflix history exists, so personalization is driven by **pre-seeded demo
profiles** (`src/data/profiles.ts`). On launch the tester picks a Netflix-style
profile, each profile has a fixed fake watch history (`historyShowIds`) that drives
the feature row.

| Profile | Shows | Feature row emphasis |
|---|---|---|
| The Sitcom Unwinder | 14 | cozy / funny best episodes |
| The Crime Junkie | 14 | tense / gripping best episodes |
| The Prestige Bingeing | 14 | dramatic best episodes |
| The Comfort Rewatcher | 14 | feel-good best episodes |

Every entry is on-persona: the lists are sized for a realistic shelf, never padded
with low-rated or off-profile titles. A mood chip that matches nothing in a given
profile (no cozy picks for a crime fan) shows the row's empty-state message, which
is intended.

Each profile maps to a set of shows. The "Watch While You Eat" row is filled with
the **best episode** of each of those shows, filterable by mood, sorted by rating
descending. The same history also drives the Continue Watching row. The profile
choice is logged (`profile_selected`) and segments the report.

---

## 10. UX Flows & Screens

Every screen matches Netflix's visual language closely (layout, typography, card
hover-scale, dark theme, red accent).

1. **Profile gate (`/`)** — Netflix "Who's watching?" grid with the demo personas.
   Seeds `session_id` from `?sid=` before any event fires.
2. **Home (`/browse`)** — top nav (Home, TV Shows, Movies, New & Hot, My List),
   search, hero billboard with trailer, then stacked catalog rows: Continue
   Watching (with resting progress bars), the **"Watch While You Eat"** row, a
   numbered Top 10 row, and genre rows. Rows have scroll arrows, cards have hover
   popovers with My List and thumbs.
3. **Nav views** — TV Shows / Movies / New & Hot / My List render as filtered grids
   (`GridView`). "New & Hot" uses `show.year` descending as a recency proxy.
4. **Search** — `SearchOverlay`, logs the query, the result count, and any result
   click.
5. **Detail modal, two branches.** This split is the validity fix, do not collapse it:
   - Opened from the **WWYE row**: best-moment engagement graph plus
     "Jump to best moment".
   - Opened from **any other row**: standard Netflix details (Play, My List,
     thumbs, episode list with season selector, **no heatmap**).
   This keeps normal browsing an uncontaminated control for the comparison.
6. **Mock player (`/watch/[episodeId]`)** — poster/trailer plus fake timeline and
   the heatmap scrubber. Seeking fires `scrubber_interact`. No real video.

**Placement note:** where the feature row sits on the home page affects
click-through. Fix a placement for the main test, optionally A/B two placements if
sample size allows. Decide before launch.

---

## 11. Build Status (Phased)

**Original build phases, all complete:**

| Phase | Scope | State |
|---|---|---|
| 0 | Setup: Next.js + TS + Tailwind, Supabase, Vercel skeleton | done |
| 1 | Netflix clone shell: profile gate, home, detail, mock player | done |
| 2 | Catalog crawl, 89 shows / 285 episodes, committed JSON seed | done |
| 3 | Watch While You Eat row, best-episode selection, mood filters | done |
| 4 | Best-moment heatmap, hover curve, click-to-seek | done |
| 5 | Instrumentation: events table, client logger, every event wired | done |
| 6 | Deploy & collect | **deployed, collection not started** |
| 7 | Analyze & report: `/report` renders live numbers | dashboard done, no data yet |

**Netflix-parity phases (shipped after the original plan):**

| Phase | Scope | Commit |
|---|---|---|
| A | Validity fix: detail modal split so non-feature titles get no heatmap, `path` tag added to events | `71da069` |
| B | Realism: functional nav, filtered grid views, search, nav/search events | `71da069` |
| C | Tier-2 fidelity: My List, thumbs ratings (`src/lib/prefs.ts`), resting progress bars, numbered Top 10, row arrows | `2e7789d` |
| D | Path-level metrics: `/report` WWYE-vs-browse funnel, median time-to-first-play, tiles-opened-before-start, give-up rate | `2e7789d` |

No further build phases are planned. Watch With Friends (P1/WWF) was dropped from
scope and is not a gap.

**Gate before Phase 6 collection:** lock the
[Section 5](#5-success-metrics--pre-registered-thresholds) thresholds.

---

## 12. Open Questions & Risks

**Decisions still needed before launch:**

- Confirm or change the concrete success thresholds in `src/lib/report-config.ts`
  (currently 1.5x, 30%, 20s) and write the agreed numbers down. **Blocking.**
- Feature row **placement** on the home page, and whether to A/B two placements.
- Number of testers, recruitment channel, and which session modes to resource.
- Final feature name (not "Watch While You Eat").

**Risks:**

- **Novelty bias.** A new row gets clicks because it is new, not because it is
  useful. Mitigated by the baseline comparison and by weighting dwell over CTR.
- **Small / biased sample.** A convenience sample skewed young and student-heavy is
  not representative. The report must state sample composition honestly.
- **Realism gap.** Mock player with no real video may suppress `play_click`. We
  lean on browse/dwell as the truer signal, and say so.
- **Silent event loss.** See the hazard note in
  [Section 8](#8-instrumentation--event-schema). Verify row counts between sessions.
- **Session-id join breakage.** See [Section 17](#17-participant-task-flow). Build
  and lint do not catch it.
- **Placement confound.** Where the row sits can dominate the result. Hold it
  constant or A/B it explicitly.
- **Crawl fragility / ToS.** Rating sources can change or block scraping. Mitigated
  by the committed JSON seed.

---

## 13. The Final Report Structure

The report is the actual deliverable. Proposed sections:

1. **Executive summary** — validated / weak / not, in one paragraph.
2. **Hypothesis & method** — the fake-door and wizard-of-oz design, demo profiles,
   sample description.
3. **The funnel** — impression to row-click to title-open to play to scrubber, with
   drop-off at each stage.
4. **Feature vs. baseline** — feature-row CTR against generic-row CTR, same sessions.
5. **Path comparison** — WWYE vs. normal browsing: time-to-first-play, tiles opened
   before starting, give-up rate.
6. **Dwell & depth** — time-on-feature distribution, browse depth, skip/bounce rate.
7. **Segmentation** — behavior by demo profile and by device.
8. **Stated vs. revealed** — survey answers cross-checked against the same
   participant's behavior, joined on `session_id`.
9. **Qualitative** — tester quotes from the open-text questions.
10. **Verdict against pre-registered thresholds** — validated or not, no
    after-the-fact goalpost moving.
11. **Limitations** — sample, mock player, novelty, placement.
12. **If we were to build it for real** — what the data implies about next steps.

---

## 14. Tech Stack & Why

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript | Fastest path to a deployed Netflix look-alike |
| Styling | Tailwind CSS | Rapid pixel-match of Netflix's dark, card-based UI |
| Backend / DB | Supabase (Postgres), REST API, no SDK | Append-only events with zero server to operate, free tier |
| Hosting | Vercel | One-click Next.js deploy, responsive covers web, tablet, mobile browser |
| Crawler | Node/TS via `tsx`, TMDB API | Offline one-shot, writes the seed, not in the request path |
| Analytics | Custom event logging | Full control, the report is plain aggregation over one table |

No native mobile, no TV app, no streaming infra, no ML. Deliberately.

---

## 15. Repo Structure

```
Market_Validation/
├── README.md                      # this file, the single source of truth
├── AGENTS.md / CLAUDE.md          # agent instructions
├── DEPLOY.md                      # deploy notes
├── src/
│   ├── app/
│   │   ├── layout.tsx             # shell, research notice, FinishFeedback
│   │   ├── page.tsx               # profile gate ("Who's watching?"), seeds sid
│   │   ├── browse/page.tsx        # home: rows, nav views, search, modal host
│   │   ├── watch/[episodeId]/     # mock player + heatmap scrubber
│   │   ├── survey/start           # feature-blind intro (give participants this)
│   │   ├── survey/pre|post|thanks # questionnaire flow
│   │   ├── report/page.tsx        # internal validation dashboard
│   │   └── api/events|survey/     # POST sinks (Node runtime)
│   ├── components/
│   │   ├── Row.tsx  TitleCard.tsx  Billboard.tsx  GridView.tsx
│   │   ├── WatchWhileYouEat.tsx   # the feature row
│   │   ├── DetailModal.tsx        # split: WWYE branch vs standard branch
│   │   ├── HeatmapScrubber.tsx    # best-moment graph
│   │   ├── SearchOverlay.tsx  Navbar.tsx  TrailerPlayer.tsx
│   │   ├── MuteButton.tsx  MuteContext.tsx  ResearchNotice.tsx
│   │   ├── SurveyForm.tsx         # renders every question type
│   │   └── FinishFeedback.tsx     # always-available link to the post survey
│   ├── lib/
│   │   ├── analytics.ts           # track(), session id, pathFor()
│   │   ├── exposure.ts            # what the participant actually saw (gates survey)
│   │   ├── events-store.ts        # Supabase REST write, JSONL fallback
│   │   ├── survey.ts              # THE QUESTIONNAIRE (source of truth)
│   │   ├── survey-client.ts       # posts survey answers
│   │   ├── feature.ts             # buildFeatureRow(), continueWatching()
│   │   ├── heatmap.ts             # synthetic best-moment curve
│   │   ├── prefs.ts               # My List + thumbs (localStorage, pub/sub)
│   │   ├── report.ts              # buildReport() aggregation
│   │   ├── report-config.ts       # THRESHOLDS
│   │   └── display.ts
│   └── data/
│       ├── catalog.seed.json      # 89 shows, 285 episodes (committed)
│       ├── catalog.ts             # loaders, bestEpisodeForShow()
│       ├── profiles.ts            # 4 demo personas
│       └── types.ts
├── crawler/
│   ├── crawl.ts                   # TMDB scrape, needs TMDB_BEARER
│   ├── shows.ts                   # the show list to crawl
│   └── mood.ts                    # mood tagging layer
├── scripts/
│   └── check-study-invariants.ts  # `pnpm check`: row size + survey gating asserts
├── data/events.jsonl              # local fallback event store (no Supabase)
├── supabase/migrations/
│   ├── 0001_events.sql
│   └── 0002_survey_responses.sql
└── .github/workflows/
    └── supabase-keepalive.yml     # daily read so the free project never pauses
```

---

## 16. Legal & Ethics

- **Netflix branding.** This is a non-commercial academic validation mock. It
  reproduces Netflix's visual language to make the fake-door test honest. It is not
  distributed as, or claimed to be, Netflix, and it is not a shipped product.
  Trademarks belong to Netflix.
- **Scraped data.** Rating data is used only to seed a small academic demo catalog.
  The crawler respects `robots.txt`, rate-limits, caches, and runs offline. If a
  source disallows scraping, use the committed seed or a permitted data source
  instead.
- **Tester data.** Sessions are pseudonymous (`session_id` only). No PII is
  collected. Participants are told it is a research prototype and that their
  interactions are logged for a study (`ResearchNotice` renders in the layout).
- **Consent script.** "This is a research prototype for a student project, not the
  real Netflix. Your interactions are recorded anonymously for the study. It takes
  about five minutes and you can stop anytime."
- **Under-18 participants are screened out** by `pre_s1` and cannot reach the
  prototype.

---

## 17. Participant Task Flow

A participant moves through three linked steps, all joined by a single `session_id`
so **stated** answers (survey) can be cross-checked against **revealed** behavior
(events):

```
/survey/start  →  /survey/pre  →  /?sid=…  →  /browse  →  /survey/post?sid=…  →  /survey/thanks
```

**Give participants the `/survey/start` link, not `/survey/pre`.** Entering at the
pre form skips the framing and the session still works, but the participant has no
idea what they are about to do.

1. **Intro (`/survey/start`)** — what they will do, how long it takes, the
   anonymity line, and the mealtime scenario. **Feature-blind by design:** it never
   names or points at the WWYE row, because telling someone what is being tested
   destroys the behavioural signal (README [Section 20.4](#204-session-protocol-four-parts-every-session)).
   Static page, no session id minted here. A single "Start" proceeds to the pre form.
2. **Pre survey (`/survey/pre`)** — consent notice plus problem-validation
   questions. On first load it mints a `session_id` (UUID v4). Required-field and
   "slider must be moved" validation gate the submit button until the form is
   complete.
   - **Screening:** certain answers end the study early with a polite message and
     save the response with `screened_out = true`. The prototype is not reachable
     from there. Screen-out options are marked in
     [Section 18](#18-the-questionnaire-shipped-verbatim).
3. **Prototype (`/?sid=<session_id>`)** — the profile gate, then `/browse`. The
   `sid` from the URL seeds the client session so every `events` row logs under that
   same id. An always-available **"Finish & give feedback"** button links to the
   post survey, so participants who abandon before the player still reach it.
4. **Post survey (`/survey/post?sid=…`)** — solution-validation questions, then
   `/survey/thanks`. Questions about things the participant may never have met are
   gated, see [Section 18.3](#183-conditional-questions).

**Storage & join.** Pre/post responses go to `survey_responses` (via `/api/survey`),
prototype events go to `events` (via `/api/events`). All three carry the same
`session_id`, so one participant's pre answers, in-app behavior, and post answers
join on that key.

**Config-driven.** Add or edit a question by editing `src/lib/survey.ts` only. One
`SurveyForm` component renders every type (single / multi / slider / open).

> **Session-id integrity is load-bearing.** The whole study depends on the three
> datasets joining. After touching `src/lib/analytics.ts`,
> `src/components/FinishFeedback.tsx`, or the `sid` logic in `src/app/page.tsx`,
> re-walk the full flow in a browser and confirm one `session_id` shows up in
> `survey_responses` (pre + post) **and** `events`. Build, lint, and API smoke tests
> do not catch a broken join.

---

## 18. The Questionnaire (shipped, verbatim)

**Source of truth: `src/lib/survey.ts`.** The text below is transcribed from that
file. If they ever disagree, the code is correct and this section is stale.

Question types: `single` (one choice), `multi` (select all), `slider` (numeric
scale), `open` (free text). `claimTag` links a question to a hypothesis claim, see
[Section 19](#19-claim-map--analysis-mapping).

### 18.1 Pre-visit form

Three screeners, then eight baseline questions. A screen-out answer ends the study
immediately and saves the row with `screened_out = true`.

| id | Type | Req | Claim | Prompt |
|---|---|---|---|---|
| `pre_s1` | single | yes | | How old are you? |
| `pre_s2` | single | yes | | How often do you watch shows or movies on a streaming app? |
| `pre_s3` | single | yes | | Do you watch something while eating a meal? |
| `pre_q1` | single | yes | C1 | In a typical week, how many times do you watch something on a streaming app while eating a meal? |
| `pre_q2` | single | yes | C2 | Think about the last time you watched during a meal. How long did you spend deciding before you actually started? |
| `pre_q3` | slider | yes | C2 | By the time you settled on something, how much of your meal was already over? |
| `pre_q4` | single | yes | C3 | In the last month, how often did you open a streaming app at a meal but give up without watching anything on it? |
| `pre_q5` | single | yes | C3-falsifier | When you sit down to watch at a meal, do you usually already know what you want, or do you have to figure it out? |
| `pre_q6` | single | yes | C4 | The last time deciding dragged at a meal, what did you actually do? |
| `pre_q7` | slider | yes | C5 | How annoying is the 'what do I put on' part at mealtime, for you? |
| `pre_q8` | open | no | | Describe the last time you gave up trying to find something at a meal — what happened? |

**Options in full:**

**`pre_s1` — How old are you?**
- Under 18 **(screen out)**
- 18–22
- 23–26
- 27–30
- 31 or older **(screen out)**

**`pre_s2` — How often do you watch shows or movies on a streaming app?**
- Every day
- A few times a week
- About once a week
- Rarely **(screen out)**
- Never **(screen out)**

**`pre_s3` — Do you watch something while eating a meal?**
- Most meals
- Sometimes
- Rarely
- Never **(screen out)**

**`pre_q1` — In a typical week, how many times do you watch something on a streaming app while eating a meal?**
- 0 **(screen out)**
- 1–2
- 3–5
- 6–10
- 10+

**`pre_q2` — Think about the last time you watched during a meal. How long did you spend deciding before you actually started?**
- Under 1 minute
- 1–3 minutes
- 3–5 minutes
- 5–10 minutes
- Over 10 minutes
- I never started

**`pre_q3` — By the time you settled on something, how much of your meal was already over?**
Slider 0 to 10. 0 = "None of it", 10 = "Most of it".

**`pre_q4` — In the last month, how often did you open a streaming app at a meal but give up without watching anything on it?**
- Never
- Once or twice
- A few times
- Often
- Almost every time

**`pre_q5` — When you sit down to watch at a meal, do you usually already know what you want, or do you have to figure it out?**
- I usually already know
- I usually have to figure it out
- Depends

**`pre_q6` — The last time deciding dragged at a meal, what did you actually do?**
- Watched something on it anyway
- Put on an old favourite
- Switched to YouTube
- Switched to another app
- Scrolled social media instead
- Gave up and just ate

**`pre_q7` — How annoying is the 'what do I put on' part at mealtime, for you?**
Slider 0 to 10. 0 = "Not at all", 10 = "Extremely".

**`pre_q8` — Describe the last time you gave up trying to find something at a meal — what happened?**
Open text, optional.

### 18.2 Post-visit form

Administered immediately after the prototype session.

| id | Type | Req | Claim | Prompt |
|---|---|---|---|---|
| `post_q1` | single | yes | | Did you notice a row meant to help you quickly pick something to watch? |
| `post_q2` | single | yes | C2 | Compared to how you normally decide at a meal, finding something with the 'Watch While You Eat' row was… |
| `post_q3` | slider | yes | | How well did the episodes it showed you match your taste? **(gated)** |
| `post_q4` | single | yes | C3 | If that had been a real meal just now, would you have started watching — or given up? |
| `post_q5` | single | yes | | Did it reduce the 'what do I put on' struggle for you specifically? |
| `post_q6` | single | yes | C4 | Would this keep you on Netflix at a meal instead of switching to something else? |
| `post_q7` | single | yes | guardrail | Of the episodes it suggested, did they feel like things you'd want, or things you'd already skip? **(gated)** |
| `post_q8` | multi | yes | | Which parts felt useful? **(one option gated)** |
| `post_q9` | slider | yes | | How much would this improve your mealtime watching? |
| `post_q10` | open | yes | | What is the ONE thing that would make you actually use it? |
| `post_q11` | open | no | | Anything that confused you or got in the way? |

**Options in full:**

**`post_q1` — Did you notice a row meant to help you quickly pick something to watch?**
- Yes
- No
- Not sure

**`post_q2` — Compared to how you normally decide at a meal, finding something with the 'Watch While You Eat' row was…**
- Much faster
- Faster
- About the same
- Slower

**`post_q3` — How well did the episodes it showed you match your taste?**
Slider 1 to 5. 1 = "Not at all", 5 = "Very well".
Gated on `clickedFeature`. Reworded to scope it to what they were actually shown:
pilot testers rated the thin demo set rather than the concept.

**`post_q4` — If that had been a real meal just now, would you have started watching — or given up?**
- Started easily
- Started eventually
- Probably given up

**`post_q5` — Did it reduce the 'what do I put on' struggle for you specifically?**
- Yes, clearly
- Somewhat
- No

**`post_q6` — Would this keep you on Netflix at a meal instead of switching to something else?**
- Yes
- Maybe
- No
- I'd still switch

**`post_q7` — Of the episodes it suggested, did they feel like things you'd want, or things you'd already skip?**
- Mostly things I'd want
- A mix
- Mostly things I've already seen or would skip

Gated on `clickedFeature`. Reworded for the same reason as `post_q3`; the three
options and the guardrail role are unchanged.

**`post_q8` — Which parts felt useful?** (select all)
- The single best-episode pick per show
- The mood filters
- The jump-to-the-best-moment graph *(shown only if `sawHeatmap` or `usedHeatmap`)*
- That it used shows I already watch
- None of these

**`post_q9` — How much would this improve your mealtime watching?**
Slider 0 to 10. 0 = "Not at all", 10 = "A lot".

**`post_q10` — What is the ONE thing that would make you actually use it?**
Open text, required.

**`post_q11` — Anything that confused you or got in the way?**
Open text, optional.

### 18.3 Conditional questions

Three items are gated on what the participant actually encountered, using the
exposure flags in [Section 8.4](#84-exposure-flags-not-events). Nobody is asked to
judge something they never saw.

| Item | Shown only if | Why |
|---|---|---|
| `post_q3` | `clickedFeature` | Cannot rate picks you never opened |
| `post_q7` | `clickedFeature` | Same, and a forced guess pollutes the guardrail |
| `post_q8` option "The jump-to-the-best-moment graph" | `sawHeatmap` or `usedHeatmap` | Most phone testers never reached the graph |

**Mechanism.** `Question` carries an optional `showIf: (e: Exposure) => boolean` and
an optional `optionShowIf: Record<string, (e: Exposure) => boolean>`.
`visibleQuestions()` and `visibleOptions()` in `src/lib/survey.ts` resolve them, and
`SurveyForm` applies both generically: a gated-out item is never rendered, never
counted in the progress bar, never required, and never submitted. Adding another
conditional question means adding a `showIf` line, nothing else.

**No exposure record means show everything.** A participant who reaches
`/survey/post` without a prototype session on record gets the full instrument.

**"Not asked" is not "skipped".** Only questions that were actually shown are
submitted, so a gated-out question is *absent* from `survey_responses.answers`
rather than present and blank. Analysis must treat a missing `post_q3`/`post_q7` key
as "not exposed", not as a non-response.

### 18.4 Answer value shapes

| Type | Stored as |
|---|---|
| `single` | `string` (the chosen option) |
| `multi` | `string[]` |
| `slider` | `number` |
| `open` | `string` |

Written to `survey_responses.answers` as `{ question_id: value }`.

---

## 19. Claim Map & Analysis Mapping

Each `claimTag` in `src/lib/survey.ts` ties a question to a claim the study tests.

> **Gap: the legend is not in the code.** `claimTag` is declared on the `Question`
> interface and populated per question, but no file defines what `C1`–`C5` mean.
> The mapping below is inferred from the question content and **must be confirmed
> before analysis**. Either agree it and keep it here, or add it to
> `src/lib/survey.ts` as an exported constant.

| Claim | Inferred meaning | Pre | Post |
|---|---|---|---|
| C1 | The mealtime-watching occasion exists and is frequent | `pre_q1` | |
| C2 | Deciding takes real time and eats into the meal | `pre_q2`, `pre_q3` | `post_q2` |
| C3 | The decision cost is high enough that people abandon | `pre_q4` | `post_q4` |
| C3-falsifier | Counter-check: many arrive with intent and never struggle | `pre_q5` | |
| C4 | The abandonment leaks to a competitor (YouTube, other apps) | `pre_q6` | `post_q6` |
| C5 | The friction is felt as annoying, not merely present | `pre_q7` | |
| guardrail | The "Play Something" failure mode, re-serving already-rejected titles | | `post_q7` |

**How the answers are read:**

- **Pre `q1`–`q7` establish the pain before exposure.** They let us check whether
  people who *report* the mealtime struggle are the same ones whose *behavior* shows
  it. Stated vs. revealed, joined on `session_id`.
- **`pre_q2` (time-to-decide)** is the local echo of Netflix's 60-to-90-second
  finding. Compare it directly to measured time-to-first-play from the event log.
- **`pre_q5` is a deliberate falsifier.** A high "I usually already know" share
  weakens the whole premise. It is in the instrument so the study can fail honestly.
- **`post_q9` is the headline self-report** but it only *supports* the behavioral
  verdict, it never replaces it.
- **`post_q7` is the Play-Something guardrail.** Netflix removed its shuffle button
  in 2023 because it re-served titles people had already rejected. A high "already
  seen / would skip" share is that same failure, and is a red flag even when the
  click numbers look fine.
- **`post_q8` tells us which mechanic carries the feature** (best-episode pick, mood
  filter, or best-moment jump) so a future build knows what to keep.
- **Open text (`pre_q8`, `post_q10`, `post_q11`)** supplies the quotes for the
  report's qualitative section.

Where a participant's words and their clicks disagree, **the clicks win.** The
survey explains behavior, it does not overrule it.

---

## 20. Test Plan & Session Protocol

### 20.1 What we are validating

One question, answered with behavior: when a young viewer sits down to watch during
a meal, does a "Watch While You Eat" row that pre-picks the best, already-enjoyed
episode of shows they watch get a real click, a real browse, and a real play, above
how they treat the ordinary rows, or do they skip it.

This is a **revealed-preference** test.

### 20.2 Why not just send a link

A link distributed openly fails on four counts, each of which corrupts the signal:
we lose control of *who* opens it (we need 18-to-30 mealtime streamers, not whoever
is reachable), there is no *mealtime context* so no one is in the moment being
tested, we never see the *why* behind a skip or a click, and we get novelty clicks
with no way to separate them from genuine intent. Every session must be screened,
framed, and observed.

### 20.3 Participants and recruitment

Target segment: viewers aged 18 to 30 who stream at least weekly and watch during
meals, across phone, laptop, and TV. Eligibility is decided by the `pre_s1`-`pre_s3`
and `pre_q1` screeners. Only qualifying respondents reach the prototype.

Target sample: roughly **30 to 50 completed behavioral sessions**, plus about **8
moderated think-aloud sessions** for depth. This is a convenience sample skewed
young and student-heavy. That is acceptable for a desirability signal and is stated
plainly as a limitation in the report, not hidden.

### 20.4 Session protocol (four parts, every session)

1. **Screen.** Send them to `/survey/start`. The intro frames the task and the meal
   scenario without naming the feature, then the pre-visit form decides
   eligibility. Ineligible respondents stop there automatically.
2. **Frame the moment.** The intro screen carries the scenario in writing; read it
   aloud too in a moderated session so the participant is in the mealtime headspace.
   Do **not** name or point to the feature being tested.
3. **Observe.** The participant uses the prototype naturally while the
   instrumentation captures the funnel and the feature-vs-generic baseline. In
   moderated sessions, note every hesitation and skip.
4. **Debrief.** Administer the post-visit form for the *why* and the stated
   likelihood to use.

**Scenario script (read verbatim):** "Imagine it's dinner. You have about 30 to 40
minutes and a plate of food in front of you, and you open Netflix to put something
on while you eat. Go ahead and pick something the way you normally would, and if you
can, say out loud what you're thinking as you go."

### 20.5 How sessions are run (choose a mix)

- **Canteen / mess intercept (primary).** Set up at lunch and dinner in the dining
  hall with a laptop or phone and approach people who are actually eating. Real
  mealtime context, the exact segment, 20 to 30 sessions across a couple of meal
  windows, cheaply. Best signal for the effort.
- **Moderated think-aloud (for depth).** About 8 sessions, in person or over a video
  call with screen share, participant narrating. Small sample, but this is where the
  *why* surfaces and where the failure mode below shows up first.
- **Unmoderated remote (optional, for scale).** A platform (Maze, Lookback,
  PlaybookUX, UserTesting) recruits to the screener, serves the scenario, and
  records while events log. Adds volume, loses the live *why*, costs money. Use only
  to top up if the behavioral sample is thin.

Recommended for a student team: canteen intercepts for volume plus the 8 moderated
sessions for depth. Skip paid platforms unless numbers fall short.

### 20.6 Study design

Use a **within-session baseline**: every participant sees the Watch While You Eat
row among the ordinary rows, and each person's feature-row behavior is compared to
their *own* generic-row behavior. This controls for how clicky each individual is,
which matters when the sample is small. Do **not** run a between-groups A/B (feature
vs. no feature), it needs far more people than we will have.

Segment results by demo profile chosen and by device.

### 20.7 The failure mode to watch for

Netflix's "Play Something" shuffle was removed in 2023 because it re-served titles
people had already rejected and ignored that viewers arrive with intent. Our row
must not fall into the same trap. The single most important qualitative signal is a
participant reacting *"these are things I've already seen / would skip"*. `post_q7`
probes this directly, and it is why the verdict weights **dwell and the baseline
comparison over raw click-through**. A click is cheap, a real browse is not.

### 20.8 Gates before any session runs

- **Lock the thresholds first.** The values in `src/lib/report-config.ts` become
  agreed, written-down numbers *before* recruiting. No moving them afterwards.
- **Consent and ethics.** Read the notice in [Section 16](#16-legal--ethics), get a
  verbal yes. Sessions are pseudonymous, no PII, under-18s screened out.
- **Verify the pipe.** Confirm `events` and `survey_responses` are accepting writes
  and that a test session joins on one `session_id`. Delete the test rows before
  real collection.
- **Incentive.** A small thank-you for intercepts (a snack or a coffee coupon) lifts
  completion.

### 20.9 Moderator run-sheet (per session)

- Confirm the screener passed, note profile chosen and device.
- Read the consent notice, get a verbal yes.
- Read the scenario, then stay quiet and let them browse.
- Note every hesitation, skip, and out-loud reaction.
- Stop when they start something or give up.
- Administer the post-visit form.
- Thank them, give the incentive.
- **Confirm the session's events actually landed in the log before moving on.** The
  API always returns success, so this check is manual and mandatory.

### 20.10 Sequence

| Week | Work |
|---|---|
| 1 | Lock thresholds, run 3 pilot sessions to shake out the prototype and the forms, fix anything broken |
| 2 | Canteen intercepts (20 to 30) plus the 8 moderated sessions |
| 3 | Analyse funnel, dwell, and baseline, write the report against the pre-registered thresholds |

---

## 21. Verifying This Build

Use this to audit the implementation against the spec above. It is read-and-verify
first, it does not change code.

**Rules**
- Verify by evidence: read the code, run the app, query the data. A file existing is
  not proof a requirement is met.
- Do not modify code, migrations, or data during the audit.
- If something cannot be checked (for example, no Supabase credentials), mark it
  **BLOCKED** and say exactly what is needed. Never guess a pass.
- Treat event tracking as the highest-stakes part. If the behavioral signal could be
  wrong, that is critical regardless of how the UI looks.

**Steps**
1. **Inventory.** Map the repo against [Section 15](#15-repo-structure). List what
   exists, what is missing, anything extra.
2. **Build health.** Run install, `pnpm lint`, `npx tsc --noEmit`, `pnpm build`, and
   `pnpm check`. Record failures verbatim. `pnpm check` asserts the feature-row size
   and the survey gating, which a type-check cannot see.
3. **Data model.** Check `supabase/migrations/` against
   [Section 8](#8-instrumentation--event-schema). Confirm `survey_responses` accepts
   an anon insert and that `events` is server-only.
4. **Event schema.** For every `event_type` in
   [Section 8.3](#83-event-types-as-shipped), find where it is fired and confirm the
   payload matches. Then perform a scripted click-through (pre survey → profile →
   home → hover and click the WWYE row → open a title → use the scrubber → play →
   post survey). Query `events` and confirm each expected row appears exactly once,
   in order, with the correct payload, and that `isFeature` and `path` distinguish
   the WWYE row from generic rows. Flag anything missing, extra, double-fired, or
   mis-payloaded.
5. **Survey integrity.** Confirm every question in
   [Section 18](#18-the-questionnaire-shipped-verbatim) renders with the exact
   prompt, type, options, and required flag from `src/lib/survey.ts`. Confirm each
   screen-out option actually ends the study and writes `screened_out = true`.
   Confirm validation blocks submit on an untouched slider. Then walk the post
   survey twice, once having opened a WWYE pick and used the graph, once having
   ignored the row entirely, and confirm the gated items in
   [Section 18.3](#183-conditional-questions) appear and disappear accordingly, and
   that the stored `answers` object omits the keys that were never asked.
6. **The join.** Walk the full flow in a browser and confirm the URL `sid`, the
   value in `sessionStorage`, the Finish-and-feedback link, the two
   `survey_responses` rows, and every `events` row all carry **one** `session_id`.
   This cannot be verified by build or lint.
7. **Report.** Confirm `/report` computes the WWYE funnel, feature-vs-baseline CTR,
   dwell, bounce, and the path comparison, and that thresholds are read from
   `src/lib/report-config.ts` rather than hard-coded.
8. **Touch.** On a mobile viewport, open a WWYE title and confirm a tap on the
   best-moment graph reveals the curve plus thumbnail and seeks to the tapped point,
   firing exactly one `scrubber_interact` (a tap also emits a synthesized click, so
   a double row here is a real bug).
9. **Responsive & ethics.** Spot-check desktop, tablet, and mobile widths, the
   pseudonymous-only rule, and the research-prototype notice.

**Output** — a single structured report: summary verdict in one line, a scorecard
table of Requirement / Status (PASS / FAIL / PARTIAL / BLOCKED) / Evidence grouped
by section and most severe first, critical findings with exact file and line plus a
concrete failing scenario, and the unresolved open items from
[Section 12](#12-open-questions--risks).

---

## Status

**Built and deployed.** The Netflix-clone prototype, the "Watch While You Eat"
feature, event instrumentation, the pre/post survey flow, and the `/report` view are
live on **Vercel** (project `market-validation`), backed by **Supabase**. The
participant flow is verified end-to-end: pre + events + post join on one
`session_id`.

**Blocking data collection:**

1. Lock the [Section 5](#5-success-metrics--pre-registered-thresholds) thresholds.
2. Confirm or codify the [Section 19](#19-claim-map--analysis-mapping) claim legend.
3. Fix the feature-row placement, and decide on A/B.
4. Resource the session modes and recruitment from
   [Section 20](#20-test-plan--session-protocol).
