// Single source of truth for the pre/post questionnaire. SurveyForm renders any
// item by its `type`. Adding or editing a question means editing ONLY this file.
//
// Answer value shape by type:
//   single -> string (the chosen option)
//   multi  -> string[] (chosen options)
//   slider -> number
//   open   -> string
// screenOutValues: option values that, if chosen, end the study early (pre only).

export type QuestionType = "single" | "multi" | "slider" | "open";

export interface SliderConfig {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  slider?: SliderConfig;
  claimTag?: string;
  required: boolean;
  screenOutValues?: string[];
}

export type AnswerValue = string | string[] | number;
export type Answers = Record<string, AnswerValue>;

export const PRE: Question[] = [
  {
    id: "pre_s1",
    type: "single",
    required: true,
    prompt: "How old are you?",
    options: ["Under 18", "18–22", "23–26", "27–30", "31 or older"],
    screenOutValues: ["Under 18", "31 or older"],
  },
  {
    id: "pre_s2",
    type: "single",
    required: true,
    prompt: "How often do you watch shows or movies on a streaming app?",
    options: [
      "Every day",
      "A few times a week",
      "About once a week",
      "Rarely",
      "Never",
    ],
    screenOutValues: ["Rarely", "Never"],
  },
  {
    id: "pre_s3",
    type: "single",
    required: true,
    prompt: "Do you watch something while eating a meal?",
    options: ["Most meals", "Sometimes", "Rarely", "Never"],
    screenOutValues: ["Never"],
  },
  {
    id: "pre_q1",
    type: "single",
    required: true,
    claimTag: "C1",
    prompt:
      "In a typical week, how many times do you watch something on a streaming app while eating a meal?",
    options: ["0", "1–2", "3–5", "6–10", "10+"],
    screenOutValues: ["0"],
  },
  {
    id: "pre_q2",
    type: "single",
    required: true,
    claimTag: "C2",
    prompt:
      "Think about the last time you watched during a meal. How long did you spend deciding before you actually started?",
    options: [
      "Under 1 minute",
      "1–3 minutes",
      "3–5 minutes",
      "5–10 minutes",
      "Over 10 minutes",
      "I never started",
    ],
  },
  {
    id: "pre_q3",
    type: "slider",
    required: true,
    claimTag: "C2",
    prompt:
      "By the time you settled on something, how much of your meal was already over?",
    slider: { min: 0, max: 10, minLabel: "None of it", maxLabel: "Most of it" },
  },
  {
    id: "pre_q4",
    type: "single",
    required: true,
    claimTag: "C3",
    prompt:
      "In the last month, how often did you open a streaming app at a meal but give up without watching anything on it?",
    options: ["Never", "Once or twice", "A few times", "Often", "Almost every time"],
  },
  {
    id: "pre_q5",
    type: "single",
    required: true,
    claimTag: "C3-falsifier",
    prompt:
      "When you sit down to watch at a meal, do you usually already know what you want, or do you have to figure it out?",
    options: [
      "I usually already know",
      "I usually have to figure it out",
      "Depends",
    ],
  },
  {
    id: "pre_q6",
    type: "single",
    required: true,
    claimTag: "C4",
    prompt: "The last time deciding dragged at a meal, what did you actually do?",
    options: [
      "Watched something on it anyway",
      "Put on an old favourite",
      "Switched to YouTube",
      "Switched to another app",
      "Scrolled social media instead",
      "Gave up and just ate",
    ],
  },
  {
    id: "pre_q7",
    type: "slider",
    required: true,
    claimTag: "C5",
    prompt: "How annoying is the 'what do I put on' part at mealtime, for you?",
    slider: { min: 0, max: 10, minLabel: "Not at all", maxLabel: "Extremely" },
  },
  {
    id: "pre_q8",
    type: "open",
    required: false,
    prompt:
      "Describe the last time you gave up trying to find something at a meal — what happened?",
  },
];

export const POST: Question[] = [
  {
    id: "post_q1",
    type: "single",
    required: true,
    prompt:
      "Did you notice a row meant to help you quickly pick something to watch?",
    options: ["Yes", "No", "Not sure"],
  },
  {
    id: "post_q2",
    type: "single",
    required: true,
    claimTag: "C2",
    prompt:
      "Compared to how you normally decide at a meal, finding something with the 'Watch While You Eat' row was…",
    options: ["Much faster", "Faster", "About the same", "Slower"],
  },
  {
    id: "post_q3",
    type: "slider",
    required: true,
    prompt: "How well did the suggested episodes match your taste?",
    slider: { min: 1, max: 5, minLabel: "Not at all", maxLabel: "Very well" },
  },
  {
    id: "post_q4",
    type: "single",
    required: true,
    claimTag: "C3",
    prompt:
      "If that had been a real meal just now, would you have started watching — or given up?",
    options: ["Started easily", "Started eventually", "Probably given up"],
  },
  {
    id: "post_q5",
    type: "single",
    required: true,
    prompt: "Did it reduce the 'what do I put on' struggle for you specifically?",
    options: ["Yes, clearly", "Somewhat", "No"],
  },
  {
    id: "post_q6",
    type: "single",
    required: true,
    claimTag: "C4",
    prompt:
      "Would this keep you on Netflix at a meal instead of switching to something else?",
    options: ["Yes", "Maybe", "No", "I'd still switch"],
  },
  {
    id: "post_q7",
    type: "single",
    required: true,
    claimTag: "guardrail",
    prompt:
      "Did the suggestions feel like things you'd want, or things you'd already skip?",
    options: [
      "Mostly things I'd want",
      "A mix",
      "Mostly things I've already seen or would skip",
    ],
  },
  {
    id: "post_q8",
    type: "multi",
    required: true,
    prompt: "Which parts felt useful?",
    options: [
      "The single best-episode pick per show",
      "The mood filters",
      "The jump-to-the-best-moment graph",
      "That it used shows I already watch",
      "None of these",
    ],
  },
  {
    id: "post_q9",
    type: "slider",
    required: true,
    prompt: "How much would this improve your mealtime watching?",
    slider: { min: 0, max: 10, minLabel: "Not at all", maxLabel: "A lot" },
  },
  {
    id: "post_q10",
    type: "open",
    required: true,
    prompt: "What is the ONE thing that would make you actually use it?",
  },
  {
    id: "post_q11",
    type: "open",
    required: false,
    prompt: "Anything that confused you or got in the way?",
  },
];
