"use client";

import { useMemo, useRef, useState } from "react";
import type { Episode } from "@/data/types";
import { generateHeatmap, formatTime } from "@/lib/heatmap";
import { track } from "@/lib/analytics";

// YouTube "most-replayed"-style curve over the episode timeline. Data is synthetic
// (see lib/heatmap). Hover fires scrubber_hover (throttled); click fires
// scrubber_interact and seeks the mock player to that timestamp.
export default function HeatmapScrubber({
  episode,
  onSeek,
}: {
  episode: Episode;
  onSeek: (t: number) => void;
}) {
  const heat = useMemo(
    () => generateHeatmap(episode.id, episode.runtime),
    [episode.id, episode.runtime],
  );
  const barRef = useRef<HTMLDivElement>(null);
  const lastHover = useRef(0);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  const areaPath = useMemo(() => {
    const n = heat.points.length;
    const pts = heat.points.map((p, i) => {
      const x = (i / (n - 1)) * 100;
      const y = 100 - p.v * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return `M0,100 L${pts.join(" L")} L100,100 Z`;
  }, [heat.points]);

  const peakFrac = heat.peakT / heat.runtimeSec;
  const nearPeak = hoverT !== null && Math.abs(hoverT - heat.peakT) < heat.runtimeSec * 0.06;

  function fracFromEvent(e: React.MouseEvent) {
    const el = barRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  }

  function handleMove(e: React.MouseEvent) {
    const frac = fracFromEvent(e);
    const t = Math.round(frac * heat.runtimeSec);
    setHoverT(t);
    setHoverX(frac * 100);
    const now = Date.now();
    if (now - lastHover.current > 200) {
      lastHover.current = now;
      track("scrubber_hover", { episodeId: episode.id, t });
    }
  }

  function handleClick(e: React.MouseEvent) {
    const t = Math.round(fracFromEvent(e) * heat.runtimeSec);
    track("scrubber_interact", { episodeId: episode.id, t });
    onSeek(t);
  }

  return (
    <div className="w-full">
      <div
        ref={barRef}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverT(null)}
        onClick={handleClick}
        className="relative h-16 w-full cursor-pointer overflow-visible"
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="heat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e50914" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e50914" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#heat)" />
          {/* peak marker */}
          <line
            x1={peakFrac * 100}
            y1="0"
            x2={peakFrac * 100}
            y2="100"
            stroke="#fff"
            strokeWidth="0.5"
            strokeDasharray="2 2"
            opacity="0.7"
          />
        </svg>

        {hoverT !== null && (
          <div
            className="pointer-events-none absolute -top-8 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs"
            style={{ left: `${hoverX}%` }}
          >
            {formatTime(hoverT)}
            {nearPeak && <span className="ml-1 text-nfred">· Most-loved scene</span>}
          </div>
        )}
        {hoverT !== null && (
          <div
            className="pointer-events-none absolute top-0 h-full w-px bg-white"
            style={{ left: `${hoverX}%` }}
          />
        )}
      </div>

      <div className="mt-1 flex justify-between text-[11px] text-white/50">
        <span>0:00</span>
        <span>Peak {formatTime(heat.peakT)}</span>
        <span>{formatTime(heat.runtimeSec)}</span>
      </div>
    </div>
  );
}
