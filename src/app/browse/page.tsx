"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogItem, DemoProfile } from "@/data/types";
import { getProfile } from "@/data/profiles";
import {
  SHOWS,
  bestEpisodeForShow,
  toCatalogItem,
  trendingItems,
  itemsByKind,
} from "@/data/catalog";
import { continueWatching } from "@/lib/feature";
import { getProfileId, track } from "@/lib/analytics";
import { MuteProvider } from "@/components/MuteContext";
import Navbar from "@/components/Navbar";
import Billboard from "@/components/Billboard";
import Row from "@/components/Row";
import WatchWhileYouEat from "@/components/WatchWhileYouEat";
import DetailModal from "@/components/DetailModal";

function genreRow(genre: string): CatalogItem[] {
  return SHOWS.filter((s) => s.genres.includes(genre))
    .map((s) => bestEpisodeForShow(s.id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .map((e) => toCatalogItem(e))
    .filter((c): c is CatalogItem => Boolean(c));
}

export default function Browse() {
  const router = useRouter();
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [ready, setReady] = useState(false);

  const [selection, setSelection] = useState<{
    item: CatalogItem;
    source: string;
  } | null>(null);

  const featureEngaged = useRef(false);
  const enteredAt = useRef(0);

  // Profile lives in localStorage, so read it only after mount to avoid a
  // server/client hydration mismatch.
  useEffect(() => {
    const p = getProfile(getProfileId());
    if (!p) {
      router.replace("/");
      return;
    }
    enteredAt.current = Date.now();
    setProfile(p);
    setReady(true);
    track("home_view", { profileId: p.id });

    const onLeave = () => {
      track("bounce", {
        seconds: Math.round((Date.now() - enteredAt.current) / 1000),
        featureEngaged: featureEngaged.current,
      });
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [router]);

  if (!ready || !profile) return null;

  const featured = continueWatching(profile)[0];

  function handleSelect(item: CatalogItem, source: string) {
    if (source === "watch-while-you-eat") featureEngaged.current = true;
    setSelection({ item, source });
  }

  return (
    <MuteProvider>
    <div className="min-h-screen bg-nfbg pb-16">
      <Navbar profile={profile} />

      {featured && <Billboard item={featured} onSelect={handleSelect} />}

      <div className="relative z-10 -mt-4">
        <Row
          rowId="continue-watching"
          title="Continue Watching"
          items={continueWatching(profile)}
          onSelect={handleSelect}
        />

        {/* Feature under test. Placement is a validation variable (README s.10). */}
        <WatchWhileYouEat profile={profile} onSelect={handleSelect} />

        <Row
          rowId="trending"
          title="Trending Now"
          items={trendingItems()}
          onSelect={handleSelect}
        />
        <Row
          rowId="movies"
          title="Movies"
          items={itemsByKind("movie")}
          onSelect={handleSelect}
        />
        <Row
          rowId="comedies"
          title="Comedies"
          items={genreRow("Comedy")}
          onSelect={handleSelect}
        />
        <Row
          rowId="crime-thriller"
          title="Crime & Thriller"
          items={genreRow("Thriller").length ? genreRow("Thriller") : genreRow("Crime")}
          onSelect={handleSelect}
        />
      </div>

      <DetailModal selection={selection} onClose={() => setSelection(null)} />
    </div>
    </MuteProvider>
  );
}
