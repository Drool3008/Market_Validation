import type { Mood } from "../src/data/types";

// Mood tags are a curated/heuristic layer (README s.7.2): TMDB has no "mood",
// so we derive plausible moods from genres. Hand-tune per-episode later if needed.

const GENRE_MOODS: Record<string, Mood[]> = {
  Comedy: ["funny", "cozy", "feelgood"],
  Family: ["cozy", "feelgood"],
  Kids: ["cozy", "feelgood"],
  Drama: ["emotional"],
  Crime: ["tense"],
  Mystery: ["tense", "mindbender"],
  // TV genre names
  "Sci-Fi & Fantasy": ["mindbender", "tense"],
  "Action & Adventure": ["tense"],
  "War & Politics": ["tense", "emotional"],
  // movie genre names
  "Science Fiction": ["mindbender", "tense"],
  Fantasy: ["mindbender"],
  Action: ["tense"],
  Adventure: ["tense", "feelgood"],
  Thriller: ["tense"],
  Horror: ["tense"],
  Romance: ["feelgood", "emotional"],
  History: ["emotional"],
  Western: ["tense"],
  War: ["tense", "emotional"],
  Animation: ["funny", "feelgood"],
  Documentary: ["emotional"],
};

export function moodsForGenres(genres: string[]): Mood[] {
  const set = new Set<Mood>();
  for (const g of genres) {
    for (const m of GENRE_MOODS[g] ?? []) set.add(m);
  }
  if (set.size === 0) set.add("emotional");
  return Array.from(set).slice(0, 3);
}
