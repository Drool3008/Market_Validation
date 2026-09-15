"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { POST, type Answers } from "@/lib/survey";
import { newSessionId, saveSurvey } from "@/lib/survey-client";
import { readExposure, type Exposure } from "@/lib/exposure";
import SurveyForm from "@/components/SurveyForm";

// Post-visit form. Reads sid from the URL (?sid=) to join the pre survey + events.
// If missing, mint one and warn: this participant can't be joined to their session.
//
// Questions about things the participant may never have met (the picks, the
// best-moment graph) are gated on the session's Exposure record. That record lives
// in sessionStorage, so it can only be read after mount -- rendering the form
// before then would hydrate with the wrong set of questions.
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

  // undefined = not read yet (pre-mount), null = no prototype session on record
  // (direct link / cleared storage) which falls back to asking everything.
  const [exposure, setExposure] = useState<Exposure | null | undefined>(undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExposure(readExposure());
  }, []);

  async function handleSubmit(answers: Answers) {
    if (submitting) return;
    setSubmitting(true);
    await saveSurvey({ sessionId, survey: "post", answers });
    router.push("/survey/thanks");
  }

  if (exposure === undefined) return <Shell />;

  return (
    <Shell>
      <SurveyForm
        questions={POST}
        exposure={exposure}
        submitLabel={submitting ? "Saving…" : "Submit feedback"}
        onSubmit={handleSubmit}
      />
    </Shell>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 pt-8 pb-10">
      <h1 className="text-xl font-bold text-white">Almost done</h1>
      <p className="mt-1 mb-5 text-sm text-white/45">
        A few questions about what you just tried.
      </p>
      <div className="space-y-5">{children}</div>
    </main>
  );
}
