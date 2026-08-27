import type { DemoProfile } from "./types";

// Pre-seeded demo profiles. No real Netflix history exists, so these simulate it.
// The chosen profile drives the "Watch While You Eat" row and is logged for
// per-segment analysis in the report.

export const PROFILES: DemoProfile[] = [
  {
    id: "sitcom-unwinder",
    name: "The Sitcom Unwinder",
    color: "#e56b1f",
    tagline: "Cozy, funny comfort watches",
    historyShowIds: ["the-office", "brooklyn-99", "friends", "parks-and-rec"],
  },
  {
    id: "crime-junkie",
    name: "The Crime Junkie",
    color: "#1b4332",
    tagline: "Tense, gripping, edge-of-seat",
    historyShowIds: ["breaking-bad", "dark", "game-of-thrones", "stranger-things"],
  },
  {
    id: "prestige-bingeing",
    name: "The Prestige Bingeing",
    color: "#3a3a3a",
    tagline: "Heavy dramas and slow burns",
    historyShowIds: ["breaking-bad", "game-of-thrones", "dark"],
  },
  {
    id: "comfort-rewatcher",
    name: "The Comfort Rewatcher",
    color: "#6a4c93",
    tagline: "Feel-good reruns on repeat",
    historyShowIds: ["friends", "the-office", "parks-and-rec", "brooklyn-99"],
  },
];

export function getProfile(id: string | null | undefined): DemoProfile | undefined {
  if (!id) return undefined;
  return PROFILES.find((p) => p.id === id);
}
