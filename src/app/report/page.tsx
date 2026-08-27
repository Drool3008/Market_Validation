import { readEvents, storeBackend } from "@/lib/events-store";
import { buildReport } from "@/lib/report";

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
