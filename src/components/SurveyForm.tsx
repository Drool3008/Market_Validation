"use client";

import { useMemo, useState } from "react";
import type { Answers, AnswerValue, Question } from "@/lib/survey";
import { visibleQuestions, visibleOptions } from "@/lib/survey";
import type { Exposure } from "@/lib/exposure";

// One config-driven form. Renders any Question by its `type`; adding a question
// means editing src/lib/survey.ts only. Validation: required items block advance,
// sliders start UNSET (must be moved), inline errors, action disabled until valid.
//
// Questions and single options may declare a `showIf` gate (see lib/survey). The
// filtering is generic and happens here once: a gated-out question is never
// rendered, never counted in progress, never required, and never submitted.
// `exposure: null` (no prototype session on record) shows everything.
//
// PRESENTATION: the questionnaire is paginated -- one question per screen, except
// the screener run which shares a screen. That is purely how the existing list is
// displayed; the questions, their order, their options and every gate come straight
// from lib/survey and are not touched here. Phones get short screens instead of one
// long scroll; desktop uses the same flow in a wider column.

function isAnswered(q: Question, v: AnswerValue | undefined): boolean {
  if (q.type === "multi") return Array.isArray(v) && v.length > 0;
  if (q.type === "slider") return typeof v === "number";
  if (q.type === "open") return typeof v === "string" && v.trim().length > 0;
  return typeof v === "string" && v.length > 0; // single
}

/**
 * Split the visible questions into screens, preserving their order exactly.
 * Consecutive screeners (`*_s1`, `*_s2`, ...) share one screen because they are
 * short eligibility questions; everything else gets a screen of its own.
 */
function buildSteps(qs: Question[]): Question[][] {
  const isScreener = (q: Question) => /^[a-z]+_s\d+$/.test(q.id);
  const steps: Question[][] = [];
  let run: Question[] = [];
  for (const q of qs) {
    if (isScreener(q)) {
      run.push(q);
      continue;
    }
    if (run.length) {
      steps.push(run);
      run = [];
    }
    steps.push([q]);
  }
  if (run.length) steps.push(run);
  return steps;
}

export default function SurveyForm({
  questions,
  submitLabel,
  onSubmit,
  exposure = null,
  intro,
}: {
  questions: Question[];
  submitLabel: string;
  onSubmit: (answers: Answers) => void;
  exposure?: Exposure | null;
  /**
   * Shown on the first screen only (e.g. the consent notice). Repeating it above
   * every step would push the question itself off a small screen; the pinned
   * ResearchNotice keeps the study framing visible throughout regardless.
   */
  intro?: React.ReactNode;
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const [showErrors, setShowErrors] = useState(false);
  const [step, setStep] = useState(0);

  const shown = useMemo(
    () => visibleQuestions(questions, exposure),
    [questions, exposure],
  );
  const steps = useMemo(() => buildSteps(shown), [shown]);

  // Gating can shrink the list between renders; never point past the end.
  const stepIndex = Math.min(step, Math.max(0, steps.length - 1));
  const current = steps[stepIndex] ?? [];
  const isLast = stepIndex >= steps.length - 1;

  const missing = useMemo(
    () =>
      new Set(
        shown
          .filter((q) => q.required && !isAnswered(q, answers[q.id]))
          .map((q) => q.id),
      ),
    [shown, answers],
  );

  // Only this screen's required questions gate the Next button.
  const stepMissing = current.filter((q) => missing.has(q.id));
  const stepValid = stepMissing.length === 0;

  // "Question 4 of 11" counts questions, not screens, and gated-out questions are
  // already absent from `shown`, so they never inflate the total.
  const answeredBefore = steps
    .slice(0, stepIndex)
    .reduce((n, s) => n + s.length, 0);
  const firstNum = answeredBefore + 1;
  const lastNum = answeredBefore + current.length;
  const total = shown.length;
  const label =
    current.length > 1
      ? `Questions ${firstNum}-${lastNum} of ${total}`
      : `Question ${firstNum} of ${total}`;
  const pct = total === 0 ? 0 : (answeredBefore / total) * 100;

  function set(id: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMulti(id: string, option: string) {
    setAnswers((prev) => {
      const cur = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      const next = cur.includes(option)
        ? cur.filter((o) => o !== option)
        : [...cur, option];
      return { ...prev, [id]: next };
    });
  }

  function goBack() {
    setShowErrors(false);
    setStep((s) => Math.max(0, s - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stepValid) {
      setShowErrors(true);
      return;
    }
    if (!isLast) {
      setShowErrors(false);
      setStep((s) => s + 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
      return;
    }
    if (missing.size > 0) {
      // Defensive: a required answer somewhere behind us. Jump to it rather than
      // failing silently at the end of the flow.
      setShowErrors(true);
      const firstBad = steps.findIndex((s) => s.some((q) => missing.has(q.id)));
      if (firstBad >= 0) setStep(firstBad);
      return;
    }
    // Submit only what was actually asked, so a gated-out question is absent
    // rather than blank -- "not asked" and "skipped" must stay distinguishable.
    const asked = Object.fromEntries(
      shown.filter((q) => q.id in answers).map((q) => [q.id, answers[q.id]]),
    );
    onSubmit(asked);
  }

  return (
    <form onSubmit={handleSubmit} className="pb-28" noValidate>
      {intro && stepIndex === 0 && <div className="mb-6">{intro}</div>}

      <div className="mb-6">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answeredBefore}
          aria-label="Survey progress"
          className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-nfred transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p aria-live="polite" className="mt-2 text-sm text-white/50">
          {label}
        </p>
      </div>

      <div className="space-y-10">
        {current.map((q) => {
          const invalid = showErrors && missing.has(q.id);
          const errorId = `${q.id}-error`;
          return (
            <fieldset key={q.id} className="min-w-0">
              <legend className="mb-4 text-lg leading-snug font-medium text-balance text-white">
                {q.prompt}
                {q.required ? (
                  <span className="text-nfred"> *</span>
                ) : (
                  <span className="text-white/40"> (optional)</span>
                )}
              </legend>

              <QuestionInput
                q={q}
                options={visibleOptions(q, exposure)}
                value={answers[q.id]}
                invalid={invalid}
                errorId={errorId}
                onSingle={(v) => set(q.id, v)}
                onMulti={(opt) => toggleMulti(q.id, opt)}
                onSlider={(n) => set(q.id, n)}
                onOpen={(v) => set(q.id, v)}
              />

              {invalid && (
                <p id={errorId} role="alert" className="mt-3 text-sm text-nfred">
                  {q.type === "slider"
                    ? "Please move the slider to answer."
                    : "This question is required."}
                </p>
              )}
            </fieldset>
          );
        })}
      </div>

      {/* Fixed action bar: always reachable without scrolling, clear of the home bar. */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-nfbg/95 px-4 pt-3.5 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-3">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="min-h-12 shrink-0 rounded-lg border border-white/25 px-5 text-base font-semibold text-white/90 transition hover:border-white/50"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={!stepValid}
            className="min-h-12 flex-1 rounded-lg bg-nfred px-4 text-base font-semibold text-white transition enabled:hover:bg-nfred/90 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40"
          >
            {isLast ? submitLabel : "Next"}
          </button>
        </div>
      </div>
    </form>
  );
}

// Shared look for a tappable choice row: full width, >= 44px, obvious selected state.
const CHOICE =
  "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg border border-white/20 px-4 py-3.5 text-base text-white/90 transition " +
  "hover:border-white/45 has-checked:border-nfred has-checked:bg-nfred/15 has-focus-visible:ring-2 has-focus-visible:ring-white/70";

function QuestionInput({
  q,
  options,
  value,
  invalid,
  errorId,
  onSingle,
  onMulti,
  onSlider,
  onOpen,
}: {
  q: Question;
  options: string[];
  value: AnswerValue | undefined;
  invalid: boolean;
  errorId: string;
  onSingle: (v: string) => void;
  onMulti: (opt: string) => void;
  onSlider: (n: number) => void;
  onOpen: (v: string) => void;
}) {
  const describedBy = invalid ? errorId : undefined;

  if (q.type === "single") {
    return (
      <div className="space-y-2.5">
        {options.map((opt) => (
          <label key={opt} className={CHOICE}>
            <input
              type="radio"
              name={q.id}
              value={opt}
              checked={value === opt}
              onChange={() => onSingle(opt)}
              aria-describedby={describedBy}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                value === opt ? "border-nfred" : "border-white/40"
              }`}
            >
              {value === opt && <span className="h-2.5 w-2.5 rounded-full bg-nfred" />}
            </span>
            <span className="min-w-0 break-words">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (q.type === "multi") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2.5">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <label key={opt} className={CHOICE}>
              <input
                type="checkbox"
                name={q.id}
                value={opt}
                checked={on}
                onChange={() => onMulti(opt)}
                aria-describedby={describedBy}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 ${
                  on ? "border-nfred bg-nfred" : "border-white/40"
                }`}
              >
                {on && (
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-white stroke-[2.5]">
                    <path d="M3 8.5l3.2 3.2L13 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="min-w-0 break-words">{opt}</span>
            </label>
          );
        })}
        <p className="pt-1 text-sm text-white/40">Select all that apply.</p>
      </div>
    );
  }

  if (q.type === "slider" && q.slider) {
    const { min, max, minLabel, maxLabel } = q.slider;
    const set = typeof value === "number";
    // While unset the input still needs a numeric value to position itself, but the
    // thumb is hidden and the track is empty, so nothing on screen implies an answer.
    const current = set ? (value as number) : Math.round((min + max) / 2);
    const fill = set ? ((current - min) / (max - min)) * 100 : 0;

    // A native range only fires change when its value actually CHANGES, so a tap
    // landing exactly on the thumb's current position is silently ignored -- which
    // made the midpoint unanswerable in one tap (5 on 0-10, 3 on 1-5). Commit the
    // tapped position ourselves on pointer down. Native drag still runs afterwards
    // and its own change events take over, so dragging is unaffected.
    function commitFromPointer(e: React.PointerEvent<HTMLInputElement>) {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      onSlider(Math.round(min + frac * (max - min)));
    }

    return (
      <div>
        <div className="mb-1 text-center">
          <span
            aria-hidden="true"
            className={`text-4xl font-bold tabular-nums ${set ? "text-white" : "text-white/25"}`}
          >
            {set ? current : "—"}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={current}
          onPointerDown={commitFromPointer}
          onChange={(e) => onSlider(Number(e.target.value))}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={set ? current : undefined}
          aria-valuetext={set ? String(current) : "Not set"}
          aria-label={`${q.prompt} (${minLabel} to ${maxLabel})`}
          aria-describedby={describedBy}
          style={{ "--fill": `${fill}%` } as React.CSSProperties}
          className={`survey-range w-full ${set ? "" : "survey-range--unset"}`}
        />
        <div className="flex justify-between gap-4 text-sm text-white/55">
          <span className="min-w-0 break-words">{minLabel}</span>
          <span className="min-w-0 break-words text-right">{maxLabel}</span>
        </div>
        {!set && (
          <p className="mt-2 text-center text-sm text-white/40">
            Tap anywhere on the line to answer.
          </p>
        )}
      </div>
    );
  }

  // open
  return (
    <textarea
      name={q.id}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onOpen(e.target.value)}
      rows={5}
      aria-label={q.prompt}
      aria-describedby={describedBy}
      autoCapitalize="sentences"
      autoCorrect="on"
      spellCheck
      // text-base (16px) keeps iOS Safari from zooming the viewport on focus.
      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base leading-relaxed text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
      placeholder="Type your answer…"
    />
  );
}
