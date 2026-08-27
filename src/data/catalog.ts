import type { Show, Episode, CatalogItem } from "./types";
import seed from "./catalog.seed.json";

// Catalog is loaded from catalog.seed.json. The Phase 2 crawler (crawler/crawl.ts)
// regenerates that file from TMDB; until then it holds hand-seeded shows with real
// per-episode ratings. Ratings drive the "most-loved episode" selection.

export const SHOWS: Show[] = seed.shows as unknown as Show[];
export const EPISODES: Episode[] = seed.episodes as unknown as Episode[];

const SHOW_BY_ID = new Map(SHOWS.map((s) => [s.id, s]));
const EPISODES_BY_SHOW = EPISODES.reduce<Record<string, Episode[]>>((acc, e) => {
  (acc[e.showId] ??= []).push(e);
  return acc;
}, {});

export function getShow(id: string): Show | undefined {
  return SHOW_BY_ID.get(id);
}

export function getEpisode(id: string): Episode | undefined {
  return EPISODES.find((e) => e.id === id);
}

export function episodesForShow(showId: string): Episode[] {
  return EPISODES_BY_SHOW[showId] ?? [];
}

/** The single "most-loved" episode for a show = highest rated. */
export function bestEpisodeForShow(showId: string): Episode | undefined {
  const eps = episodesForShow(showId);
  if (eps.length === 0) return undefined;
  return eps.reduce((best, e) => (e.rating > best.rating ? e : best));
}

export function toCatalogItem(episode: Episode): CatalogItem | undefined {
  const show = getShow(episode.showId);
  return show ? { show, episode } : undefined;
}

/** Every show's best episode, ranked -- used for generic "trending" style rows. */
export function trendingItems(): CatalogItem[] {
  return SHOWS.map((s) => bestEpisodeForShow(s.id))
    .filter((e): e is Episode => Boolean(e))
    .map((e) => toCatalogItem(e))
    .filter((c): c is CatalogItem => Boolean(c))
    .sort((a, b) => b.episode.rating - a.episode.rating);
}

/** Items of one kind (tv or movie), best episode/film each, ranked by rating. */
export function itemsByKind(kind: "tv" | "movie"): CatalogItem[] {
  return SHOWS.filter((s) => s.kind === kind)
    .map((s) => bestEpisodeForShow(s.id))
    .filter((e): e is Episode => Boolean(e))
    .map((e) => toCatalogItem(e))
    .filter((c): c is CatalogItem => Boolean(c))
    .sort((a, b) => b.episode.rating - a.episode.rating);
}
