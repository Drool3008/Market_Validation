> **SUPERSEDED — do not use for validation.** This is an early DRAFT questionnaire. It does not match the shipped instrument in `src/lib/survey.ts` (different questions, different options, and a `[Rank]` type that does not exist in code). The shipped questionnaire is in README section 18.
> Folded into `README.md`. Kept only for history.

# Questionnaire — Pre- and Post-Visit Forms

Two short forms that wrap around the prototype session. The **pre-visit form** screens
the participant and captures their current habits and the pain *before* they see the
feature. The **post-visit form** captures their reaction, stated desirability, and the
*why* right after they use it. Behaviour from the prototype is the verdict; these
forms explain and cross-check it.

Question types are labelled: **[Single]** one choice, **[Multi]** select all that
apply, **[Slider]** a scale, **[Rank]** order the options, **[Open]** free text. Keep
each form to a few minutes — the pre-form especially, so no one is fatigued before the
test.

---

## Pre-Visit Form (screener + baseline)

### Eligibility

**Q1. How old are you?** [Single]
- Under 18  *(screen out — do not proceed)*
- 18–22
- 23–26
- 27–30
- 31 or older  *(screen out, or note as out-of-segment)*

**Q2. How often do you watch shows or movies on a streaming app?** [Single]
- Every day
- A few times a week
- About once a week
- Rarely  *(screen out)*
- Never  *(screen out)*

**Q3. Which of these do you use?** [Multi]
- Netflix
- Prime Video
- Disney+ / Hotstar
- JioCinema
- YouTube
- Other
- None of these  *(screen out)*

**Q4. Do you watch something while eating a meal?** [Single]
- Yes, most meals
- Sometimes
- Rarely  *(borderline — note it)*
- Never  *(screen out)*

**Q5. On which devices do you watch during meals?** [Multi]
- Phone
- Laptop
- TV
- Tablet

### Baseline — the pain, before seeing the feature

**Q6. When you sit down to watch during a meal, how often do you struggle to decide
what to put on?** [Slider 1–5]
1 = Never · 3 = Sometimes · 5 = Almost every time

**Q7. Roughly how long do you usually spend deciding before you actually start
watching?** [Single]
- Under 1 minute
- 1–3 minutes
- 3–5 minutes
- 5–10 minutes
- More than 10 minutes
- I often give up before starting

**Q8. What makes choosing hard at mealtime?** [Multi]
- Too many options
- Nothing feels right
- I've already seen the good stuff
- I don't want to commit to something long
- It depends on my mood
- The recommendations feel off
- Choosing isn't hard for me
- Other: ___

**Q9. When you can't decide, what do you usually end up doing?** [Single]
- Rewatch something familiar
- Switch to YouTube
- Switch to another app
- Scroll social media instead
- Give up and just eat
- Put something on as background noise

**Q10. How much does the *deciding* part frustrate you?** [Slider 0–10]
0 = Not at all · 10 = Extremely

**Q11. In one line, what's your biggest frustration with picking something at
mealtime?** [Open, optional]

---

## Post-Visit Form (right after using the prototype)

### Did it register

**Q1. Did you notice a row meant to help you quickly pick something to watch?**
[Single]
- Yes
- No
- Not sure

**Q2. How appealing was that "Watch While You Eat" row to you?** [Slider 0–10]
0 = Not at all · 10 = Very appealing

### Did the picks land

**Q3. How well did the suggested episodes match your taste?** [Slider 1–5]
1 = Not at all · 5 = Very well

**Q4. Did the suggestions feel like things you'd actually want, or things you'd
already skip?** [Single]
- Mostly things I'd want
- A mix
- Mostly things I've already seen or would skip

**Q5. What almost made you skip the row — if anything?** [Multi]
- Nothing, it worked for me
- Suggestions felt random
- I'd already seen them
- I didn't trust the picks
- Too few options
- Wrong for my mood
- Other: ___

### The specific mechanics

**Q6. Which parts felt useful?** [Multi]
- The single best-episode pick per show
- The mood filters (funny, cozy, tense, feel-good)
- The jump-to-the-best-moment graph
- That it used shows I already watch
- None of these

**Q7. Rank these by how much they'd help you at a real meal (1 = most).** [Rank]
- Best-episode pick
- Mood filter
- Jump-to-best-moment
- Personalisation to my shows

### Desirability and comparison

**Q8. If this were on the real Netflix, how likely are you to use it at your next
meal?** [Slider 0–10]
0 = Would never use it · 10 = Would use it every meal

**Q9. Would it help you pick faster than you normally do?** [Single]
- Much faster
- Somewhat faster
- No difference
- Actually slower

**Q10. Compared to how you normally choose at a meal, this was…** [Single]
- Better
- About the same
- Worse

**Q11. Overall, how much would a feature like this improve your mealtime watching?**
[Slider 0–10]
0 = Not at all · 10 = A lot

### The why

**Q12. What is the ONE thing that would make you actually use this?** [Open]

**Q13. Anything that confused you or got in the way?** [Open, optional]

---

## How the answers are read (analysis mapping)

- **Q6–Q10 (pre) establish the pain.** They let us check whether people who *report*
  the mealtime struggle are the same ones whose *behaviour* shows it — stated vs.
  revealed, side by side.
- **Q7 (pre, time-to-decide)** is our local echo of Netflix's 60–90-second finding;
  compare it to actual dwell/decision time in the log.
- **Post Q2, Q8, Q11 are the stated-desirability trio.** Q8 (likelihood to use) is the
  headline self-report — but it only *supports* the behavioural verdict, never
  replaces it.
- **Post Q4 and Q5 are the Play-Something guardrail.** A high "already seen / would
  skip" share is the same failure that killed Netflix's shuffle; treat it as a red flag
  even if clicks look fine.
- **Post Q6–Q7 tell us which mechanic carries the feature** — best-episode pick, mood
  filter, or best-moment jump — so a future build knows what to keep.
- **Open text (pre Q11, post Q12–Q13)** supplies the tester quotes for the report's
  qualitative section.

Keep the survey secondary throughout: where a participant's words and their clicks
disagree, the clicks win, and the disagreement itself is a finding worth reporting.