"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { CatalogItem } from "@/data/types";
import { track } from "@/lib/analytics";
import TitleCard from "./TitleCard";

// A horizontal catalog row. Fires row_impression once when scrolled into view,
// and row_click when a card in it is opened. isFeature tags the "Watch While You
// Eat" row so the report can compare it against the generic-row baseline.
export default function Row({
  rowId,
  title,
  header,
  items,
  isFeature = false,
  onSelect,
}: {
  rowId: string;
  title?: string;
  header?: ReactNode;
  items: CatalogItem[];
  isFeature?: boolean;
  onSelect: (item: CatalogItem, source: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !seen.current) {
            seen.current = true;
            track("row_impression", { rowId, isFeature, count: items.length });
            obs.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rowId, isFeature, items.length]);

  function handleSelect(item: CatalogItem, source: string) {
    track("row_click", { rowId, isFeature, episodeId: item.episode.id });
    onSelect(item, source);
  }

  if (items.length === 0) return null;

  return (
    <section ref={ref} className="mb-8">
      {header
        ? header
        : title
          ? <h2 className="mb-2 px-4 text-lg font-semibold md:px-12">{title}</h2>
          : null}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2 md:px-12">
        {items.map((item) => (
          <TitleCard
            key={item.episode.id}
            item={item}
            rowId={rowId}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </section>
  );
}
