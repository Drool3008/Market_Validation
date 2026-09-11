"use client";

import { useEffect, useState } from "react";
import type { DemoProfile } from "@/data/types";

// label -> view id consumed by browse/page.tsx.
const LINKS: { label: string; view: string }[] = [
  { label: "Home", view: "home" },
  { label: "TV Shows", view: "tv" },
  { label: "Movies", view: "movies" },
  { label: "New & Hot", view: "new" },
  { label: "My List", view: "mylist" },
];

export default function Navbar({
  profile,
  onNav,
  activeView,
  onOpenSearch,
}: {
  profile: DemoProfile;
  onNav: (view: string) => void;
  activeView: string;
  onOpenSearch: () => void;
}) {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 flex items-center gap-6 px-4 py-3 transition-colors md:px-12 ${
        solid
          ? "bg-nfbg"
          : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <span className="text-2xl font-extrabold tracking-tight text-nfred">
        NETFLIX
      </span>
      <nav className="hidden gap-4 text-sm md:flex">
        {LINKS.map(({ label, view }) => (
          <button
            key={view}
            type="button"
            onClick={() => onNav(view)}
            aria-current={activeView === view ? "page" : undefined}
            className={
              activeView === view
                ? "font-semibold text-white"
                : "text-white/80 hover:text-white"
            }
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className="grid h-8 w-8 place-items-center rounded text-white/80 hover:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <span className="hidden text-sm text-white/70 sm:inline">
          {profile.name}
        </span>
        <span
          className="grid h-8 w-8 place-items-center rounded"
          style={{ background: profile.color }}
        >
          {profile.name.charAt(0)}
        </span>
      </div>
    </header>
  );
}
