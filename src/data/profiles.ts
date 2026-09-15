import type { DemoProfile } from "./types";

// Pre-seeded demo profiles. No real Netflix history exists, so these simulate it.
// The chosen profile drives the "Watch While You Eat" row and is logged for
// per-segment analysis in the report.
//
// historyShowIds is a profile's whole simulated watch history: it feeds BOTH the
// feature row (best episode per show) and Continue Watching. Each list is sized so
// the feature row renders a realistic shelf (>= 10 items before mood filtering)
// rather than the ~4 that made pilot testers judge the thin set, not the concept.
// Every entry is on-persona: no padding with low-rated or off-profile titles.

export const PROFILES: DemoProfile[] = [
  {
    id: "sitcom-unwinder",
    name: "The Sitcom Unwinder",
    color: "#e56b1f",
    tagline: "Cozy, funny comfort watches",
    historyShowIds: [
      "the-office",
      "brooklyn-99",
      "friends",
      "parks-and-rec",
      "the-simpsons",
      "family-guy",
      "futurama",
      "ted-lasso",
      "stuart-fails-to-save-the-universe",
      "the-rookie",
      "coyote-vs-acme",
      "the-invite",
      "accidental-partners",
      "toy-story-5",
    ],
  },
  {
    id: "crime-junkie",
    name: "The Crime Junkie",
    color: "#1b4332",
    tagline: "Tense, gripping, edge-of-seat",
    historyShowIds: [
      "breaking-bad",
      "better-call-saul",
      "dark",
      "fargo",
      "the-wire",
      "sherlock",
      "true-detective",
      "reacher",
      "the-mentalist",
      "ludwig",
      "bookish",
      "law-order-special-victims-unit",
      "stranger-things",
      "outer-banks",
    ],
  },
  {
    id: "prestige-bingeing",
    name: "The Prestige Bingeing",
    color: "#3a3a3a",
    tagline: "Heavy dramas and slow burns",
    historyShowIds: [
      "breaking-bad",
      "the-wire",
      "the-crown",
      "chernobyl",
      "better-call-saul",
      "true-detective",
      "game-of-thrones",
      "house-of-the-dragon",
      "greys-anatomy",
      "lioness",
      "silo",
      "black-mirror",
      "dark",
      "fargo",
    ],
  },
  {
    id: "comfort-rewatcher",
    name: "The Comfort Rewatcher",
    color: "#6a4c93",
    tagline: "Feel-good reruns on repeat",
    historyShowIds: [
      "friends",
      "the-office",
      "parks-and-rec",
      "brooklyn-99",
      "the-simpsons",
      "futurama",
      "family-guy",
      "ted-lasso",
      "greys-anatomy",
      "the-rookie",
      "moana",
      "spirited-away",
      "your-name",
      "dilwale-dulhania-le-jayenge",
    ],
  },
];

export function getProfile(id: string | null | undefined): DemoProfile | undefined {
  if (!id) return undefined;
  return PROFILES.find((p) => p.id === id);
}
