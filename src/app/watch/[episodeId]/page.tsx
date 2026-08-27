"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getEpisode, getShow } from "@/data/catalog";
import { generateHeatmap, formatTime } from "@/lib/heatmap";

// Mock player. No real video (README s.4) -- we measure intent and browse, not
// watching. A moving playhead over the heatmap sells "it's playing".
export default function Watch() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <WatchInner />
    </Suspense>
  );
}

function WatchInner() {
  const router = useRouter();
  const params = useParams<{ episodeId: string }>();
  const search = useSearchParams();
  const episode = getEpisode(params.episodeId);
  const show = episode ? getShow(episode.showId) : undefined;

  const startT = Number(search.get("t") ?? 0);
  const [pos, setPos] = useState(startT);

  const heat = useMemo(
    () => (episode ? generateHeatmap(episode.id, episode.runtime) : null),
    [episode],
  );

  useEffect(() => {
    setPos(startT);
    const id = setInterval(() => {
      setPos((p) => (heat ? Math.min(heat.runtimeSec, p + 1) : p));
    }, 1000);
    return () => clearInterval(id);
  }, [startT, heat]);

  if (!episode || !show || !heat) {
    return (
      <div className="grid min-h-screen place-items-center bg-black text-white/60">
        Episode not found.
      </div>
    );
  }

  const areaPath = (() => {
    const n = heat.points.length;
    const pts = heat.points.map((p, i) => {
      const x = (i / (n - 1)) * 100;
      const y = 100 - p.v * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return `M0,100 L${pts.join(" L")} L100,100 Z`;
  })();

  const posFrac = (pos / heat.runtimeSec) * 100;

  return (
    <div
      className="relative flex min-h-screen flex-col justify-between bg-black"
      style={{
        background: `radial-gradient(120% 100% at 50% 30%, ${show.color}55 0%, #000 70%)`,
      }}
    >
      <button
        onClick={() => router.back()}
        className="absolute left-4 top-4 z-10 rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
      >
        ← Back
      </button>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm uppercase tracking-widest text-white/50">
          Now playing
        </p>
        <h1 className="text-4xl font-extrabold md:text-6xl">{show.title}</h1>
        <p className="text-white/70">
          S{episode.season} E{episode.number} · {episode.title}
        </p>
        <p className="mt-2 text-sm text-white/40">
          {startT > 0 ? `Started at the most-loved moment · ${formatTime(startT)}` : "Playing from the start"}
        </p>
      </div>

      <div className="px-6 pb-10">
        <div className="relative h-12 w-full">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            <defs>
              <linearGradient id="pheat" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e50914" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#e50914" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#pheat)" />
          </svg>
          <div
            className="absolute top-0 h-full w-0.5 bg-white"
            style={{ left: `${posFrac}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-white/50">
          <span>{formatTime(pos)}</span>
          <span>{formatTime(heat.runtimeSec)}</span>
        </div>
      </div>
    </div>
  );
}
