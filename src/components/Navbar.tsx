"use client";

import { useEffect, useState } from "react";
import type { DemoProfile } from "@/data/types";

const LINKS = ["Home", "TV Shows", "Movies", "New & Hot", "My List"];

export default function Navbar({ profile }: { profile: DemoProfile }) {
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
      <nav className="hidden gap-4 text-sm text-white/80 md:flex">
        {LINKS.map((l) => (
          <a key={l} href="#" className="hover:text-white">
            {l}
          </a>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
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
