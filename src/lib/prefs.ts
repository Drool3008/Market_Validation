// Client-only localStorage for My List (keyed by showId) and thumbs ratings.
// No store/framework: components read on mount and may subscribe() for live sync
// across components (e.g. a ＋ toggle in the modal updating a card elsewhere).
// Callers fire the analytics events (mylist_add/remove, rating) so they can add
// episode/path context; this module is pure storage + notify.

const LIST_KEY = "wwye_mylist";
const RATING_KEY = "wwye_ratings";

export type Thumb = "up" | "down";

type Listener = () => void;
const listeners = new Set<Listener>();

/** Subscribe to My List / rating changes. Returns an unsubscribe fn. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function emit(): void {
  for (const fn of listeners) fn();
}

function readList(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(LIST_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function getMyList(): string[] {
  return readList();
}

export function inMyList(showId: string): boolean {
  return readList().includes(showId);
}

/** Add if absent, remove if present. Returns the new state (true = now in list). */
export function toggleMyList(showId: string): boolean {
  const list = readList();
  const i = list.indexOf(showId);
  let added: boolean;
  if (i >= 0) {
    list.splice(i, 1);
    added = false;
  } else {
    list.push(showId);
    added = true;
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  }
  emit();
  return added;
}

function readRatings(): Record<string, Thumb> {
  if (typeof window === "undefined") return {};
  try {
    const v = JSON.parse(localStorage.getItem(RATING_KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function getRating(showId: string): Thumb | null {
  return readRatings()[showId] ?? null;
}

/** Set (or clear, when r === null) a thumbs rating for a show. */
export function setRating(showId: string, r: Thumb | null): void {
  const map = readRatings();
  if (r === null) delete map[showId];
  else map[showId] = r;
  if (typeof window !== "undefined") {
    localStorage.setItem(RATING_KEY, JSON.stringify(map));
  }
  emit();
}
