"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PRE, type Answers } from "@/lib/survey";
import { newSessionId, saveSurvey } from "@/lib/survey-client";
import SurveyForm from "@/components/SurveyForm";

// Pre-visit form: screener + baseline. Mints the session id (UUID v4) on first
// load. Screen-out options end the study early (save with screened_out=true, no
// prototype link). A pass saves the response and enters the prototype at /?sid=.
export default function SurveyPre() {
  const router = useRouter();
  // One id per participant, minted once (lazy initializer runs a single time).
  // This is THE session id that events and the post survey will share.
  const [sessionId] = useState(newSessionId);

  const [screenedOut, setScreenedOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(answers: Answers) {
    if (submitting) return;
    setSubmitting(true);

    const out = PRE.some((q) => {
      const v = answers[q.id];
      return q.screenOutValues && typeof v === "string" && q.screenOutValues.includes(v);
    });

    await saveSurvey({ sessionId, survey: "pre", answers, screenedOut: out });

    if (out) {
      setScreenedOut(true);
      return;
    }
    router.push(`/?sid=${sessionId}`);
  }

  if (screenedOut) {
    return (
      <Shell>
        <p className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-6 text-base leading-relaxed text-white/85">
          Thanks! This study is looking for a specific group and you&apos;re
          outside it — we appreciate your time.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <SurveyForm
        questions={PRE}
        submitLabel={submitting ? "Saving…" : "Start the prototype"}
        onSubmit={handleSubmit}
        intro={
          <p className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white/60">
            This is a research prototype for a student project — not the real
            Netflix. Your responses and interactions are recorded anonymously for
            the study. It takes a few minutes and you can stop anytime.
          </p>
        }
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 pt-8 pb-10">
      <h1 className="text-xl font-bold text-white">Before you start</h1>
      <p className="mt-1 mb-5 text-sm text-white/45">A few quick questions.</p>
      <div className="space-y-5">{children}</div>
    </main>
  );
}
