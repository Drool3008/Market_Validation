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
        <p className="text-lg text-white/90">
          Thanks! This study is looking for a specific group and you&apos;re
          outside it — we appreciate your time.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="rounded border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
        This is a research prototype for a student project — not the real Netflix.
        Your responses and interactions are recorded anonymously for the study. It
        takes a few minutes and you can stop anytime.
      </p>
      <SurveyForm
        questions={PRE}
        submitLabel={submitting ? "Saving…" : "Start the prototype"}
        onSubmit={handleSubmit}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10 pb-24">
      <h1 className="mb-2 text-2xl font-bold text-white">Before you start</h1>
      <p className="mb-6 text-sm text-white/50">A few quick questions.</p>
      <div className="space-y-6">{children}</div>
    </main>
  );
}
