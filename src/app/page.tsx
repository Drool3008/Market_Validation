"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PROFILES } from "@/data/profiles";
import type { DemoProfile } from "@/data/types";
import { track, setProfileId, getSessionId } from "@/lib/analytics";

// Netflix "Who's watching?" gate. The profiles are the demo personas that
// simulate watch history (see README section 9).
export default function ProfileGate() {
  const router = useRouter();

  useEffect(() => {
    getSessionId();
    track("session_start", { ua: navigator.userAgent, w: window.innerWidth });
  }, []);

  function pick(p: DemoProfile) {
    setProfileId(p.id);
    track("profile_selected", { profileId: p.id });
    router.push("/browse");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-nfbg">
      <h1 className="text-3xl font-medium text-white/90 md:text-5xl">
        Who&apos;s watching?
      </h1>
      <div className="flex flex-wrap justify-center gap-6">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            onClick={() => pick(p)}
            className="group flex w-32 flex-col items-center gap-2"
          >
            <span
              className="grid h-32 w-32 place-items-center rounded-md text-4xl font-bold text-white transition group-hover:ring-4 group-hover:ring-white"
              style={{ background: p.color }}
            >
              {p.name.charAt(0)}
            </span>
            <span className="text-center text-sm text-white/60 group-hover:text-white">
              {p.name}
            </span>
            <span className="text-center text-xs text-white/35">
              {p.tagline}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
