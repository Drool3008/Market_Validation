# Watch While You Eat — Netflix Fake-Door Validation

> Working title. Naming is deliberately open (see [Open Questions](#12-open-questions--risks)).

A market-validation project. We build a high-fidelity Netflix look-alike web app,
plant one new feature inside it ("Watch While You Eat"), instrument every click,
put it in front of real testers, and measure whether people actually engage with
the feature or ignore it. The output is not a shippable product. The output is a
**report** that answers one question with behavioral data:

> **If Netflix added a "Watch While You Eat" row that surfaces the most-loved
> episodes of shows you already watch, would people click it, browse it, and stick
> with it — or skip it and do something else?**

This is a **fake-door test**. Netflix is not integrating anything. We are
simulating the experience convincingly enough that the click data is real, then
reporting on it.

---

## Table of Contents

1. [The Hypothesis](#1-the-hypothesis)
2. [Background & Problem](#2-background--problem)
3. [The Feature: How It Works](#3-the-feature-how-it-works)
4. [Fake-Door Scope: What Is and Is Not Real](#4-fake-door-scope-what-is-and-is-not-real)
5. [Success Metrics — The Actual Test](#5-success-metrics--the-actual-test)
6. [System Architecture](#6-system-architecture)
7. [Data Pipeline (SeriesGraph Crawl + Dummy Heatmap)](#7-data-pipeline)
8. [Instrumentation & Event Schema](#8-instrumentation--event-schema)
9. [Demo Profiles & Personalization](#9-demo-profiles--personalization)
10. [UX Flows & Screens](#10-ux-flows--screens)
11. [Plan of Action (Phased)](#11-plan-of-action-phased)
12. [Open Questions & Risks](#12-open-questions--risks)
13. [The Final Report Structure](#13-the-final-report-structure)
14. [Tech Stack & Why](#14-tech-stack--why)
15. [Repo Structure](#15-repo-structure)
16. [Legal & Ethics](#16-legal--ethics)

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
[Section 5](#5-success-metrics--the-actual-test) so the result is not massaged after
the fact.

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
   (In the demo, "watch history" comes from a pre-seeded profile — see
   [Section 9](#9-demo-profiles--personalization).)

2. **Best-episode picks.** For each surfaced show, it suggests the **single episode
   most enjoyed by a lot of people** (highest-rated / most-loved), not a random one.
   The "enjoyed by a lot of people" signal comes from crawled per-episode rating
   data (see [Section 7](#7-data-pipeline)).

3. **Mood / emotion categories.** Because "the right thing to eat to" is
   mood-dependent (funny, cozy, tense, feel-good), the feature offers mood
   sub-filters. In the demo these are curated tags layered on top of the crawled
   episodes (wizard-of-oz), not a real emotion classifier.

4. **Start-anywhere with a "best moment" graph.** The user does not have to rewatch
   the whole episode. On the episode screen they get two options:
   - **Start from the beginning**, or
   - Use a **YouTube-style engagement graph** over the scrubber. Hovering the
     timeline shows a curve peaking at the most-loved scene plus a thumbnail;
     clicking jumps playback to that moment.
   The heatmap curve is **dummy/synthetic data** in the demo (confirmed scope),
   shaped to look believable, with a clear peak at the "best moment."

The point of the demo is not real streaming. It is to make all of the above feel
real enough that the tester's clicks are honest signal.

---

## 4. Fake-Door Scope: What Is and Is Not Real

This is a **wizard-of-oz** fake door: the surface looks fully functional, the
machinery behind it is mocked where mocking does not change the behavioral signal.

| Element | Real | Mocked / Dummy | Why |
|---|---|---|---|
| Netflix-identical UI (home, rows, hover, title page) | Real | | The look has to be honest or the test is invalid |
| Catalog: shows, episodes, "most-loved" ranking | Real (crawled) | | The "best episode" claim must be credible |
| "Watch While You Eat" row + mood filters | Real UI | Mood tags curated | Behavior is what we measure; tag source does not affect it |
| Personalization / watch history | | Pre-seeded demo profiles | No Netflix data access; profiles simulate history |
| Best-moment heatmap graph | Real UI | Synthetic curve data | Confirmed dummy; per-scene data does not exist cleanly |
| Actual video playback | | Mock player (poster + fake timeline) | We measure intent and browse, not watching |
| Click / dwell / browse tracking | Real | | This is the entire point |

**Not built:** native mobile apps (APK), TV app, real recommendation ML, real
video streaming, any Netflix account integration.

---

## 5. Success Metrics — The Actual Test

All events are captured via custom event logging (see
[Section 8](#8-instrumentation--event-schema)). The report is built from these.

**The funnel (primary):**

| Stage | Event | Question it answers |
|---|---|---|
| Row impression | `row_impression` (feature scrolls into view) | Did they even see it? |
| **Row click** | `row_click` (opened the feature) | **Do they click it?** (H1 core) |
| Title open | `title_open` | Do they browse inside it? |
| Play / start | `play_click` | Do they commit to watching? |
| Scrubber use | `scrubber_interact` | Do they use the signature "best moment" jump? |

**Supporting metrics:**

- **Feature dwell time** (`feature_dwell_ms`): total time spent inside the feature
  per session. Median and distribution.
- **Skip / bounce rate**: sessions that saw the row but never clicked it, or left
  home within N seconds without engaging.
- **Comparison baseline**: click-through of the "Watch While You Eat" row vs. the
  average of the other (generic) rows in the same session. This controls for
  novelty and general clickiness.

**Pre-registered success thresholds (tune before launch, do not change after):**

- **Validated** if all of:
  - Row CTR (clicks / impressions) is at least **1.5x** the session's average
    generic-row CTR, AND
  - At least **X%** of sessions produce a `row_click`, AND
  - Median feature dwell is at least **Y seconds** among sessions that clicked.
- **Weak / inconclusive** if CTR beats baseline but dwell is low (curiosity, not
  utility).
- **Not validated** if CTR is at or below baseline, or bounce dominates.

> `X`, `Y`, and the CTR multiple are placeholders. Set concrete numbers with the
> user before recruiting testers. That is a gate, not a formality.

---

## 6. System Architecture

```
                    ┌─────────────────────────────┐
                    │  Tester (desktop or mobile   │
                    │  browser — responsive web)   │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │  Next.js / React app (Vercel) │
                    │  - Netflix-clone UI           │
                    │  - "Watch While You Eat" row  │
                    │  - Mock player + heatmap       │
                    │  - Event logger (client)      │
                    └───────┬───────────────┬───────┘
                            │               │
              reads catalog │               │ writes events
                            ▼               ▼
                    ┌───────────────────────────────┐
                    │  Supabase (Postgres)          │
                    │  - shows / episodes catalog   │
                    │  - demo_profiles              │
                    │  - events (append-only log)   │
                    └───────────────▲───────────────┘
                                    │ seeds catalog
                    ┌───────────────┴───────────────┐
                    │  Crawler (Node/TS, offline)   │
                    │  - SeriesGraph / IMDb ratings │
                    │  - top shows + best episodes  │
                    └───────────────────────────────┘

   Report generation: SQL over the events table + a /report page or notebook.
```

- **Frontend + hosting:** Next.js (App Router) on Vercel. Responsive so one build
  covers desktop web, tablet, and mobile browser viewports. No native app.
- **Backend / storage:** Supabase (hosted Postgres) for the catalog, the demo
  profiles, and the append-only events log. Chosen for instant API, free tier,
  and zero server to run.
- **Crawler:** a standalone offline Node/TypeScript script that runs before the
  demo, scrapes rating data, and seeds Supabase. It does not run at request time.
- **Report:** SQL queries against `events`, surfaced either as a simple internal
  `/report` route or a one-off notebook. No BI tool needed.

---

## 7. Data Pipeline

### 7.1 Catalog crawl (real data)

**Source:** SeriesGraph-style per-episode rating data (built on IMDb episode
ratings). This gives, per show: seasons, episodes, and a rating per episode.

**What we extract:**

- A set of popular shows (the demo catalog, ~20-40 shows across genres).
- For each show: full episode list with per-episode rating.
- Derived: the **"most-loved" episode(s)** per show = highest-rated episodes. This
  is what "enjoyed by a lot of people" resolves to.

**Output:** rows in Supabase `shows` and `episodes`, plus a static JSON seed
committed to the repo as a fallback so the demo never depends on the crawler being
live.

**Crawler behavior:** respect `robots.txt`, rate-limit requests, cache
aggressively, run offline/one-shot. See [Section 16](#16-legal--ethics).

### 7.2 Mood tags (curated layer)

IMDb-style ratings do not carry mood. Mood categories (funny, cozy, tense,
feel-good, etc.) are a **curated/dummy tagging layer** applied to episodes, seeded
by hand or derived from genre. This is acceptable wizard-of-oz scope: the tag
source does not affect what we measure (the click behavior).

### 7.3 Best-moment heatmap (dummy data)

Confirmed dummy. For each episode we generate a **synthetic engagement curve**
(e.g., a smooth series with one or two believable peaks). The peak is labeled the
"most-loved scene." Hover shows the curve + a thumbnail; click seeks the mock
player to that timestamp. No real per-scene data is fetched.

---

## 8. Instrumentation & Event Schema

Custom event logging (confirmed). One append-only table drives the entire report.

**`events` table:**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (pk) | |
| `session_id` | uuid | one per tester visit |
| `profile_id` | text | which demo profile was chosen |
| `event_type` | text | see below |
| `payload` | jsonb | event-specific detail (show id, episode id, ms, etc.) |
| `created_at` | timestamptz | server default `now()` |

**Event types:**

| `event_type` | Fired when | Key payload |
|---|---|---|
| `session_start` | app loads | device, viewport |
| `profile_selected` | tester picks a demo profile | `profile_id` |
| `home_view` | home page rendered | |
| `row_impression` | a row scrolls into viewport | `row_id`, is-feature flag |
| `row_click` | user opens a row (PRIMARY for feature) | `row_id` |
| `card_hover` | hover a title card | `show_id`, `episode_id` |
| `title_open` | open a title/episode detail | `show_id`, `episode_id` |
| `scrubber_hover` | hover the heatmap timeline | `episode_id`, position |
| `scrubber_interact` | click/seek via heatmap | `episode_id`, timestamp |
| `play_click` | press play (mock) | `episode_id`, `from` (start vs. best-moment) |
| `feature_dwell` | leaving the feature | `ms` on feature |
| `bounce` | left home without feature engagement | seconds on page |

Every generic row also fires `row_impression` / `row_click` so we can compute the
**baseline** the feature is measured against.

**Client logger:** a thin wrapper that batches events and posts to Supabase. Keep
it minimal; no analytics framework.

---

## 9. Demo Profiles & Personalization

No real Netflix history exists, so personalization is driven by **pre-seeded demo
profiles** (confirmed). On launch the tester picks a Netflix-style profile; each
profile has a fixed fake watch history that drives the feature row.

Example profiles (final set TBD):

| Profile | Fake history (shows) | Feature row emphasis |
|---|---|---|
| The Sitcom Unwinder | The Office, Brooklyn 99, Friends, Parks & Rec | cozy / funny best episodes |
| The Crime Junkie | Breaking Bad, Mindhunter, Dark, Money Heist | tense / gripping best episodes |
| The Prestige Bingeing | Breaking Bad, The Crown, Succession-likes | dramatic best episodes |
| The Comfort Rewatcher | Friends, The Office, Gilmore-likes | feel-good best episodes |

Each profile maps to a set of shows; the "Watch While You Eat" row is filled with
the crawled **best episodes** of those shows, filterable by mood. The profile choice
is itself logged (`profile_selected`) and segments the report.

---

## 10. UX Flows & Screens

Every screen must match Netflix's visual language closely (layout, typography,
card hover-scale, dark theme, red accent). Screens:

1. **Profile gate** — Netflix "Who's watching?" grid, but the profiles are the demo
   personas from Section 9.
2. **Home** — top nav (Home, TV Shows, Movies, New & Hot, My List), a hero billboard,
   then stacked catalog rows. The **"Watch While You Eat"** row sits among them
   (placement is a test variable — see risks).
3. **Feature row open / detail** — expands to show the best-episode picks with mood
   filter chips.
4. **Title / episode page** — synopsis, episode strip, and the **start-anywhere**
   choice: "Start from beginning" vs. the best-moment heatmap.
5. **Mock player** — poster + fake timeline + the heatmap scrubber. Seeking via the
   heatmap fires `scrubber_interact`. No real video.

**Placement note:** where the feature row sits on the home page massively affects
click-through. Fix a placement for the main test; optionally A/B two placements if
sample size allows. Decide with the user before launch.

---

## 11. Plan of Action (Phased)

Each phase is shippable and leaves the demo runnable.

- **Phase 0 — Setup.** Next.js + TypeScript + Tailwind scaffold, Supabase project,
  Vercel deploy skeleton (empty app deploys green).
- **Phase 1 — Netflix clone shell.** Profile gate, home with rows, title page, mock
  player. Placeholder data. Pixel-match the look.
- **Phase 2 — Catalog crawl.** Build the crawler, pull top shows + per-episode
  ratings, seed Supabase + commit a JSON fallback. Wire the clone to real catalog.
- **Phase 3 — The feature.** "Watch While You Eat" row, best-episode selection,
  mood tags/filters, demo-profile personalization.
- **Phase 4 — Best-moment heatmap.** Synthetic engagement curve on the episode/
  player screen, hover thumbnail, click-to-seek.
- **Phase 5 — Instrumentation.** Events table, client logger, wire every event in
  Section 8, verify data lands in Supabase.
- **Phase 6 — Deploy & collect.** Finalize thresholds, deploy, recruit testers,
  collect sessions.
- **Phase 7 — Analyze & report.** Run the funnel/dwell/baseline queries, write the
  report (Section 13).

Milestone gate: **do not start Phase 6 until success thresholds in Section 5 are
concretely set with the user.**

---

## 12. Open Questions & Risks

**Decisions still needed (set with user before build/launch):**

- Concrete success thresholds (`X%`, `Y seconds`, CTR multiple) — Section 5.
- Feature row **placement** on the home page, and whether to A/B two placements.
- Final demo profile set and the show catalog list (which ~20-40 shows).
- Number of testers / recruitment channel / how sessions are solicited.
- Whether an optional one-question exit micro-survey is added for qualitative color.
- Final feature name (not "Watch While You Eat").

**Risks:**

- **Novelty bias.** A new row gets clicks because it is new, not because it is
  useful. Mitigated by the baseline comparison and by weighting dwell over CTR.
- **Small / biased sample.** Friends-and-family testers are not representative.
  Report must state sample composition honestly.
- **Realism gap.** Mock player with no real video may suppress `play_click`. We
  lean on browse/dwell as the truer signal, and say so.
- **Crawl fragility / ToS.** Rating sources can change layout or block scraping.
  Mitigated by the committed JSON seed fallback.
- **Placement confound.** Where the row sits can dominate the result. Hold it
  constant or A/B it explicitly.

---

## 13. The Final Report Structure

The report is the actual deliverable. Proposed sections:

1. **Executive summary** — validated / weak / not, in one paragraph.
2. **Hypothesis & method** — the fake-door + wizard-of-oz design, demo profiles,
   sample description.
3. **The funnel** — impression to row-click to title-open to play to scrubber, with
   drop-off at each stage.
4. **Feature vs. baseline** — feature-row CTR against generic-row CTR, same sessions.
5. **Dwell & depth** — time-on-feature distribution; browse depth; skip/bounce rate.
6. **Segmentation** — behavior by demo profile and by device (desktop vs. mobile).
7. **Qualitative** (if micro-survey used) — a few tester quotes / reasons.
8. **Verdict against pre-registered thresholds** — validated or not, no
   after-the-fact goalpost moving.
9. **Limitations** — sample, mock player, novelty, placement.
10. **If we were to build it for real** — what the data implies about next steps.

---

## 14. Tech Stack & Why

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript | Fastest path to a deployed Netflix look-alike; largest component ecosystem |
| Styling | Tailwind CSS | Rapid pixel-match of Netflix's dark, card-based UI |
| Animation | Framer Motion (as needed) | Netflix-style card hover-scale and row transitions |
| Backend / DB | Supabase (Postgres) | Catalog + append-only events with zero server to operate; free tier |
| Hosting | Vercel | One-click Next.js deploy; responsive covers web + tablet + mobile browser |
| Crawler | Node/TS (fetch + Cheerio, or Playwright if needed) | Offline one-shot; seeds DB; not in the request path |
| Analytics | Custom event logging (Supabase table) | Confirmed choice; full control; report is plain SQL |

No native mobile, no TV app, no streaming infra, no ML. Deliberately.

---

## 15. Repo Structure

```
Market_Validation/
├── README.md                 # this file
├── app/                      # Next.js app (routes, components)
│   ├── (netflix clone UI)
│   └── report/               # internal report view (optional)
├── lib/
│   ├── analytics.ts          # client event logger
│   ├── supabase.ts           # db client
│   └── heatmap.ts            # synthetic best-moment curve generator
├── crawler/
│   ├── crawl.ts              # SeriesGraph/IMDb rating scrape
│   └── seed.ts               # write catalog to Supabase / JSON
├── data/
│   └── catalog.seed.json     # committed fallback catalog
├── supabase/
│   └── migrations/           # shows, episodes, demo_profiles, events
└── report/                   # analysis queries / notebook
```

Structure is indicative; it will settle during Phase 0-1.

---

## 16. Legal & Ethics

- **Netflix branding.** This is a non-commercial academic validation mock. It
  reproduces Netflix's visual language to make the fake-door test honest. It is not
  distributed as, or claimed to be, Netflix, and it is not a shipped product.
  Trademarks belong to Netflix.
- **Scraped data.** Rating data is used only to seed a small academic demo catalog.
  The crawler respects `robots.txt`, rate-limits, caches, and runs offline. If a
  source disallows scraping, use the committed seed / a permitted data source
  instead.
- **Tester data.** Sessions are pseudonymous (`session_id` only). No PII is
  required. Testers should be told it is a research prototype and that their
  interactions are logged for a study.

---

## Status

Planning complete. Next step: lock the [Section 5](#5-success-metrics--the-actual-test)
thresholds and the [Section 12](#12-open-questions--risks) open decisions with the
user, then start Phase 0.
