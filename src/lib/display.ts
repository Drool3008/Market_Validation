import type { CatalogItem, Show, Trailer } from "@/data/types";

// Ordered trailer candidates for a show. Falls back to the legacy single key.
export function showTrailers(show: Show): Trailer[] {
  if (show.trailers?.length) return show.trailers;
  if (show.trailerKey) return [{ site: "YouTube", key: show.trailerKey }];
  return [];
}

// One place for the movie-vs-TV label difference. Movies show "Film · year";
// TV shows show "S{n} E{n} · episode title".
export function itemLabel(item: CatalogItem): { primary: string; secondary: string } {
  const { show, episode } = item;
  if (show.kind === "movie") {
    return { primary: show.title, secondary: `Film · ${show.year}` };
  }
  return {
    primary: show.title,
    secondary: `S${episode.season} E${episode.number} · ${episode.title}`,
  };
}
