import { describe, expect, it } from "vitest";
import { countries, countryById, fields } from "../src/data/countries";
import {
  checkAnswers,
  expectedValue,
  makeOptions,
  makeQuestions,
  shuffle,
  summarize,
  updateMistakes,
  type Answers,
  type Result,
} from "../src/lib/engine";
import { defaultSettings } from "../src/lib/storage";
import geo from "../src/data/asia.geo.json";
const fixed = () => 0.42;
function correctResult(id: string): Result {
  const q = makeQuestions(
    { ...defaultSettings, count: "all" },
    {},
    [id],
    fixed,
  )[0];
  return checkAnswers(
    q,
    Object.fromEntries(
      fields.map((f) => [f, expectedValue(countryById[id], f)]),
    ) as Answers,
  );
}
describe("Source data and map coverage", () => {
  it("contains exactly 48 unique countries and 288 known source cells", () => {
    expect(countries).toHaveLength(48);
    expect(new Set(countries.map((c) => c.id)).size).toBe(48);
    expect(new Set(countries.map((c) => c.name)).size).toBe(48);
    expect(
      countries
        .flatMap((c) => [
          c.name,
          ...fields.filter((f) => f !== "map").map((f) => c[f]),
        ])
        .filter(Boolean),
    ).toHaveLength(288);
  });
  it("preserves unusual source wording and page references", () => {
    expect(countryById.IRN.colony).toBe("Да - Великобритании");
    expect(countryById.MMR.structure).toBe("Федерация");
    expect(countryById.NPL.structure).toBe("Федерация");
    expect(countryById.TKM.economy).toBe("Ниже среднего / низкий");
    expect(countryById.BRN.government).toBe(
      "Теократическая монархия (можно: абсолютная)",
    );
    countries.forEach((c, i) => {
      expect(c.sourcePage).toBe(Math.floor(i / 16) + 1);
      expect(c.sourceRow).toBe((i % 16) + 1);
    });
  });
  it("has geometry for every country and no extra study countries", () => {
    const mapped = new Set(
      geo.features
        .filter((f) => f.properties.study)
        .map((f) => f.properties.id),
    );
    expect([...mapped].sort()).toEqual(countries.map((c) => c.id).sort());
    geo.features.forEach((f) =>
      expect(f.geometry.coordinates.length).toBeGreaterThan(0),
    );
  });
});
describe("Question generation", () => {
  it.each(["10", "20", "all"] as const)(
    "creates a unique set of %s countries",
    (count) => {
      const q = makeQuestions(
        { ...defaultSettings, count },
        {},
        undefined,
        fixed,
      );
      expect(q).toHaveLength(count === "all" ? 48 : Number(count));
      expect(new Set(q.map((x) => x.countryId)).size).toBe(q.length);
    },
  );
  it.each(["map", "capitals", "characteristics", "full"] as const)(
    "uses only the selected fields: %s",
    (taskType) => {
      const expected = {
        map: ["map"],
        capitals: ["map", "capital"],
        characteristics: [
          "capital",
          "government",
          "structure",
          "economy",
          "colony",
        ],
        full: [...fields],
      };
      expect(
        makeQuestions({ ...defaultSettings, taskType }, {}, undefined, fixed)[0]
          .fields,
      ).toEqual(expected[taskType]);
    },
  );
  it("always includes the correct answer, uses source-only distractors and has no duplicates", () => {
    for (const c of countries)
      for (const f of fields.filter((f) => f !== "map")) {
        const options = makeOptions(c, f);
        expect(options).toContain(c[f]);
        expect(new Set(options).size).toBe(options.length);
        expect(options.length).toBeGreaterThanOrEqual(2);
        expect(options.length).toBeLessThanOrEqual(4);
        options.forEach((v) =>
          expect(countries.some((other) => other[f] === v)).toBe(true),
        );
      }
  });
  it("shuffles with supplied randomness, without changing the input", () => {
    const a = [1, 2, 3, 4, 5];
    expect(shuffle(a, () => 0)).not.toEqual(a);
    expect(a).toEqual([1, 2, 3, 4, 5]);
    expect(makeOptions(countries[0], "capital", () => 0)).not.toEqual(
      makeOptions(countries[0], "capital", () => 0.99),
    );
  });
  it("only repeats incorrect fields and respects the task filter", () => {
    const mistakes = {
      JPN: ["capital", "economy"] as const,
      IND: ["map"] as const,
    };
    const mutable = { JPN: [...mistakes.JPN], IND: [...mistakes.IND] };
    const qs = makeQuestions(
      { ...defaultSettings, mode: "review", count: "all" },
      mutable,
      undefined,
      fixed,
    );
    expect(qs).toHaveLength(2);
    expect(qs.find((q) => q.countryId === "JPN")?.fields).toEqual([
      "capital",
      "economy",
    ]);
    expect(
      makeQuestions(
        { ...defaultSettings, mode: "review", taskType: "map" },
        mutable,
      ),
    ).toEqual([expect.objectContaining({ countryId: "IND", fields: ["map"] })]);
    expect(makeQuestions({ ...defaultSettings, mode: "review" }, {})).toEqual(
      [],
    );
  });
  it("replays the same set in the same order even when count differs", () => {
    expect(
      makeQuestions(
        { ...defaultSettings, count: "10" },
        {},
        countries.map((c) => c.id),
        fixed,
      ).map((q) => q.countryId),
    ).toEqual(countries.map((c) => c.id));
  });
  it("never creates an option for an unknown source value", () => {
    const country = { ...countries[0], capital: null };
    expect(expectedValue(country, "capital")).toBeNull();
    expect(makeOptions(country, "capital")).toEqual([]);
  });
});
describe("Answer checking and score", () => {
  it("awards six individual points for a complete correct answer", () => {
    const s = summarize([correctResult("JPN")]);
    expect(s).toMatchObject({
      score: 6,
      total: 6,
      percent: 100,
      grade: 5,
      bestStreak: 1,
    });
  });
  it("detects each incorrect and missing answer independently", () => {
    const q = makeQuestions(defaultSettings, {}, ["JPN"], fixed)[0];
    const answer = {
      map: "IND",
      capital: "Токио",
      government: "Монархия",
      structure: "Унитарное",
      colony: "Нет",
    };
    const r = checkAnswers(q, answer);
    expect(r.checks.map((c) => c.correct)).toEqual([
      false,
      true,
      false,
      true,
      false,
      true,
    ]);
    expect(r.checks.find((c) => c.field === "economy")?.selected).toBeNull();
    expect(summarize([r])).toMatchObject({
      score: 3,
      total: 6,
      percent: 50,
      grade: 3,
      repeatIds: ["JPN"],
    });
  });
  it("checks only active fields; an unasked answer cannot earn points", () => {
    const q = makeQuestions({ ...defaultSettings, taskType: "map" }, {}, [
      "JPN",
    ])[0];
    expect(
      summarize([checkAnswers(q, { map: "JPN", capital: "Токио" })]),
    ).toMatchObject({ score: 1, total: 1 });
  });
  it("requires the full colonial answer, not merely yes", () => {
    const q = makeQuestions(defaultSettings, {}, ["IND"])[0];
    expect(
      checkAnswers(q, { colony: "Да" }).checks.find((c) => c.field === "colony")
        ?.correct,
    ).toBe(false);
  });
  it.each([
    [90, 5],
    [89, 4],
    [75, 4],
    [74, 3],
    [50, 3],
    [49, 2],
    [0, 2],
    [100, 5],
  ])("gives grade %s → %s", (percent, grade) => {
    const checks = Array.from({ length: 100 }, (_, i) => ({
      field: "map" as const,
      selected: "JPN",
      expected: "JPN",
      correct: i < percent,
    }));
    expect(summarize([{ countryId: "JPN", checks }]).grade).toBe(grade);
  });
  it("counts streaks of fully correct countries and category errors", () => {
    const wrong = correctResult("IND");
    wrong.checks[0].correct = false;
    const s = summarize([
      correctResult("JPN"),
      correctResult("CHN"),
      wrong,
      correctResult("IND"),
    ]);
    expect(s.bestStreak).toBe(2);
    expect(s.streak).toBe(1);
    expect(s.categoryErrors.map).toBe(1);
    expect(s.categoryErrors.capital).toBe(0);
  });
  it("handles an empty result without NaN", () => {
    expect(summarize([])).toMatchObject({
      score: 0,
      total: 0,
      percent: 0,
      bestStreak: 0,
    });
  });
  it("keeps untested mistakes, clears corrected fields and records new errors", () => {
    const original = { JPN: ["capital", "map"] as ("capital" | "map")[] };
    const next = updateMistakes(original, [
      {
        countryId: "JPN",
        checks: [
          {
            field: "capital",
            correct: true,
            expected: "Токио",
            selected: "Токио",
          },
          { field: "colony", correct: false, expected: "Нет", selected: "Да" },
        ],
      },
    ]);
    expect(next.JPN).toEqual(["map", "colony"]);
    expect(original.JPN).toEqual(["capital", "map"]);
    expect(updateMistakes(next, [correctResult("JPN")])).toEqual({});
  });
});
