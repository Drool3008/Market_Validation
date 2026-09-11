// Terminal page of the flow. No session id needed; nothing to save here.
export default function SurveyThanks() {
  return (
    <main className="mx-auto grid min-h-screen max-w-xl place-items-center px-4 py-10 text-center">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-white">Thanks for taking part</h1>
        <p className="text-white/70">
          Your responses have been recorded. You can close this tab now.
        </p>
      </div>
    </main>
  );
}
