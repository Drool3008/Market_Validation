"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CatalogItem } from "@/data/types";
import { track } from "@/lib/analytics";
import { itemLabel, showTrailers } from "@/lib/display";
import TrailerPlayer from "./TrailerPlayer";
import MuteButton from "./MuteButton";

const HOVER_DELAY = 450;

// Deterministic fake "continue watching" progress so the preview matches Netflix.
function fakeProgress(id: string, runtime: number) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const frac = 0.2 + (h % 60) / 100; // 0.20 .. 0.79
  return { frac, watched: Math.max(1, Math.round(frac * runtime)) };
}

export default function TitleCard({
  item,
  rowId,
  onSelect,
}: {
  item: CatalogItem;
  rowId: string;
  onSelect: (item: CatalogItem, source: string) => void;
}) {
  const { show, episode } = item;
  const label = itemLabel(item);
  const trailers = showTrailers(show);
  const artUrl = episode.stillUrl ?? show.posterUrl;
  const labelVisibility = artUrl ? "opacity-0 group-hover:opacity-100" : "opacity-100";

  const tileRef = useRef<HTMLButtonElement>(null);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [preview, setPreview] = useState(false);
  const [render, setRender] = useState(false); // stays mounted through the exit anim
  const [entered, setEntered] = useState(false); // drives the scale/opacity
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => {
      clearTimeout(enterTimer.current);
      clearTimeout(leaveTimer.current);
    };
  }, []);

  // Open: mount, then grow+fade in on the next frame.
  // Close: fade+shrink out, then unmount after the transition finishes.
  useEffect(() => {
    if (preview) {
      setRender(true);
      const r = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(r);
    }
    setEntered(false);
    const t = setTimeout(() => setRender(false), 300);
    return () => clearTimeout(t);
  }, [preview]);

  // The popover is viewport-fixed, so dismiss it on scroll/resize instead of
  // letting it drift away from its card (capture:true also catches row scroll).
  useEffect(() => {
    if (!preview) return;
    const close = () => {
      clearTimeout(enterTimer.current);
      clearTimeout(leaveTimer.current);
      setPreview(false);
    };
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [preview]);

  function open() {
    if (tileRef.current) setRect(tileRef.current.getBoundingClientRect());
    setPreview(true);
    track("card_hover", { showId: show.id, episodeId: episode.id, rowId });
  }
  function onTileEnter() {
    clearTimeout(leaveTimer.current);
    enterTimer.current = setTimeout(open, HOVER_DELAY);
  }
  function scheduleClose() {
    clearTimeout(enterTimer.current);
    leaveTimer.current = setTimeout(() => setPreview(false), 140);
  }
  function keepOpen() {
    clearTimeout(leaveTimer.current);
  }

  const prog = fakeProgress(episode.id, episode.runtime);

  // Popover geometry: wider than the tile, centered on it, clamped to viewport.
  const popover = (() => {
    if (!rect) return null;
    const w = Math.min(360, Math.max(260, rect.width * 1.5));
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - w / 2),
      window.innerWidth - w - 8,
    );
    const top = Math.max(8, rect.top - 28);
    return { w, left, top };
  })();

  return (
    <>
      <button
        ref={tileRef}
        onMouseEnter={onTileEnter}
        onMouseLeave={scheduleClose}
        onClick={() => onSelect(item, rowId)}
        className="group relative aspect-video w-44 shrink-0 overflow-hidden rounded-lg text-left sm:w-56 md:w-64"
        style={{ background: `linear-gradient(135deg, ${show.color} 0%, #0b0b0b 120%)` }}
      >
        {artUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artUrl} alt={show.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-60" />
        <div className={`absolute inset-0 flex flex-col justify-end p-3 transition-opacity duration-200 ${labelVisibility}`}>
          <span className="text-sm font-bold leading-tight drop-shadow">{label.primary}</span>
          <span className="mt-0.5 text-[11px] text-white/70">{label.secondary}</span>
        </div>
      </button>

      {mounted &&
        render &&
        popover &&
        createPortal(
          <div
            onMouseEnter={keepOpen}
            onMouseLeave={scheduleClose}
            style={{ position: "fixed", left: popover.left, top: popover.top, width: popover.w }}
            className={`z-[60] origin-center overflow-hidden rounded-xl bg-[#181818] shadow-2xl shadow-black/70 ring-1 ring-white/10 transition duration-300 ease-out will-change-transform ${
              entered ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          >
            {/* media */}
            <div className="relative aspect-video w-full bg-black">
              {artUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artUrl} alt={show.title} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${show.color}, #0b0b0b)` }} />
              )}
              {trailers.length > 0 && (
                <TrailerPlayer trailers={trailers} className="absolute inset-0 h-full w-full" />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent" />
              <span className="absolute bottom-2 left-3 text-lg font-extrabold drop-shadow">{show.title}</span>
              {trailers.length > 0 && <MuteButton className="absolute bottom-2 right-3 h-8 w-8" />}
            </div>

            {/* controls + info */}
            <div className="space-y-2 p-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelect(item, rowId)}
                  aria-label="Play"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-black hover:bg-white/80"
                >
                  ▶
                </button>
                <IconBtn label="Add to list">+</IconBtn>
                <IconBtn label="Like">♥</IconBtn>
                <button
                  onClick={() => onSelect(item, rowId)}
                  aria-label="More info"
                  className="ml-auto grid h-9 w-9 place-items-center rounded-full border border-white/40 hover:border-white"
                >
                  ⌄
                </button>
              </div>

              <p className="text-sm font-semibold text-white/85">{label.secondary}</p>

              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded bg-white/25">
                  <div className="h-full bg-nfred" style={{ width: `${prog.frac * 100}%` }} />
                </div>
                <span className="shrink-0 text-[11px] text-white/60">
                  {prog.watched} of {episode.runtime}m
                </span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function IconBtn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      className="grid h-9 w-9 place-items-center rounded-full border border-white/40 text-sm hover:border-white"
    >
      {children}
    </button>
  );
}
