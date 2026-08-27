// Guaranteed TV seed. These are always crawled (so demo profiles always resolve),
// then the crawler pulls hundreds more real TV + movies from TMDB discovery.
// `id` is the stable catalog id used by profiles -- do not change casually.

export interface SeedShow {
  id: string;
  name: string;
  color: string;
  tmdbId?: number; // optional: pin the exact TMDB show to skip search ambiguity
}

export const SEED_SHOWS: SeedShow[] = [
  { id: "breaking-bad", name: "Breaking Bad", color: "#1b4332", tmdbId: 1396 },
  { id: "better-call-saul", name: "Better Call Saul", color: "#8d6a1f", tmdbId: 60059 },
  { id: "the-office", name: "The Office", color: "#b8860b", tmdbId: 2316 },
  { id: "friends", name: "Friends", color: "#6a4c93", tmdbId: 1668 },
  { id: "brooklyn-99", name: "Brooklyn Nine-Nine", color: "#e56b1f", tmdbId: 48891 },
  { id: "parks-and-rec", name: "Parks and Recreation", color: "#2a9d8f", tmdbId: 8592 },
  { id: "community", name: "Community", color: "#c1440e" },
  { id: "its-always-sunny", name: "It's Always Sunny in Philadelphia", color: "#6b705c" },
  { id: "seinfeld", name: "Seinfeld", color: "#4361ee" },
  { id: "how-i-met-your-mother", name: "How I Met Your Mother", color: "#2a6f97" },
  { id: "game-of-thrones", name: "Game of Thrones", color: "#3a3a3a", tmdbId: 1399 },
  { id: "house-of-the-dragon", name: "House of the Dragon", color: "#5a189a" },
  { id: "stranger-things", name: "Stranger Things", color: "#7b0d1e", tmdbId: 66732 },
  { id: "dark", name: "Dark", color: "#16213e", tmdbId: 70523 },
  { id: "the-witcher", name: "The Witcher", color: "#4a4e69" },
  { id: "peaky-blinders", name: "Peaky Blinders", color: "#2b2d42" },
  { id: "mindhunter", name: "Mindhunter", color: "#22333b" },
  { id: "money-heist", name: "Money Heist", color: "#9d0208" },
  { id: "the-wire", name: "The Wire", color: "#344e41" },
  { id: "sherlock", name: "Sherlock", color: "#1d3557" },
  { id: "black-mirror", name: "Black Mirror", color: "#0b090a" },
  { id: "true-detective", name: "True Detective", color: "#3c2a21" },
  { id: "fargo", name: "Fargo", color: "#48466d" },
  { id: "chernobyl", name: "Chernobyl", color: "#414833" },
  { id: "the-crown", name: "The Crown", color: "#14213d" },
  { id: "the-mandalorian", name: "The Mandalorian", color: "#583101" },
];

// Palette assigned to discovered titles (which have no hand-picked color).
export const PALETTE = [
  "#1b4332", "#3a3a3a", "#1d3557", "#22333b", "#6a4c93", "#7b0d1e",
  "#2a9d8f", "#b8860b", "#48466d", "#9d0208", "#14213d", "#4a4e69",
  "#583101", "#344e41", "#6b705c", "#2b2d42",
];

export function colorFor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
