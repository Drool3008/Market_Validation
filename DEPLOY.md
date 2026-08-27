# Deploy + go live

Goal: one shareable link, with tester clicks saved to a real database (not a
local file that resets). Two accounts needed, both free: Supabase and Vercel.

The app already runs locally without any of this. This is only for collecting
real data from testers.

## 1. Supabase (event storage)

1. Create a project at https://supabase.com (free tier).
2. Open the project's **SQL Editor**, paste the contents of
   `supabase/migrations/0001_events.sql`, and run it. This creates the `events` table.
3. Go to **Project Settings → API** and copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **service_role** key (under "Project API keys"). This is secret. Server only.

## 2. Vercel (hosting)

1. Push this repo to GitHub (already has an origin remote).
2. At https://vercel.com, **Add New → Project → Import** this repo.
3. Framework preset auto-detects **Next.js**. No build config changes needed.
4. Add **Environment Variables** (Project Settings → Environment Variables):
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_SERVICE_KEY` = your service_role key
   - (optional) `TMDB_BEARER` if you also want the crawler-enriched catalog
5. Deploy. You get a public URL.

## 3. Verify

- Open the deployed URL, pick a profile, click around.
- Open `<deployed-url>/report` — it should show your clicks, with
  `store: supabase` in the top-right.

## Local development with Supabase

Copy `.env.local.example` to `.env.local`, fill `SUPABASE_URL` and
`SUPABASE_SERVICE_KEY`, run `pnpm dev`. Without them, events go to
`data/events.jsonl` and the report reads from there.

## What is NOT set up

- Nothing auto-recruits testers. You share the link.
- The service_role key bypasses row-level security by design; it is only ever
  used server-side (API route + report page), never sent to the browser.
