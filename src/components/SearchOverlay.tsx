"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogItem } from "@/data/types";
import { SHOWS, bestEpisodeForShow, toCatalogItem } from "@/data/catalog";
import { track } from "@/lib/analytics";
import TitleCard from "./TitleCard";

// Full-screen search over the catalog. Filters SHOWS by title substring and maps
// each match to its best episode. search_query is fired on a committed search
// (debounced ~400ms, or immediately on Enter) so we don't log per keystroke.
//
// ponytail: renders TitleCards directly instead of reusing GridView. GridView's
// onSelect wrapper fires row_click, which would pollute a search-result click
// with a spurious row_click on top of the required search_result_click.
export default function SearchOverlay({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (item: CatalogItem, source: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const results = useMemo<CatalogItem[]>(() => {
    if (!q) return [];
    return SHOWS.filter((s) => s.title.toLowerCase().includes(q))
      .map((s) => bestEpisodeForShow(s.id))
      .filter((e): e is NonNullable<typeof e> => Boolean(e))
      .map((e) => toCatalogItem(e))
      .filter((c): c is CatalogItem => Boolean(c));
  }, [q]);

  // Autofocus the input on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape closes the overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Debounced committed-search log: fire search_query ~400ms after typing stops.
  useEffect(() => {
    if (!q) return;
    const t = setTimeout(() => {
      track("search_query", { query: q, resultCount: results.length, path: "browse" });
    }, 400);
    return () => clearTimeout(t);
  }, [q, results.length]);

  function commitNow() {
    if (!q) return;
    track("search_query", { query: q, resultCount: results.length, path: "browse" });
  }

  function handleSelect(item: CatalogItem, source: string) {
    track("search_result_click", { query: q, episodeId: item.episode.id, path: "browse" });
    onSelect(item, source);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-nfbg/98">
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-nfbg px-4 py-4 md:px-12">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitNow();
          }}
          placeholder="Search titles"
          aria-label="Search titles"
          className="flex-1 rounded border border-white/20 bg-black/60 px-4 py-3 text-lg text-white outline-none focus:border-white/60"
        />
        <button
          onClick={onClose}
          aria-label="Close search"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-2xl text-white/80 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="px-4 pb-16 pt-6 md:px-12">
        {!q ? (
          <p className="text-white/60">Search for a show or movie by title.</p>
        ) : results.length === 0 ? (
          <p className="text-white/60">No matches for &ldquo;{query}&rdquo;.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {results.map((item) => (
              <TitleCard
                key={item.episode.id}
                item={item}
                rowId="search"
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
