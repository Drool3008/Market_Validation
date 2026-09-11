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
import { getMyList, subscribe } from "@/lib/prefs";
import { getProfileId, track } from "@/lib/analytics";
import { MuteProvider } from "@/components/MuteContext";
import Navbar from "@/components/Navbar";
import Billboard from "@/components/Billboard";
import Row from "@/components/Row";
import WatchWhileYouEat from "@/components/WatchWhileYouEat";
import DetailModal from "@/components/DetailModal";
import GridView from "@/components/GridView";
import SearchOverlay from "@/components/SearchOverlay";

type View = "home" | "tv" | "movies" | "new" | "mylist";

// "New & Hot" proxy: there is no real recency field, so rank every show's best
// episode by show.year DESC (intentional stand-in, see task spec).
function newAndHotItems(): CatalogItem[] {
  return [...SHOWS]
    .sort((a, b) => b.year - a.year)
    .map((s) => bestEpisodeForShow(s.id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .map((e) => toCatalogItem(e))
    .filter((c): c is CatalogItem => Boolean(c));
}

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

  const [view, setView] = useState<View>("home");
  const [searchOpen, setSearchOpen] = useState(false);
  const [myList, setMyList] = useState<CatalogItem[]>([]);

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
    // Profile is a client-only value read from localStorage after mount, so this
    // setState-in-effect is the intended external sync (see note above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // My List is localStorage-backed: read after mount and stay in sync when a ＋
  // toggle elsewhere fires prefs.subscribe().
  useEffect(() => {
    const load = () =>
      setMyList(
        getMyList()
          .map((id) => bestEpisodeForShow(id))
          .filter((e): e is NonNullable<typeof e> => Boolean(e))
          .map((e) => toCatalogItem(e))
          .filter((c): c is CatalogItem => Boolean(c)),
      );
    load();
    return subscribe(load);
  }, []);

  if (!ready || !profile) return null;

  const featured = continueWatching(profile)[0];

  function handleSelect(item: CatalogItem, source: string) {
    if (source === "watch-while-you-eat") featureEngaged.current = true;
    setSelection({ item, source });
  }

  return (
    <MuteProvider>
    <div className="min-h-screen bg-nfbg pb-16">
      <Navbar
        profile={profile}
        activeView={view}
        onNav={(v) => {
          setView(v as View);
          track("nav_click", { destination: v, path: "browse" });
        }}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {view === "home" ? (
        <>
          {featured && <Billboard item={featured} onSelect={handleSelect} />}

          <div className="relative z-10 -mt-4">
            <Row
              rowId="continue-watching"
              title="Continue Watching"
              items={continueWatching(profile)}
              showProgress
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
              rowId="top10"
              title="Top 10 Today"
              items={trendingItems().slice(0, 10)}
              numbered
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
        </>
      ) : view === "tv" ? (
        <GridView
          title="TV Shows"
          items={itemsByKind("tv")}
          onSelect={handleSelect}
          sourcePrefix="browse-tv"
        />
      ) : view === "movies" ? (
        <GridView
          title="Movies"
          items={itemsByKind("movie")}
          onSelect={handleSelect}
          sourcePrefix="browse-movies"
        />
      ) : view === "new" ? (
        <GridView
          title="New & Hot"
          items={newAndHotItems()}
          onSelect={handleSelect}
          sourcePrefix="browse-new"
        />
      ) : (
        <GridView
          title="My List"
          items={myList}
          onSelect={handleSelect}
          sourcePrefix="browse-mylist"
          emptyText="Your list is empty. Add titles with the ＋ button."
        />
      )}

      <DetailModal selection={selection} onClose={() => setSelection(null)} />

      {searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onSelect={(item, source) => {
            handleSelect(item, source);
            setSearchOpen(false);
          }}
        />
      )}
    </div>
    </MuteProvider>
  );
}
