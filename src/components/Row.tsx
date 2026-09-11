"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { CatalogItem } from "@/data/types";
import { track, pathFor } from "@/lib/analytics";
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
  showProgress = false,
  numbered = false,
  onSelect,
}: {
  rowId: string;
  title?: string;
  header?: ReactNode;
  items: CatalogItem[];
  isFeature?: boolean;
  showProgress?: boolean;
  numbered?: boolean;
  onSelect: (item: CatalogItem, source: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: 1 | -1) {
    scrollRef.current?.scrollBy({ left: dir * scrollRef.current.clientWidth * 0.9, behavior: "smooth" });
  }

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
    track("row_click", {
      rowId,
      isFeature,
      episodeId: item.episode.id,
      path: pathFor(source),
    });
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
      <div className="group/row relative">
        <button
          aria-label="Scroll left"
          onClick={() => scroll(-1)}
          className="absolute left-0 top-0 z-20 hidden h-full w-12 items-center justify-center bg-gradient-to-r from-black/70 to-transparent text-3xl text-white opacity-0 transition-opacity hover:from-black/90 group-hover/row:opacity-100 md:flex"
        >
          ‹
        </button>
        <div
          ref={scrollRef}
          className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2 md:px-12"
        >
          {items.map((item, i) => (
            <div
              key={item.episode.id}
              className={numbered ? "flex shrink-0 items-end" : "contents"}
            >
              {numbered && (
                <span
                  aria-hidden
                  className="-mr-4 select-none text-[6rem] font-black leading-none text-black [-webkit-text-stroke:2px_rgba(255,255,255,0.55)] sm:text-[8rem] md:text-[10rem]"
                >
                  {i + 1}
                </span>
              )}
              <TitleCard
                item={item}
                rowId={rowId}
                showProgress={showProgress}
                onSelect={handleSelect}
              />
            </div>
          ))}
        </div>
        <button
          aria-label="Scroll right"
          onClick={() => scroll(1)}
          className="absolute right-0 top-0 z-20 hidden h-full w-12 items-center justify-center bg-gradient-to-l from-black/70 to-transparent text-3xl text-white opacity-0 transition-opacity hover:from-black/90 group-hover/row:opacity-100 md:flex"
        >
          ›
        </button>
      </div>
    </section>
  );
}
