"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogItem, Episode } from "@/data/types";
import { ALL_MOODS } from "@/data/types";
import { episodesForShow } from "@/data/catalog";
import { track, pathFor } from "@/lib/analytics";
import { inMyList, toggleMyList, getRating, setRating, subscribe } from "@/lib/prefs";
import type { Thumb } from "@/lib/prefs";
import { itemLabel } from "@/lib/display";
import { generateHeatmap } from "@/lib/heatmap";
import HeatmapScrubber from "./HeatmapScrubber";

const MOOD_LABEL = Object.fromEntries(ALL_MOODS.map((m) => [m.id, m.label]));

// Netflix-style detail overlay. The "start anywhere" best-moment experience
// (peak button + heatmap) is EXCLUSIVE to the Watch While You Eat feature; normal
// browsing gets a standard details modal so it reads as a clean control.
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
      path: pathFor(selection.source),
    });
  }, [selection]);

  // My List / rating state for the normal-branch buttons, kept live via subscribe()
  // so toggles here reflect on cards elsewhere (and vice-versa). Hooks must run
  // before the early return, so key off the nullable showId.
  const showId = selection?.item.show.id;
  const [inList, setInList] = useState(false);
  const [rating, setRatingState] = useState<Thumb | null>(null);
  useEffect(() => {
    if (!showId) return;
    const sync = () => {
      setInList(inMyList(showId));
      setRatingState(getRating(showId));
    };
    sync(); // hydrate from storage after mount (SSR renders defaults)
    return subscribe(sync);
  }, [showId]);

  if (!selection) return null;
  const { item, source } = selection;
  const { show, episode } = item;
  const fromFeature = source === "watch-while-you-eat";

  function close() {
    if (fromFeature) {
      track("feature_dwell", {
        episodeId: episode.id,
        ms: Date.now() - openedAt.current,
        path: pathFor(source),
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
    track("play_click", {
      episodeId: episode.id,
      from,
      t,
      source,
      path: pathFor(source),
    });
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

          {fromFeature ? (
            <>
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
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => play("start")}
                  className="rounded bg-white px-5 py-2 font-semibold text-black hover:bg-white/85"
                >
                  ▶ Play
                </button>
                <button
                  aria-label={inList ? "Remove from My List" : "Add to My List"}
                  aria-pressed={inList}
                  onClick={(e) => {
                    e.stopPropagation();
                    const added = toggleMyList(show.id);
                    track(added ? "mylist_add" : "mylist_remove", {
                      showId: show.id,
                      episodeId: episode.id,
                      path: pathFor(source),
                    });
                  }}
                  className={`grid h-10 w-10 place-items-center rounded-full border text-lg ${
                    inList ? "border-white bg-white text-black" : "border-white/40 hover:border-white"
                  }`}
                >
                  {inList ? "✓" : "＋"}
                </button>
                <button
                  aria-label="Rate thumbs up"
                  aria-pressed={rating === "up"}
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = rating === "up" ? null : "up";
                    setRating(show.id, next);
                    track("rating", {
                      showId: show.id,
                      value: next,
                      episodeId: episode.id,
                      path: pathFor(source),
                    });
                  }}
                  className={`grid h-10 w-10 place-items-center rounded-full border text-sm ${
                    rating === "up" ? "border-white bg-white text-black" : "border-white/40 hover:border-white"
                  }`}
                >
                  👍
                </button>
                <button
                  aria-label="Rate thumbs down"
                  aria-pressed={rating === "down"}
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = rating === "down" ? null : "down";
                    setRating(show.id, next);
                    track("rating", {
                      showId: show.id,
                      value: next,
                      episodeId: episode.id,
                      path: pathFor(source),
                    });
                  }}
                  className={`grid h-10 w-10 place-items-center rounded-full border text-sm ${
                    rating === "down" ? "border-white bg-white text-black" : "border-white/40 hover:border-white"
                  }`}
                >
                  👎
                </button>
              </div>

              {show.kind === "tv" && (
                <EpisodeList
                  showId={show.id}
                  posterUrl={show.posterUrl}
                  onPlayEpisode={(ep) => {
                    track("play_click", {
                      episodeId: ep.id,
                      from: "start",
                      t: 0,
                      source,
                      path: pathFor(source),
                    });
                    router.push(`/watch/${ep.id}?t=0`);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Episodes list with a season selector, for TV shows in the normal-browsing branch.
// Seed seasons are sparse (e.g. Breaking Bad = 3,4,5), so seasons come from the
// data, not a 1..N range. Hidden entirely when there's <= 1 episode.
function EpisodeList({
  showId,
  posterUrl,
  onPlayEpisode,
}: {
  showId: string;
  posterUrl?: string | null;
  onPlayEpisode: (ep: Episode) => void;
}) {
  const episodes = useMemo(
    () =>
      [...episodesForShow(showId)].sort(
        (a, b) => a.season - b.season || a.number - b.number,
      ),
    [showId],
  );
  const seasons = useMemo(
    () => [...new Set(episodes.map((e) => e.season))].sort((a, b) => a - b),
    [episodes],
  );
  const [season, setSeason] = useState(() => seasons[0]);

  if (episodes.length <= 1) return null;

  const shown = episodes.filter((e) => e.season === season);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Episodes</h3>
        {seasons.length > 1 && (
          <select
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            aria-label="Select season"
            className="rounded border border-white/30 bg-[#181818] px-3 py-1.5 text-sm text-white/90 hover:border-white/60 focus:outline-none"
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                Season {s}
              </option>
            ))}
          </select>
        )}
      </div>

      <ul className="divide-y divide-white/10">
        {shown.map((ep) => (
          <li key={ep.id}>
            <button
              onClick={() => onPlayEpisode(ep)}
              className="flex w-full items-center gap-3 rounded py-3 text-left hover:bg-white/5"
            >
              <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded bg-black/40">
                {(ep.stillUrl ?? posterUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ep.stillUrl ?? posterUrl ?? undefined}
                    alt={ep.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">
                    S{ep.season}:E{ep.number} · {ep.title}
                  </span>
                  <span className="shrink-0 text-xs text-white/50">
                    {ep.runtime} min
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-white/60">
                  {ep.synopsis}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
