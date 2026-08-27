"use client";

import { useEffect, useRef, useState } from "react";
import type { Trailer } from "@/data/types";
import { useMute } from "./MuteContext";

// Plays the first trailer that will embed. YouTube trailers use the IFrame API so
// we can (a) catch the embed error and advance to the next candidate, and (b) keep
// the iframe hidden until it is actually PLAYING -- so the YouTube thumbnail + title
// card never flash; the image underneath shows during load. Vimeo is a chromeless
// muted background loop (rare, ordered last).

interface YTPlayer {
  mute(): void;
  unMute(): void;
  setVolume(v: number): void;
  playVideo(): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: unknown) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    });
  }
  return apiPromise;
}

export default function TrailerPlayer({
  trailers,
  cover = false,
  className = "",
}: {
  trailers: Trailer[];
  cover?: boolean;
  className?: string;
}) {
  const { muted } = useMute();
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [trailers]);

  const current = failed ? undefined : trailers[idx];

  function advance() {
    setReady(false);
    setPlaying(false);
    if (idx + 1 < trailers.length) setIdx(idx + 1);
    else setFailed(true);
  }

  useEffect(() => {
    if (!current || current.site !== "YouTube") return;
    let cancelled = false;
    setReady(false);
    setPlaying(false);
    loadApi().then(() => {
      if (cancelled || !holder.current || !window.YT) return;
      playerRef.current = new window.YT.Player(holder.current, {
        videoId: current.key,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          loop: 1,
          playlist: current.key,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          disablekb: 1,
          iv_load_policy: 3,
          fs: 0,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            setReady(true);
            e.target.playVideo();
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === 1) setPlaying(true); // 1 = PLAYING
          },
          onError: () => advance(),
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* already gone */
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.site, current?.key]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p || !ready) return;
    try {
      if (muted) p.mute();
      else {
        p.unMute();
        p.setVolume(100);
      }
    } catch {
      /* not ready */
    }
  }, [muted, ready]);

  if (!current) return null;

  // Vimeo background mode has no thumbnail/title, so it is visible immediately.
  const visible = current.site === "Vimeo" || playing;

  const media =
    current.site === "YouTube" ? (
      <div ref={holder} className="h-full w-full" />
    ) : (
      <iframe
        src={`https://player.vimeo.com/video/${current.key}?background=1&autoplay=1&muted=1&loop=1`}
        allow="autoplay"
        title="preview"
        className="h-full w-full"
      />
    );

  // Enlarge + center so YouTube's top title strip / bottom bar sit outside the box.
  const inner = cover
    ? "absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
    : "absolute inset-[-14%]";

  return (
    <div className={`pointer-events-none overflow-hidden ${className}`}>
      <div
        className={`${inner} transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        {media}
      </div>
    </div>
  );
}
