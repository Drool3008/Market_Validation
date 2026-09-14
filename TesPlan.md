> **SUPERSEDED — do not use for validation.** Test plan. See README section 20.
> Folded into `README.md`. Kept only for history.

# Test Plan — Watch While You Eat Validation

How the fake-door prototype is put in front of real people to judge desirability by
behaviour, not opinion. This plan covers who we test, how sessions are run, what we
measure, and the guardrails that keep the result honest. The paired instrument —
pre- and post-visit forms — is in `QUESTIONNAIRE.md`.

## What we are validating

One question, answered with behaviour: when a young viewer sits down to watch during
a meal, does a "Watch While You Eat" row that pre-picks the best, already-enjoyed
episode of shows they watch get a real click, a real browse, and a real play — above
how they treat the ordinary rows — or do they skip it.

This is a **revealed-preference** test. The prototype is the test; the survey around
it explains the *why* and never overrides the behaviour.

## Why not just send a link

A link distributed openly fails on four counts, each of which corrupts the signal:
we lose control of *who* opens it (we need 18–30 meal-time streamers, not whoever is
reachable); there is no *mealtime context*, so no one is in the moment being tested;
we never see the *why* behind a skip or a click; and we get novelty clicks with no
way to separate them from genuine intent. Every session must instead be screened,
framed, and observed.

## Participants and recruitment

Target segment: viewers aged 18–30 who stream at least weekly and watch during meals,
across phone, laptop, and TV. Eligibility is decided by the pre-visit screener — only
qualifying respondents proceed to the prototype.

Target sample: roughly 30–50 completed behavioural sessions, plus about 8 moderated
think-aloud sessions for depth. This is a convenience sample skewed young and
student-heavy; that is acceptable for a desirability signal and is stated plainly as
a limitation in the report, not hidden.

## Session protocol (four parts, every session)

1. **Screen.** Confirm eligibility with the pre-visit form. Ineligible respondents
   stop here.
2. **Frame the moment.** Read the scenario aloud (below) so the participant is in the
   mealtime headspace. Do **not** name or point to the feature being tested.
3. **Observe.** The participant uses the prototype naturally while the instrumentation
   captures the funnel (impression → row-click → title-open → play → dwell) and the
   feature-vs-generic-row baseline. In moderated sessions, watch and note every
   hesitation and skip.
4. **Debrief.** Administer the short post-visit form for the *why* and the stated
   likelihood to use.

**Scenario script (read verbatim):** "Imagine it's dinner. You have about 30–40
minutes and a plate of food in front of you, and you open Netflix to put something on
while you eat. Go ahead and pick something the way you normally would — and if you
can, say out loud what you're thinking as you go."

## How sessions are run (choose a mix)

**Canteen / mess intercept — primary.** Set up at lunch and dinner in the dining hall
with a laptop or phone and approach people who are actually eating. This gives real
mealtime context, the exact 18–30 student segment, and 20–30 sessions across a couple
of meal windows, cheaply. Best signal for the effort.

**Moderated think-aloud — for depth.** About 8 sessions, in person or over a video
call with screen share, where the participant narrates their thinking. Small sample,
but this is where the *why* surfaces — and the early warning for the failure mode
below.

**Unmoderated remote — optional, for scale.** A platform (Maze, Lookback, PlaybookUX,
UserTesting) recruits to the screener, serves the scenario, and records the session
while events log. Adds volume but loses the live *why* and costs money; use only to
top up if the behavioural sample is thin.

Recommended for a student team: canteen intercepts for volume plus the 8 moderated
sessions for depth; skip paid platforms unless numbers fall short.

## Study design

Use a **within-session baseline**: every participant sees the Watch While You Eat row
among the ordinary rows, and each person's feature-row behaviour is compared to their
*own* generic-row behaviour. This controls for how clicky each individual is, which
matters when the sample is small. Do not run a between-groups A/B (feature vs. no
feature) — it needs far more people than we will have.

Segment results by the demo profile chosen and by device.

## The failure mode to watch for

Netflix's "Play Something" shuffle was removed in 2023 because it re-served titles
people had already rejected and ignored that viewers arrive with intent. Our row must
not fall into the same trap. The single most important qualitative signal is a
participant reacting *"these are things I've already seen / would skip."* The
post-visit form probes this directly, and it is why the verdict weights **dwell and
the baseline comparison over raw click-through** — a click is cheap, a real browse is
not.

## Measurement

Behavioural (primary), from the events log: feature-row CTR vs. average generic-row
CTR in the same session; share of sessions that click the row; median dwell among
clickers; skip/bounce rate; funnel drop-off at each stage.

Survey (secondary), from `QUESTIONNAIRE.md`: self-reported pain at intake, and
appeal, taste-match, likelihood-to-use, and the *why* at debrief. The survey colours
and explains the behaviour; it does not decide the verdict.

## Gates before any session runs

- **Lock the thresholds first.** The `X% / Y-seconds / 1.5× CTR` placeholders in the
  build spec become concrete numbers, agreed with the team and written down, *before*
  recruiting. No moving them afterwards.
- **Consent and ethics.** Read the notice: "This is a research prototype for a student
  project — not the real Netflix. Your interactions are recorded anonymously for the
  study. It takes about five minutes and you can stop anytime." Sessions are
  pseudonymous (session ID only); no PII; participants under 18 are screened out.
- **Incentive.** A small thank-you for intercepts (a snack or a coffee coupon) lifts
  completion.

## Moderator run-sheet (per session)

- Confirm the screener passed and note profile chosen and device.
- Read the consent notice; get a verbal yes.
- Read the scenario; then stay quiet and let them browse.
- Note every hesitation, skip, and out-loud reaction.
- Stop when they start something or give up.
- Administer the post-visit form.
- Thank them and give the incentive.
- Confirm the session's events actually landed in the log before moving on.

## Sequence

- **Week 1:** lock thresholds; run 3 pilot sessions to shake out the prototype and the
  forms; fix anything broken.
- **Week 2:** canteen intercepts (20–30) plus the 8 moderated sessions.
- **Week 3:** analyse the funnel, dwell, and baseline; write the report against the
  pre-registered thresholds.

## Open decisions

- Which modes to resource — canteen only, or canteen plus a few paid remote sessions.
- The concrete success thresholds.
- Incentive budget and how many meal windows can be staffed.