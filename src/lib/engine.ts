import {
  countries,
  countryById,
  fields,
  type Country,
  type Field,
} from "../data/countries";
export type Mode = "learn" | "exam" | "review";
export type TaskType = "map" | "capitals" | "characteristics" | "full";
export type Settings = {
  mode: Mode;
  count: "10" | "20" | "all";
  taskType: TaskType;
  sound: boolean;
  theme: "light" | "dark";
};
export type Answers = Partial<Record<Field, string>>;
export type Mistakes = Record<string, Field[]>;
export type Question = {
  countryId: string;
  fields: Field[];
  options: Partial<Record<Field, string[]>>;
};
export type CheckedField = {
  field: Field;
  selected: string | null;
  expected: string;
  correct: boolean;
};
export type Result = { countryId: string; checks: CheckedField[] };
export type Session = {
  id: string;
  mode: Mode;
  taskType: TaskType;
  questions: Question[];
  index: number;
  answers: Answers;
  checked: boolean;
  results: Result[];
  startedAt: string;
};
export type Attempt = {
  id: string;
  mode: Mode;
  taskType: TaskType;
  date: string;
  countryIds: string[];
  results: Result[];
};
export const taskFields: Record<TaskType, readonly Field[]> = {
  map: ["map"],
  capitals: ["map", "capital"],
  characteristics: ["capital", "government", "structure", "economy", "colony"],
  full: fields,
};
export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function expectedValue(country: Country, field: Field): string | null {
  return field === "map" ? country.id : country[field];
}
export function makeOptions(
  country: Country,
  field: Field,
  random = Math.random,
): string[] {
  const expected = expectedValue(country, field);
  if (!expected || field === "map") return [];
  const values = [
    ...new Set(
      countries
        .map((c) => expectedValue(c, field))
        .filter((v): v is string => v !== null && v !== expected),
    ),
  ];
  return shuffle([expected, ...shuffle(values, random).slice(0, 3)], random);
}
export function makeQuestions(
  settings: Settings,
  mistakes: Mistakes,
  repeatIds?: string[],
  random = Math.random,
): Question[] {
  const pool = repeatIds
    ? repeatIds.map((id) => countryById[id]).filter(Boolean)
    : shuffle(countries, random);
  const questions = pool
    .map((country) => {
      const active = taskFields[settings.taskType].filter(
        (f) =>
          expectedValue(country, f) !== null &&
          (settings.mode !== "review" || mistakes[country.id]?.includes(f)),
      );
      return {
        countryId: country.id,
        fields: [...active],
        options: Object.fromEntries(
          active
            .filter((f) => f !== "map")
            .map((f) => [f, makeOptions(country, f, random)]),
        ),
      };
    })
    .filter((q) => q.fields.length > 0);
  return repeatIds || settings.count === "all"
    ? questions
    : questions.slice(0, Number(settings.count));
}
export function checkAnswers(question: Question, answers: Answers): Result {
  const country = countryById[question.countryId];
  return {
    countryId: country.id,
    checks: question.fields.flatMap((field) => {
      const expected = expectedValue(country, field);
      return expected === null
        ? []
        : [
            {
              field,
              expected,
              selected: answers[field] ?? null,
              correct: answers[field] === expected,
            },
          ];
    }),
  };
}
export function summarize(results: Result[]) {
  const checks = results.flatMap((r) => r.checks);
  const score = checks.filter((c) => c.correct).length;
  const total = checks.length;
  const percent = total ? Math.round((score / total) * 100) : 0;
  let streak = 0,
    bestStreak = 0;
  for (const r of results) {
    streak =
      r.checks.length && r.checks.every((c) => c.correct) ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
  }
  const categoryErrors = Object.fromEntries(
    fields.map((f) => [
      f,
      checks.filter((c) => c.field === f && !c.correct).length,
    ]),
  ) as Record<Field, number>;
  return {
    score,
    total,
    percent,
    streak,
    bestStreak,
    grade: percent >= 90 ? 5 : percent >= 75 ? 4 : percent >= 50 ? 3 : 2,
    categoryErrors,
    repeatIds: results
      .filter((r) => r.checks.some((c) => !c.correct))
      .map((r) => r.countryId),
  };
}
export function updateMistakes(
  previous: Mistakes,
  results: Result[],
): Mistakes {
  const next = { ...previous };
  for (const result of results) {
    const errors = new Set(next[result.countryId] ?? []);
    for (const c of result.checks) {
      if (c.correct) errors.delete(c.field);
      else errors.add(c.field);
    }
    if (errors.size) next[result.countryId] = [...errors];
    else delete next[result.countryId];
  }
  return next;
}
export function newSession(
  settings: Settings,
  mistakes: Mistakes,
  repeatIds?: string[],
  randomOne = false,
): Session | null {
  let questions = makeQuestions(settings, mistakes, repeatIds);
  if (randomOne) questions = questions.slice(0, 1);
  if (!questions.length) return null;
  return {
    id: crypto.randomUUID(),
    mode: settings.mode,
    taskType: settings.taskType,
    questions,
    index: 0,
    answers: {},
    checked: false,
    results: [],
    startedAt: new Date().toISOString(),
  };
}
