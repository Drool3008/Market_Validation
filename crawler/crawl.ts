// Phase 2 crawler. Pulls a large real catalog of TV shows AND movies from TMDB:
// the guaranteed seed shows (so demo profiles resolve) plus hundreds more from
// trending/popular discovery. Writes src/data/catalog.seed.json.
//
// A movie is stored as a Show with kind:"movie" holding one film "episode".
//
// Auth: set ONE of these in .env.local
//   TMDB_BEARER=<v4 read access token>   (recommended)
//   TMDB_API_KEY=<v3 api key>
// Get a free key at https://www.themoviedb.org/settings/api
//
// Run:  pnpm crawl

import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SEED_SHOWS, PALETTE, colorFor } from "./shows";
import { moodsForGenres } from "./mood";
import type { Show, Episode, Trailer } from "../src/data/types";

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const OUT = path.resolve(process.cwd(), "src/data/catalog.seed.json");

// How much to pull. Seed TV is always included on top of these.
const DISCOVER_TV = 30;
const DISCOVER_MOVIES = 60;
const MAX_SEASONS = 8;
const EP_PER_SHOW = 6;
const MIN_VOTES = 5;
const DELAY_MS = 80;

const GENRE_SHORT: Record<string, string> = {
  "Sci-Fi & Fantasy": "Sci-Fi",
  "Action & Adventure": "Action",
  "War & Politics": "War",
  "Science Fiction": "Sci-Fi",
};

// --- env ---------------------------------------------------------------------
function loadEnvLocal() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}
loadEnvLocal();

const BEARER = process.env.TMDB_BEARER;
const API_KEY = process.env.TMDB_API_KEY;

if (!BEARER && !API_KEY) {
  console.log(
    [
      "No TMDB credentials found.",
      "",
      "Set one of these in .env.local (see .env.local.example):",
      "  TMDB_BEARER=<v4 read access token>   (recommended)",
      "  TMDB_API_KEY=<v3 api key>",
      "",
      "Get a free key: https://www.themoviedb.org/settings/api",
      "",
      "The app still runs on the current hand-seeded catalog without this.",
    ].join("\n"),
  );
  process.exit(0);
}

// --- fetch -------------------------------------------------------------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tmdb<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(API + endpoint);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (API_KEY && !BEARER) url.searchParams.set("api_key", API_KEY);
  const res = await fetch(url, {
    headers: BEARER ? { Authorization: `Bearer ${BEARER}` } : {},
  });
  if (!res.ok) {
    throw new Error(`TMDB ${res.status} on ${endpoint}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function img(kind: "poster" | "still" | "backdrop", p?: string | null) {
  if (!p) return null;
  const size = kind === "backdrop" ? "w1280" : "w500";
  return `${IMG}/${size}${p}`;
}

function shortGenres(names: string[]): string[] {
  return names.map((g) => GENRE_SHORT[g] ?? g).slice(0, 3);
}

// Ordered trailer candidates. YouTube before Vimeo, official Trailers first, so
// the player tries the most-likely-embeddable option first and falls through.
async function trailersFor(kind: "tv" | "movie", id: number): Promise<Trailer[]> {
  try {
    const v = await tmdb<TmdbVideos>(`/${kind}/${id}/videos`);
    const vids = v.results.filter(
      (r) =>
        (r.site === "YouTube" || r.site === "Vimeo") &&
        (r.type === "Trailer" || r.type === "Teaser"),
    );
    const score = (r: TmdbVideos["results"][number]) =>
      (r.site === "YouTube" ? 0 : 100) +
      (r.type === "Trailer" ? 0 : 10) +
      (r.official ? 0 : 5);
    const ranked = [...vids].sort((a, b) => score(a) - score(b));
    const out: Trailer[] = [];
    const seen = new Set<string>();
    for (const r of ranked) {
      if (seen.has(r.key)) continue;
      seen.add(r.key);
      out.push({ site: r.site as "YouTube" | "Vimeo", key: r.key });
      if (out.length >= 4) break;
    }
    return out;
  } catch {
    return [];
  }
}

// --- TMDB shapes (only fields we use) ---------------------------------------
interface TvSearch {
  results: { id: number }[];
}
interface TmdbVideos {
  results: { site: string; type: string; key: string; official?: boolean }[];
}
interface TvDetails {
  name: string;
  overview: string;
  first_air_date?: string;
  number_of_seasons: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres: { name: string }[];
}
interface SeasonDetails {
  episodes: {
    name: string;
    season_number: number;
    episode_number: number;
    vote_average: number;
    vote_count: number;
    runtime?: number | null;
    overview?: string;
    still_path?: string | null;
  }[];
}
interface MovieDetails {
  title: string;
  overview: string;
  release_date?: string;
  runtime?: number | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  genres: { name: string }[];
}
interface DiscoverResults {
  results: { id: number; name?: string; title?: string }[];
}

// --- crawlers ----------------------------------------------------------------
interface Target {
  kind: "tv" | "movie";
  id: string;
  color: string;
  tmdbId: number;
}

async function crawlTv(t: Target): Promise<{ show: Show; episodes: Episode[] }> {
  const d = await tmdb<TvDetails>(`/tv/${t.tmdbId}`);
  const rawGenres = d.genres.map((g) => g.name);
  const moods = moodsForGenres(rawGenres);
  const trailers = await trailersFor("tv", t.tmdbId);

  const show: Show = {
    id: t.id,
    title: d.name,
    kind: "tv",
    year: d.first_air_date ? Number(d.first_air_date.slice(0, 4)) : 0,
    genres: shortGenres(rawGenres),
    color: t.color,
    description: d.overview,
    posterUrl: img("poster", d.poster_path),
    backdropUrl: img("backdrop", d.backdrop_path),
    trailers,
  };

  const collected: SeasonDetails["episodes"] = [];
  const seasons = Math.min(d.number_of_seasons || 1, MAX_SEASONS);
  for (let n = 1; n <= seasons; n++) {
    await sleep(DELAY_MS);
    try {
      const season = await tmdb<SeasonDetails>(`/tv/${t.tmdbId}/season/${n}`);
      for (const e of season.episodes) {
        if (e.vote_average > 0 && e.vote_count >= MIN_VOTES) collected.push(e);
      }
    } catch {
      /* skip missing/blocked season */
    }
  }

  const episodes: Episode[] = collected
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, EP_PER_SHOW)
    .map((e) => ({
      id: `${t.id}-s${e.season_number}e${e.episode_number}`,
      showId: t.id,
      season: e.season_number,
      number: e.episode_number,
      title: e.name,
      rating: Math.round(e.vote_average * 10) / 10,
      runtime: e.runtime && e.runtime > 0 ? e.runtime : 42,
      moods,
      synopsis: e.overview?.trim() || d.overview,
      stillUrl: img("still", e.still_path),
    }));

  return { show, episodes };
}

async function crawlMovie(t: Target): Promise<{ show: Show; episodes: Episode[] }> {
  const d = await tmdb<MovieDetails>(`/movie/${t.tmdbId}`);
  const rawGenres = d.genres.map((g) => g.name);
  const moods = moodsForGenres(rawGenres);
  const trailers = await trailersFor("movie", t.tmdbId);

  const show: Show = {
    id: t.id,
    title: d.title,
    kind: "movie",
    year: d.release_date ? Number(d.release_date.slice(0, 4)) : 0,
    genres: shortGenres(rawGenres),
    color: t.color,
    description: d.overview,
    posterUrl: img("poster", d.poster_path),
    backdropUrl: img("backdrop", d.backdrop_path),
    trailers,
  };

  const episode: Episode = {
    id: `${t.id}-film`,
    showId: t.id,
    season: 0,
    number: 0,
    title: d.title,
    rating: Math.round(d.vote_average * 10) / 10,
    runtime: d.runtime && d.runtime > 0 ? d.runtime : 120,
    moods,
    synopsis: d.overview,
    stillUrl: img("backdrop", d.backdrop_path),
  };

  return { show, episodes: [episode] };
}

async function discover(kind: "tv" | "movie"): Promise<DiscoverResults["results"]> {
  const paths =
    kind === "movie"
      ? ["/trending/movie/week", "/movie/popular", "/movie/top_rated"]
      : ["/trending/tv/week", "/tv/popular", "/tv/top_rated"];
  const out: DiscoverResults["results"] = [];
  for (const p of paths) {
    try {
      const d = await tmdb<DiscoverResults>(p, { page: "1" });
      out.push(...d.results);
      await sleep(DELAY_MS);
    } catch {
      /* skip endpoint */
    }
  }
  return out;
}

async function buildTargets(): Promise<Target[]> {
  const targets: Target[] = [];
  const seen = new Set<string>();

  // Guaranteed seed TV.
  for (const s of SEED_SHOWS) {
    let tmdbId = s.tmdbId;
    if (!tmdbId) {
      try {
        const r = await tmdb<TvSearch>("/search/tv", { query: s.name });
        tmdbId = r.results[0]?.id;
        await sleep(DELAY_MS);
      } catch {
        /* skip */
      }
    }
    if (!tmdbId || seen.has(s.id)) continue;
    targets.push({ kind: "tv", id: s.id, color: s.color, tmdbId });
    seen.add(s.id);
  }

  // Discovered TV.
  const tv = await discover("tv");
  let addedTv = 0;
  for (const r of tv) {
    if (addedTv >= DISCOVER_TV) break;
    const name = r.name ?? r.title ?? "";
    const id = slugify(name);
    if (!id || seen.has(id)) continue;
    targets.push({ kind: "tv", id, color: colorFor(id), tmdbId: r.id });
    seen.add(id);
    addedTv++;
  }

  // Discovered movies.
  const movies = await discover("movie");
  let addedM = 0;
  for (const r of movies) {
    if (addedM >= DISCOVER_MOVIES) break;
    const title = r.title ?? r.name ?? "";
    const id = slugify(title);
    if (!id || seen.has(id)) continue;
    targets.push({ kind: "movie", id, color: PALETTE[addedM % PALETTE.length], tmdbId: r.id });
    seen.add(id);
    addedM++;
  }

  return targets;
}

async function main() {
  console.log("Resolving catalog targets from TMDB...");
  const targets = await buildTargets();
  console.log(
    `Crawling ${targets.length} titles ` +
      `(${targets.filter((t) => t.kind === "tv").length} TV, ` +
      `${targets.filter((t) => t.kind === "movie").length} movies)...`,
  );

  const shows: Show[] = [];
  const episodes: Episode[] = [];
  let ok = 0;
  let failed = 0;

  for (const t of targets) {
    try {
      const r = t.kind === "tv" ? await crawlTv(t) : await crawlMovie(t);
      if (r.episodes.length === 0) {
        failed++;
        continue;
      }
      shows.push(r.show);
      episodes.push(...r.episodes);
      ok++;
      console.log(`✓ [${t.kind}] ${r.show.title}: ${r.episodes.length}`);
    } catch (err) {
      failed++;
      console.warn(`✗ [${t.kind}] ${t.id}: ${(err as Error).message}`);
    }
    await sleep(DELAY_MS);
  }

  if (shows.length === 0) {
    console.error("No titles crawled; leaving catalog.seed.json untouched.");
    process.exit(1);
  }

  try {
    const prev = await readFile(OUT, "utf8");
    await writeFile(OUT + ".bak", prev, "utf8");
  } catch {
    /* first run */
  }

  await writeFile(OUT, JSON.stringify({ shows, episodes }, null, 2) + "\n", "utf8");
  console.log(
    `\nWrote ${shows.length} titles / ${episodes.length} episodes to ` +
      `${path.relative(process.cwd(), OUT)} (ok=${ok}, failed=${failed})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
