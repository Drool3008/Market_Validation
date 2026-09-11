"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { POST, type Answers } from "@/lib/survey";
import { newSessionId, saveSurvey } from "@/lib/survey-client";
import SurveyForm from "@/components/SurveyForm";

// Post-visit form. Reads sid from the URL (?sid=) to join the pre survey + events.
// If missing, mint one and warn: this participant can't be joined to their session.
export default function SurveyPost() {
  return (
    <Suspense fallback={<Shell />}>
      <SurveyPostInner />
    </Suspense>
  );
}

function SurveyPostInner() {
  const router = useRouter();
  const search = useSearchParams();

  // Resolve the session id once from ?sid=; mint + warn if the participant
  // arrived without one (unjoinable to their pre survey + events).
  const [sessionId] = useState(() => {
    const sid = search.get("sid");
    if (!sid) {
      console.warn("[survey] no ?sid= on post survey; unjoinable participant");
    }
    return sid ?? newSessionId();
  });

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(answers: Answers) {
    if (submitting) return;
    setSubmitting(true);
    await saveSurvey({ sessionId, survey: "post", answers });
    router.push("/survey/thanks");
  }

  return (
    <Shell>
      <SurveyForm
        questions={POST}
        submitLabel={submitting ? "Saving…" : "Submit feedback"}
        onSubmit={handleSubmit}
      />
    </Shell>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10 pb-24">
      <h1 className="mb-2 text-2xl font-bold text-white">Almost done</h1>
      <p className="mb-6 text-sm text-white/50">
        A few questions about what you just tried.
      </p>
      <div className="space-y-6">{children}</div>
    </main>
  );
}
