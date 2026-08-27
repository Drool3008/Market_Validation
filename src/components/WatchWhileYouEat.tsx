"use client";

import { useMemo, useState } from "react";
import type { CatalogItem, DemoProfile, Mood } from "@/data/types";
import { ALL_MOODS } from "@/data/types";
import { buildFeatureRow } from "@/lib/feature";
import Row from "./Row";

// The feature under test. A themed row that sits among the normal Netflix rows,
// with mood filter chips. The heading + chips live OUTSIDE the Row so they never
// disappear when a mood filters everything out; an empty mood shows a message.
export default function WatchWhileYouEat({
  profile,
  onSelect,
}: {
  profile: DemoProfile;
  onSelect: (item: CatalogItem, source: string) => void;
}) {
  const [mood, setMood] = useState<Mood | null>(null);
  const items = useMemo(() => buildFeatureRow(profile, mood), [profile, mood]);
  const moodLabel = ALL_MOODS.find((m) => m.id === mood)?.label.toLowerCase();

  return (
    <div className="mb-8 rounded-lg py-4">
      <div className="mb-3 px-4 md:px-12">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-bold">Watch While You Eat</h2>
          <span className="text-sm text-white/50">
            the best episodes of your shows, ready to go
          </span>
        </div>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          <Chip active={mood === null} onClick={() => setMood(null)}>
            All
          </Chip>
          {ALL_MOODS.map((m) => (
            <Chip key={m.id} active={mood === m.id} onClick={() => setMood(m.id)}>
              {m.label}
            </Chip>
          ))}
        </div>
      </div>

      {items.length > 0 ? (
        <Row
          rowId="watch-while-you-eat"
          items={items}
          isFeature
          onSelect={onSelect}
        />
      ) : (
        <p className="px-4 text-sm text-white/50 md:px-12">
          No {moodLabel} picks from your shows yet. Try another mood.
        </p>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-white bg-white text-black"
          : "border-white/30 text-white/80 hover:border-white/60"
      }`}
    >
      {children}
    </button>
  );
}
