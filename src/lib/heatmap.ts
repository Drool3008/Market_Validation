// Synthetic "most-loved moment" curve for the episode scrubber.
// Confirmed dummy data: shaped to look believable with a clear peak. No real
// per-scene data is fetched. Deterministic per episode so it is stable across renders.

export interface HeatPoint {
  t: number; // seconds
  v: number; // 0..1 engagement
}

export interface Heatmap {
  points: HeatPoint[];
  peakT: number; // seconds of the "best moment"
  runtimeSec: number;
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gaussian bump helper. */
function bump(x: number, center: number, width: number): number {
  const d = (x - center) / width;
  return Math.exp(-0.5 * d * d);
}

export function generateHeatmap(episodeId: string, runtimeMin: number): Heatmap {
  const runtimeSec = Math.max(60, Math.round(runtimeMin * 60));
  const rng = mulberry32(hash(episodeId));
  const samples = 80;

  // Main peak biased toward the back half (climaxes land late), plus a smaller
  // secondary bump and a bit of noise.
  const peakFrac = 0.55 + rng() * 0.3; // 55%..85%
  const secFrac = 0.15 + rng() * 0.25;
  const peakT = Math.round(peakFrac * runtimeSec);

  const points: HeatPoint[] = [];
  for (let i = 0; i < samples; i++) {
    const frac = i / (samples - 1);
    let v =
      0.15 +
      0.8 * bump(frac, peakFrac, 0.06) +
      0.35 * bump(frac, secFrac, 0.05) +
      0.1 * rng();
    v = Math.min(1, Math.max(0.05, v));
    points.push({ t: Math.round(frac * runtimeSec), v });
  }

  return { points, peakT, runtimeSec };
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
