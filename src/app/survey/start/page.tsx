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

const STEPS = [
  {
    n: "1",
    title: "A few quick questions",
    body: "About how you normally watch. Under a minute.",
  },
  {
    n: "2",
    title: "Try a short demo",
    body: "A Netflix-style app. Use it the way you normally would.",
  },
  {
    n: "3",
    title: "A few more questions",
    body: "About how that went.",
  },
];

export default function SurveyStart() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 pt-10 pb-32">
      <h1 className="text-3xl leading-tight font-bold text-balance text-white">
        Before you begin
      </h1>
      <p className="mt-2 text-base text-white/55">
        About 5 minutes · completely anonymous
      </p>

      <section className="mt-9">
        <h2 className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          What happens
        </h2>
        <ol className="mt-4 space-y-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="flex gap-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-4"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-nfred text-sm font-bold text-white">
                {s.n}
              </span>
              <div className="min-w-0">
                <p className="text-base font-semibold text-white">{s.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-white/60">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 rounded-lg border-l-2 border-nfred bg-white/[0.04] px-5 py-5">
        <h2 className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          Picture this
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-balance text-white">
          It&apos;s dinner. You have about 30 to 40 minutes and a plate of food in
          front of you, and you open Netflix to put something on while you eat.
        </p>
        <p className="mt-3 text-base leading-relaxed text-white/70">
          When you get to the demo, pick something the way you normally would. There
          are no right answers and nothing in particular to find.
        </p>
      </section>

      <p className="mt-8 text-sm leading-relaxed text-white/45">
        This is a research prototype for a student project, not the real Netflix.
        Your responses and interactions are recorded anonymously for the study. You
        can stop anytime.
      </p>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-nfbg/95 px-5 pt-3.5 backdrop-blur">
        <Link
          href="/survey/pre"
          className="mx-auto flex min-h-12 max-w-2xl items-center justify-center rounded-lg bg-nfred px-4 text-base font-semibold text-white transition hover:bg-nfred/90"
        >
          Start
        </Link>
      </div>
    </main>
  );
}
