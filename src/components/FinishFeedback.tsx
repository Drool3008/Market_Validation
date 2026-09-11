"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getSessionId } from "@/lib/analytics";

// Always-available prototype end state. A small floating link to the post survey
// so abandoners (who never reach the player) can still finish. Hidden on the
// survey routes themselves. Reads the live session id so ?sid= joins events + pre.
export default function FinishFeedback() {
  const pathname = usePathname();
  const [sid, setSid] = useState<string | null>(null);

  // Session id lives in sessionStorage (client-only), so read after mount to
  // avoid a hydration mismatch. Skip on /survey/* so we never mint an id before
  // the pre survey's ?sid= seeds it; re-read on each navigation so the link
  // reflects the live (seeded) id rather than a stale mount-time value.
  useEffect(() => {
    if (pathname.startsWith("/survey")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSid(getSessionId());
  }, [pathname]);

  if (!sid || pathname.startsWith("/survey")) return null;

  return (
    <a
      href={`/survey/post?sid=${sid}`}
      className="fixed bottom-8 right-4 z-[90] rounded-full bg-nfred px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-nfred/90"
    >
      Finish &amp; give feedback
    </a>
  );
}
