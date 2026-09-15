import Link from "next/link";

// Feature-blind intro. Pilot participants dropped straight into the questions did
// not know what they were doing or how long it would take, so they skimmed.
//
// This screen frames the MEAL SCENARIO and nothing else. It must never name or
// point at the Watch While You Eat row: telling someone what is being tested is
// the fastest way to destroy the behavioural signal (README s.20.4). No session id
// is minted here -- /survey/pre still mints it on load, exactly as before.
export const metadata = {
  title: "Before you begin",
};

export default function SurveyStart() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10 pb-24">
      <h1 className="mb-2 text-2xl font-bold text-white">Before you begin</h1>
      <p className="mb-8 text-sm text-white/50">About 5 minutes, fully anonymous.</p>

      <div className="space-y-6">
        <p className="rounded border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
          This is a research prototype for a student project, not the real Netflix.
          Your responses and interactions are recorded anonymously for the study.
          You can stop anytime.
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">What happens</h2>
          <ol className="space-y-3 text-white/85">
            <li className="flex gap-3">
              <span className="font-semibold text-white/40">1.</span>
              <span>A few quick questions about how you normally watch.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-white/40">2.</span>
              <span>
                A short Netflix-style demo. Use it the way you normally would.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-white/40">3.</span>
              <span>A few more questions about how that went.</span>
            </li>
          </ol>
        </section>

        <section className="space-y-2 rounded border border-white/15 bg-white/5 px-4 py-4">
          <h2 className="text-lg font-semibold text-white">Picture this</h2>
          <p className="text-white/85">
            It&apos;s dinner. You have about 30 to 40 minutes and a plate of food in
            front of you, and you open Netflix to put something on while you eat.
          </p>
          <p className="text-white/85">
            When you get to the demo, pick something the way you normally would.
            There are no right answers and nothing in particular to find.
          </p>
        </section>

        <Link
          href="/survey/pre"
          className="block w-full rounded bg-nfred px-4 py-3 text-center font-semibold text-white transition hover:bg-nfred/90"
        >
          Start
        </Link>
      </div>
    </main>
  );
}
