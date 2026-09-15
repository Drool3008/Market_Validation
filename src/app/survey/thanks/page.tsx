// Terminal page of the flow. No session id needed; nothing to save here.
export default function SurveyThanks() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-xl place-items-center px-5 py-12 text-center">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-nfred">
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-white stroke-[2.5]">
            <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl leading-tight font-bold text-balance text-white">
          Thanks for taking part
        </h1>
        <p className="mt-3 text-base leading-relaxed text-white/65">
          Your responses have been recorded. You can close this tab now.
        </p>
      </div>
    </main>
  );
}
