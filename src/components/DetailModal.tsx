"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { CatalogItem } from "@/data/types";
import { ALL_MOODS } from "@/data/types";
import { track } from "@/lib/analytics";
import { itemLabel } from "@/lib/display";
import { generateHeatmap } from "@/lib/heatmap";
import HeatmapScrubber from "./HeatmapScrubber";

const MOOD_LABEL = Object.fromEntries(ALL_MOODS.map((m) => [m.id, m.label]));

// Netflix-style detail overlay with the "start anywhere" choice.
export default function DetailModal({
  selection,
  onClose,
}: {
  selection: { item: CatalogItem; source: string } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const openedAt = useRef<number>(0);

  useEffect(() => {
    if (!selection) return;
    openedAt.current = Date.now();
    track("title_open", {
      showId: selection.item.show.id,
      episodeId: selection.item.episode.id,
      source: selection.source,
    });
  }, [selection]);

  if (!selection) return null;
  const { item, source } = selection;
  const { show, episode } = item;
  const fromFeature = source === "watch-while-you-eat";

  function close() {
    if (fromFeature) {
      track("feature_dwell", {
        episodeId: episode.id,
        ms: Date.now() - openedAt.current,
      });
    }
    onClose();
  }

  function play(from: "start" | "peak" | number) {
    const t =
      from === "start"
        ? 0
        : from === "peak"
          ? generateHeatmap(episode.id, episode.runtime).peakT
          : from;
    track("play_click", { episodeId: episode.id, from, t, source });
    router.push(`/watch/${episode.id}?t=${t}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-16"
      onClick={close}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-lg bg-[#181818] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative flex h-56 items-end p-6"
          style={{
            background: `linear-gradient(180deg, transparent 30%, #181818 100%), radial-gradient(120% 120% at 30% 20%, ${show.color} 0%, #0b0b0b 75%)`,
          }}
        >
          <button
            onClick={close}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-lg hover:bg-black/80"
            aria-label="Close"
          >
            ✕
          </button>
          <div>
            <h2 className="text-3xl font-extrabold">{show.title}</h2>
            <p className="text-sm text-white/70">{itemLabel(item).secondary}</p>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-green-400">
              ★ {episode.rating.toFixed(1)} loved
            </span>
            <span className="text-white/60">{episode.runtime} min</span>
            <span className="text-white/40">·</span>
            <div className="flex gap-1">
              {episode.moods.map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80"
                >
                  {MOOD_LABEL[m]}
                </span>
              ))}
            </div>
          </div>

          <p className="text-sm text-white/85">{episode.synopsis}</p>

          <div className="flex gap-3">
            <button
              onClick={() => play("start")}
              className="rounded bg-white px-5 py-2 font-semibold text-black hover:bg-white/85"
            >
              ▶ Start from Beginning
            </button>
            <button
              onClick={() => play("peak")}
              className="rounded bg-nfred px-5 py-2 font-semibold hover:bg-nfred/85"
            >
              ▶ Jump to the Best Moment
            </button>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-white/50">
              Most-loved moments · hover and click to start there
            </p>
            <HeatmapScrubber episode={episode} onSeek={(t) => play(t)} />
          </div>
        </div>
      </div>
    </div>
  );
}
