"use client";

import type { CatalogItem } from "@/data/types";
import { track } from "@/lib/analytics";
import TitleCard from "./TitleCard";

// A vertical, responsive catalog grid used by the non-home nav views (TV Shows,
// Movies, New & Hot, My List) and by SearchOverlay. TitleCard fires card_hover
// but not the click event (that lives in Row.tsx, which we don't touch here), so
// we replicate the row_click log in the onSelect wrapper below.
export default function GridView({
  title,
  items,
  onSelect,
  sourcePrefix,
  emptyText,
}: {
  title: string;
  items: CatalogItem[];
  onSelect: (item: CatalogItem, source: string) => void;
  sourcePrefix: string;
  emptyText?: string;
}) {
  function handleSelect(item: CatalogItem, source: string) {
    track("row_click", {
      rowId: sourcePrefix,
      isFeature: false,
      episodeId: item.episode.id,
      path: "browse",
    });
    onSelect(item, source);
  }

  return (
    <section className="px-4 pt-24 md:px-12">
      <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
      {items.length === 0 ? (
        <p className="text-white/60">{emptyText ?? "Nothing here yet"}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <TitleCard
              key={item.episode.id}
              item={item}
              rowId={sourcePrefix}
              onSelect={handleSelect}
              fill
            />
          ))}
        </div>
      )}
    </section>
  );
}
