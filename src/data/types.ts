// Domain types for the Netflix look-alike catalog.
// Catalog is hand-seeded for Phase 1; the crawler (Phase 2) will regenerate it.

export type Mood =
  | "funny"
  | "cozy"
  | "tense"
  | "feelgood"
  | "emotional"
  | "mindbender";

export const ALL_MOODS: { id: Mood; label: string }[] = [
  { id: "funny", label: "Funny" },
  { id: "cozy", label: "Cozy" },
  { id: "feelgood", label: "Feel-good" },
  { id: "tense", label: "Tense" },
  { id: "emotional", label: "Emotional" },
  { id: "mindbender", label: "Mind-bender" },
];

export interface Show {
  id: string;
  title: string;
  kind: "tv" | "movie"; // a movie is a Show with a single film "episode"
  year: number;
  genres: string[];
  color: string; // gradient fallback behind the poster while/if no image
  description: string;
  posterUrl?: string | null; // filled by the Phase 2 crawler (TMDB)
  backdropUrl?: string | null;
  trailers?: Trailer[]; // ordered candidates; player falls through on embed failure
  trailerKey?: string | null; // legacy single YouTube id (back-compat)
}

export interface Trailer {
  site: "YouTube" | "Vimeo";
  key: string;
}

export interface Episode {
  id: string;
  showId: string;
  season: number;
  number: number;
  title: string;
  rating: number; // per-episode "most-loved" signal (community rating)
  runtime: number; // minutes
  moods: Mood[];
  synopsis: string;
  stillUrl?: string | null; // filled by the Phase 2 crawler (TMDB)
}

export interface CatalogItem {
  show: Show;
  episode: Episode;
}

export interface DemoProfile {
  id: string;
  name: string;
  color: string;
  tagline: string;
  historyShowIds: string[]; // the fake "watch history" that drives personalization
}
