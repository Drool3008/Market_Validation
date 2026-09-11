import { readEvents, storeBackend } from "@/lib/events-store";
import { buildReport, type Segment } from "@/lib/report";

// Internal validation dashboard. Reads the event store live on each request.
export const dynamic = "force-dynamic";

const VERDICT = {
  validated: { label: "VALIDATED", color: "#22c55e" },
  weak: { label: "WEAK / INCONCLUSIVE", color: "#eab308" },
  "not-validated": { label: "NOT VALIDATED", color: "#e50914" },
} as const;

export default async function ReportPage() {
  const events = await readEvents();
  const r = buildReport(events);
  const v = VERDICT[r.verdict];
  const maxFunnel = Math.max(1, r.funnel[0]?.count ?? 1);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Watch While You Eat — Validation Report</h1>
        <span className="rounded bg-white/10 px-2 py-1 text-xs text-white/60">
          store: {storeBackend()}
        </span>
      </div>
      <p className="mb-8 text-sm text-white/50">
        {events.length} events · {r.sessions} sessions · live from the event store
      </p>

      <div
        className="mb-10 rounded-lg border p-6"
        style={{ borderColor: v.color, background: `${v.color}14` }}
      >
        <p className="text-xs uppercase tracking-widest text-white/50">Verdict</p>
        <p className="text-3xl font-extrabold" style={{ color: v.color }}>
          {v.label}
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold">Funnel</h2>
        <div className="space-y-2">
          {r.funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-52 shrink-0 text-sm text-white/70">{f.label}</span>
              <div className="h-6 flex-1 overflow-hidden rounded bg-white/5">
                <div
                  className="h-full bg-nfred"
                  style={{ width: `${(f.count / maxFunnel) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right text-sm font-semibold">{f.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Feature CTR" value={`${(r.featureCTR * 100).toFixed(0)}%`} />
        <Stat label="Generic CTR" value={`${(r.genericCTR * 100).toFixed(0)}%`} />
        <Stat label="CTR ratio" value={`${r.ctrRatio.toFixed(2)}x`} />
        <Stat label="Median dwell" value={`${r.medianDwellSec}s`} />
        <Stat label="Median bounce" value={`${r.medianBounceSec}s`} />
        <Stat label="Bounce rate" value={`${(r.bounceRate * 100).toFixed(0)}%`} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold">Segments</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <SegmentTable title="By profile" rows={r.segmentsByProfile} />
          <SegmentTable title="By device" rows={r.segmentsByDevice} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold">Path comparison — WWYE vs normal browsing</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white/70">Funnel by path</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-white/50">
                  <th className="pb-1 font-medium">Step</th>
                  <th className="pb-1 text-right font-medium">WWYE</th>
                  <th className="pb-1 text-right font-medium">Browse</th>
                </tr>
              </thead>
              <tbody>
                {r.pathComparison.funnel.map((f) => (
                  <tr key={f.label} className="border-t border-white/5">
                    <td className="py-1.5">{f.label}</td>
                    <td className="py-1.5 text-right">{f.wwye}</td>
                    <td className="py-1.5 text-right">{f.browse}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white/70">Per-session medians</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-white/50">
                  <th className="pb-1 font-medium">Metric</th>
                  <th className="pb-1 text-right font-medium">WWYE</th>
                  <th className="pb-1 text-right font-medium">Browse</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="py-1.5">Time to first play</td>
                  <td className="py-1.5 text-right">{sec(r.pathComparison.timeToFirstPlaySec.wwye)}</td>
                  <td className="py-1.5 text-right">{sec(r.pathComparison.timeToFirstPlaySec.browse)}</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="py-1.5">Tiles opened before start</td>
                  <td className="py-1.5 text-right">{num(r.pathComparison.tilesBeforeStart.wwye)}</td>
                  <td className="py-1.5 text-right">{num(r.pathComparison.tilesBeforeStart.browse)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs text-white/50">
              Tiles opened before start (all sessions):{" "}
              <span className="text-white/70">{num(r.pathComparison.tilesBeforeStart.overall)}</span>
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label="Give-up rate"
            value={`${(r.pathComparison.giveUpRate * 100).toFixed(0)}%`}
          />
          <Stat
            label="Gave up / saw home"
            value={`${r.pathComparison.giveUpSessions} / ${r.pathComparison.sessionsWithHome}`}
          />
        </div>
        <p className="mt-2 text-xs text-white/40">
          Per-session metrics attribute to the path of that session&apos;s first
          play. Give-up = saw home but never pressed play. Rows lacking a path are
          counted as browse.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold">Pass / fail against thresholds</h2>
        <ul className="space-y-2">
          {r.checks.map((c) => (
            <li
              key={c.label}
              className="flex items-center justify-between rounded bg-white/5 px-4 py-3"
            >
              <span className="text-sm">
                <span className={c.pass ? "text-green-400" : "text-nfred"}>
                  {c.pass ? "PASS" : "FAIL"}
                </span>{" "}
                · {c.label}
              </span>
              <span className="text-sm text-white/50">{c.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-white/40">
        Thresholds are placeholders in src/lib/report-config.ts. Set the real
        numbers before recruiting testers (README s.5).
      </p>
    </main>
  );
}

// Nullable medians render "-" so "no sessions" reads differently from a real 0.
function sec(v: number | null): string {
  return v === null ? "-" : `${v}s`;
}
function num(v: number | null): string {
  return v === null ? "-" : `${v}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function SegmentTable({ title, rows }: { title: string; rows: Segment[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-white/70">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-white/50">
            <th className="pb-1 font-medium">Segment</th>
            <th className="pb-1 text-right font-medium">Sessions</th>
            <th className="pb-1 text-right font-medium">CTR</th>
            <th className="pb-1 text-right font-medium">Dwell</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.key} className="border-t border-white/5">
              <td className="py-1.5">{s.key}</td>
              <td className="py-1.5 text-right">{s.sessions}</td>
              <td className="py-1.5 text-right">{(s.featureCTR * 100).toFixed(0)}%</td>
              <td className="py-1.5 text-right">{s.medianDwellSec}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
