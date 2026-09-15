"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Episode } from "@/data/types";
import { generateHeatmap, formatTime } from "@/lib/heatmap";
import { track } from "@/lib/analytics";
import { markExposure } from "@/lib/exposure";

// YouTube "most-replayed"-style curve over the episode timeline. Data is synthetic
// (see lib/heatmap).
//
// Works on pointer AND touch. Hover was the only way in until pilot testing found
// the obvious: phones have no hover, so the target audience could never reach the
// signature mechanic. A tap now reveals the curve at the touched point and seeks
// there -- the same decision a desktop click makes, so scrubber_interact.t keeps
// meaning "the moment they chose" on both. Jumping to the peak stays the separate
// "Jump to the Best Moment" button's job.
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
  // A tap emits touchend AND a synthesized click; without this the seek and the
  // scrubber_interact event would both fire twice for one gesture.
  const lastTouch = useRef(0);
  // On touch the revealed curve stays put: there is no pointer to "leave" with.
  const isTouch = useRef(false);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  // Rendered in front of them = exposed, whether or not they touch it. Gates the
  // post-survey question about this mechanic (see lib/exposure).
  useEffect(() => {
    markExposure("sawHeatmap");
  }, []);

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

  function fracFromX(clientX: number) {
    const el = barRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  /** Reveal the curve at this x. Shared by hover and touch-drag. */
  function reveal(clientX: number) {
    const frac = fracFromX(clientX);
    const t = Math.round(frac * heat.runtimeSec);
    setHoverT(t);
    setHoverX(frac * 100);
    const now = Date.now();
    if (now - lastHover.current > 200) {
      lastHover.current = now;
      track("scrubber_hover", { episodeId: episode.id, t });
    }
    return t;
  }

  /** Commit a seek at this x. Shared by click and tap. */
  function commit(clientX: number) {
    const t = Math.round(fracFromX(clientX) * heat.runtimeSec);
    markExposure("usedHeatmap");
    track("scrubber_interact", { episodeId: episode.id, t });
    onSeek(t);
  }

  return (
    <div className="w-full">
      <div
        ref={barRef}
        onMouseMove={(e) => reveal(e.clientX)}
        onMouseLeave={() => {
          if (!isTouch.current) setHoverT(null);
        }}
        onClick={(e) => {
          if (Date.now() - lastTouch.current < 600) return; // synthesized after tap
          commit(e.clientX);
        }}
        onTouchStart={(e) => {
          isTouch.current = true;
          reveal(e.touches[0].clientX);
        }}
        onTouchMove={(e) => reveal(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          lastTouch.current = Date.now();
          const touch = e.changedTouches[0];
          if (touch) commit(touch.clientX);
        }}
        role="slider"
        tabIndex={0}
        aria-label="Most-loved moments. Tap or click the timeline to start there."
        aria-valuemin={0}
        aria-valuemax={heat.runtimeSec}
        aria-valuenow={hoverT ?? 0}
        aria-valuetext={hoverT === null ? "Not set" : formatTime(hoverT)}
        onKeyDown={(e) => {
          // Keyboard route to the same decision, for anyone not using a pointer.
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            markExposure("usedHeatmap");
            track("scrubber_interact", { episodeId: episode.id, t: heat.peakT });
            onSeek(heat.peakT);
          }
        }}
        className="relative h-16 w-full cursor-pointer touch-none select-none overflow-visible focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
            className="pointer-events-none absolute -top-24 -translate-x-1/2 overflow-hidden rounded bg-black shadow-lg"
            style={{ left: `${hoverX}%` }}
          >
            {episode.stillUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={episode.stillUrl}
                alt=""
                className="h-16 w-28 object-cover"
                draggable={false}
              />
            )}
            <div className="whitespace-nowrap px-2 py-1 text-center text-xs">
              {formatTime(hoverT)}
              {nearPeak && <span className="ml-1 text-nfred">· Most-loved</span>}
            </div>
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
