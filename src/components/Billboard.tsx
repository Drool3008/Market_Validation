"use client";

import type { CatalogItem } from "@/data/types";
import { showTrailers } from "@/lib/display";
import TrailerPlayer from "./TrailerPlayer";
import MuteButton from "./MuteButton";

// The Netflix hero billboard. Play opens the same detail flow as a card.
export default function Billboard({
  item,
  onSelect,
}: {
  item: CatalogItem;
  onSelect: (item: CatalogItem, source: string) => void;
}) {
  const { show } = item;
  const trailers = showTrailers(show);
  return (
    <div
      className="relative flex h-[70vh] min-h-[420px] items-end"
      style={{
        background: `radial-gradient(120% 120% at 20% 20%, ${show.color} 0%, #0b0b0b 70%)`,
      }}
    >
      {show.backdropUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={show.backdropUrl}
          alt={show.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {trailers.length > 0 && (
        <TrailerPlayer trailers={trailers} cover className="absolute inset-0" />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%), linear-gradient(180deg, transparent 40%, #141414 100%)",
        }}
      />
      {trailers.length > 0 && (
        <MuteButton className="absolute right-4 top-24 z-20 h-10 w-10 md:right-12" />
      )}
      <div className="relative z-10 max-w-xl px-4 pb-16 md:px-12">
        <h1 className="text-4xl font-extrabold drop-shadow-lg md:text-6xl">
          {show.title}
        </h1>
        <p className="mt-4 text-sm text-white/85 md:text-base">
          {show.description}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => onSelect(item, "billboard")}
            className="flex items-center gap-2 rounded bg-white px-6 py-2 font-semibold text-black hover:bg-white/85"
          >
            ▶ Play
          </button>
          <button
            onClick={() => onSelect(item, "billboard")}
            className="flex items-center gap-2 rounded bg-white/25 px-6 py-2 font-semibold text-white hover:bg-white/20"
          >
            More Info
          </button>
        </div>
      </div>
    </div>
  );
}
