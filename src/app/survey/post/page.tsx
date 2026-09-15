"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { POST, type Answers } from "@/lib/survey";
import { saveSurvey } from "@/lib/survey-client";
import { getProfileId, getSessionId } from "@/lib/analytics";
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

  // Resolve the session id from ?sid=. Without one, fall back to the id already
  // in sessionStorage (getSessionId) rather than minting a fresh uuid: a
  // participant who wanders back into the prototype and returns must keep ONE id,
  // or their post row lands under a session that has no pre row and no events.
  // Only a visitor with no prototype session at all gets a brand new id.
  const urlSid = search.get("sid");
  const [sessionId, setSessionId] = useState<string | null>(urlSid);

  const [submitting, setSubmitting] = useState(false);

  // undefined = not read yet (pre-mount), null = no prototype session on record
  // (direct link / cleared storage) which falls back to asking everything.
  const [exposure, setExposure] = useState<Exposure | null | undefined>(undefined);

  // Way back into the prototype for anyone who hit the floating "Finish & give
  // feedback" button by accident. Must not cost them their session id: /browse
  // is safe while the profile is still in storage, otherwise it bounces to the
  // gate and mints a fresh id, so send those through the gate with ?sid= instead.
  const [backHref, setBackHref] = useState<string | null>(null);

  // One mount-time read of everything that lives in browser storage: the session
  // id fallback, the exposure record, and where "back to the prototype" points.
  useEffect(() => {
    const sid = urlSid ?? getSessionId();
    if (!urlSid) {
      console.warn("[survey] no ?sid= on post survey; using the session id in storage");
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionId(sid);
    setExposure(readExposure());
    setBackHref(getProfileId() ? "/browse" : `/?sid=${sid}`);
  }, [urlSid]);

  async function handleSubmit(answers: Answers) {
    if (submitting || !sessionId) return;
    setSubmitting(true);
    await saveSurvey({ sessionId, survey: "post", answers });
    router.push("/survey/thanks");
  }

  if (exposure === undefined || !sessionId) return <Shell />;

  return (
    <Shell>
      <SurveyForm
        questions={POST}
        exposure={exposure}
        submitLabel={submitting ? "Saving…" : "Submit feedback"}
        onSubmit={handleSubmit}
        draftKey={`wwye_draft_post_${sessionId}`}
        aside={
          backHref ? (
            <a
              href={backHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/60 transition hover:border-white/35 hover:text-white/90"
            >
              ← Back to the prototype
              <span className="text-white/35">· answers are kept</span>
            </a>
          ) : null
        }
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
