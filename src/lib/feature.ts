import type { CatalogItem, Mood } from "@/data/types";
import { bestEpisodeForShow, toCatalogItem } from "@/data/catalog";
import type { DemoProfile } from "@/data/types";

// Builds the "Watch While You Eat" row: for each show in the profile's history,
// take its single most-loved episode, optionally filtered by mood, ranked by rating.

export function buildFeatureRow(
  profile: DemoProfile,
  mood?: Mood | null,
): CatalogItem[] {
  const items = profile.historyShowIds
    .map((showId) => bestEpisodeForShow(showId))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .map((e) => toCatalogItem(e))
    .filter((c): c is CatalogItem => Boolean(c));

  const filtered = mood
    ? items.filter((c) => c.episode.moods.includes(mood))
    : items;

  return filtered.sort((a, b) => b.episode.rating - a.episode.rating);
}

/** Continue Watching = the profile's shows, best episode each, in history order. */
export function continueWatching(profile: DemoProfile): CatalogItem[] {
  return profile.historyShowIds
    .map((showId) => bestEpisodeForShow(showId))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .map((e) => toCatalogItem(e))
    .filter((c): c is CatalogItem => Boolean(c));
}
