"use client";

import { useMute } from "./MuteContext";

// Speaker toggle. Clicking it is the user gesture that lets the browser unmute.
export default function MuteButton({ className = "" }: { className?: string }) {
  const { muted, toggle } = useMute();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      aria-label={muted ? "Unmute" : "Mute"}
      className={`grid place-items-center rounded-full border border-white/40 bg-black/40 text-white hover:border-white ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
        {muted ? (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        ) : (
          <>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        )}
      </svg>
    </button>
  );
}
