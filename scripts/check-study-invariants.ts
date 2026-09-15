// Runnable self-check for the study invariants that quietly break the result if
// violated. Run with `pnpm check`. No framework: plain asserts, one file.
//
// Covers the things a build/lint pass cannot see:
//   1. the WWYE row is a realistic shelf on every profile (pilot feedback)
//   2. best-episode-per-show and rating-desc ordering still hold
//   3. mood filtering still returns picks
//   4. exposure-gated survey questions resolve correctly

import assert from "node:assert/strict";
import { PROFILES } from "../src/data/profiles";
import { buildFeatureRow } from "../src/lib/feature";
import { ALL_MOODS } from "../src/data/types";
import { POST, visibleQuestions, visibleOptions } from "../src/lib/survey";
import type { Exposure } from "../src/lib/exposure";

const MIN_ROW = 10;
let checks = 0;
const note = (s: string) => {
  checks++;
  console.log("  ok  " + s);
};

console.log("\nWWYE row composition");
for (const p of PROFILES) {
  const row = buildFeatureRow(p, null);
  const showIds = row.map((c) => c.show.id);
  const epIds = row.map((c) => c.episode.id);

  assert.ok(
    row.length >= MIN_ROW,
    `${p.id}: feature row has ${row.length} items, need >= ${MIN_ROW}`,
  );
  assert.equal(
    new Set(showIds).size,
    row.length,
    `${p.id}: more than one episode from the same show (best-episode-per-show broken)`,
  );
  assert.equal(new Set(epIds).size, row.length, `${p.id}: duplicate episode in the row`);
  for (let i = 1; i < row.length; i++) {
    assert.ok(
      row[i - 1].episode.rating >= row[i].episode.rating,
      `${p.id}: row is not sorted by rating descending`,
    );
  }
  // Every show in the history must actually resolve, or the row silently shrinks.
  assert.equal(
    row.length,
    p.historyShowIds.length,
    `${p.id}: ${p.historyShowIds.length - row.length} history show(s) missing from the catalog`,
  );

  const moodCounts = ALL_MOODS.map((m) => buildFeatureRow(p, m.id).length);
  assert.ok(
    moodCounts.some((n) => n > 0),
    `${p.id}: no mood filter returns any pick`,
  );
  note(
    `${p.id}: ${row.length} items, moods [${ALL_MOODS.map(
      (m, i) => `${m.id}:${moodCounts[i]}`,
    ).join(" ")}]`,
  );
}

console.log("\nExposure-gated post questions");
const ids = (qs: { id: string }[]) => qs.map((q) => q.id);
const none: Exposure = { clickedFeature: false, sawHeatmap: false, usedHeatmap: false };
const engaged: Exposure = { clickedFeature: true, sawHeatmap: false, usedHeatmap: false };
const full: Exposure = { clickedFeature: true, sawHeatmap: true, usedHeatmap: true };

// No exposure record at all (direct link / cleared storage) -> ask everything.
assert.deepEqual(
  ids(visibleQuestions(POST, null)),
  ids(POST),
  "null exposure must fall back to showing every question",
);
note("no exposure record -> all questions shown");

// Never engaged the WWYE row -> the picks questions are not asked.
const skipped = ids(visibleQuestions(POST, none));
assert.ok(!skipped.includes("post_q3"), "post_q3 asked of a non-engager");
assert.ok(!skipped.includes("post_q7"), "post_q7 asked of a non-engager");
note("no feature engagement -> post_q3 and post_q7 hidden");

// Engaged -> asked.
const shown = ids(visibleQuestions(POST, engaged));
assert.ok(shown.includes("post_q3"), "post_q3 hidden from an engager");
assert.ok(shown.includes("post_q7"), "post_q7 hidden from an engager");
note("feature engaged -> post_q3 and post_q7 shown");

// The heatmap option only appears for people who actually met the heatmap.
const q8 = POST.find((q) => q.id === "post_q8");
assert.ok(q8, "post_q8 missing");
const HEAT_OPT = "The jump-to-the-best-moment graph";
assert.ok(
  q8.options?.includes(HEAT_OPT),
  "post_q8 no longer carries the heatmap option under the expected text",
);
assert.ok(
  !visibleOptions(q8, engaged).includes(HEAT_OPT),
  "heatmap option offered to someone who never saw it",
);
assert.ok(
  visibleOptions(q8, full).includes(HEAT_OPT),
  "heatmap option hidden from someone who used it",
);
assert.ok(
  visibleOptions(q8, null).includes(HEAT_OPT),
  "null exposure must fall back to showing the heatmap option",
);
note("post_q8 heatmap option gated on heatmap exposure");

console.log(`\n${checks} checks passed\n`);
