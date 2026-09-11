"use client";

import { useMemo, useState } from "react";
import type { Answers, AnswerValue, Question } from "@/lib/survey";

// One config-driven form. Renders any Question by its `type`; adding a question
// means editing src/lib/survey.ts only. Validation: required items block submit,
// sliders start UNSET (must be moved), inline errors, submit disabled until valid.

function isAnswered(q: Question, v: AnswerValue | undefined): boolean {
  if (q.type === "multi") return Array.isArray(v) && v.length > 0;
  if (q.type === "slider") return typeof v === "number";
  if (q.type === "open") return typeof v === "string" && v.trim().length > 0;
  return typeof v === "string" && v.length > 0; // single
}

export default function SurveyForm({
  questions,
  submitLabel,
  onSubmit,
}: {
  questions: Question[];
  submitLabel: string;
  onSubmit: (answers: Answers) => void;
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const [showErrors, setShowErrors] = useState(false);

  const missing = useMemo(
    () =>
      new Set(
        questions
          .filter((q) => q.required && !isAnswered(q, answers[q.id]))
          .map((q) => q.id),
      ),
    [questions, answers],
  );

  const answeredCount = questions.filter((q) => isAnswered(q, answers[q.id])).length;
  const valid = missing.size === 0;

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setShowErrors(true);
      return;
    }
    onSubmit(answers);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <div
        className="sticky top-0 z-10 -mx-4 bg-nfbg/95 px-4 py-3 backdrop-blur"
        aria-hidden="true"
      >
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-nfred transition-all"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-white/50">
          {answeredCount} / {questions.length}
        </p>
      </div>

      {questions.map((q, i) => {
        const invalid = showErrors && missing.has(q.id);
        const errorId = `${q.id}-error`;
        return (
          <fieldset
            key={q.id}
            className="space-y-3"
            aria-describedby={invalid ? errorId : undefined}
          >
            <legend className="text-base font-medium text-white">
              <span className="text-white/40">{i + 1}.</span> {q.prompt}
              {q.required ? (
                <span className="text-nfred"> *</span>
              ) : (
                <span className="text-white/40"> (optional)</span>
              )}
            </legend>

            <QuestionInput
              q={q}
              value={answers[q.id]}
              onSingle={(v) => set(q.id, v)}
              onMulti={(opt) => toggleMulti(q.id, opt)}
              onSlider={(n) => set(q.id, n)}
              onOpen={(v) => set(q.id, v)}
            />

            {invalid && (
              <p id={errorId} role="alert" className="text-sm text-nfred">
                {q.type === "slider"
                  ? "Please move the slider to answer."
                  : "This question is required."}
              </p>
            )}
          </fieldset>
        );
      })}

      <div className="space-y-2">
        {showErrors && !valid && (
          <p role="alert" className="text-sm text-nfred">
            Please answer all required questions above.
          </p>
        )}
        <button
          type="submit"
          disabled={!valid}
          className="w-full rounded bg-nfred px-4 py-3 font-semibold text-white transition enabled:hover:bg-nfred/90 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function QuestionInput({
  q,
  value,
  onSingle,
  onMulti,
  onSlider,
  onOpen,
}: {
  q: Question;
  value: AnswerValue | undefined;
  onSingle: (v: string) => void;
  onMulti: (opt: string) => void;
  onSlider: (n: number) => void;
  onOpen: (v: string) => void;
}) {
  if (q.type === "single") {
    return (
      <div className="space-y-2">
        {q.options?.map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-3 rounded border border-white/15 px-4 py-3 text-white/90 transition hover:border-white/40 has-checked:border-nfred has-checked:bg-nfred/10"
          >
            <input
              type="radio"
              name={q.id}
              value={opt}
              checked={value === opt}
              onChange={() => onSingle(opt)}
              className="h-4 w-4 accent-nfred"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (q.type === "multi") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        {q.options?.map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-3 rounded border border-white/15 px-4 py-3 text-white/90 transition hover:border-white/40 has-checked:border-nfred has-checked:bg-nfred/10"
          >
            <input
              type="checkbox"
              name={q.id}
              value={opt}
              checked={selected.includes(opt)}
              onChange={() => onMulti(opt)}
              className="h-4 w-4 accent-nfred"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (q.type === "slider" && q.slider) {
    const { min, max, minLabel, maxLabel } = q.slider;
    const set = typeof value === "number";
    const current = set ? (value as number) : Math.round((min + max) / 2);
    return (
      <div className="space-y-2">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={current}
          onChange={(e) => onSlider(Number(e.target.value))}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={set ? current : undefined}
          aria-label={`${q.prompt} (${minLabel} to ${maxLabel})`}
          className={`w-full accent-nfred ${set ? "" : "opacity-60"}`}
        />
        <div className="flex justify-between text-xs text-white/50">
          <span>{minLabel}</span>
          <span aria-live="polite" className="font-semibold text-white/80">
            {set ? current : "—"}
          </span>
          <span>{maxLabel}</span>
        </div>
      </div>
    );
  }

  // open
  return (
    <textarea
      name={q.id}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onOpen(e.target.value)}
      rows={3}
      aria-label={q.prompt}
      className="w-full rounded border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
      placeholder="Type your answer…"
    />
  );
}
