import { describe, expect, it } from "vitest";
import {
  freshData,
  readData,
  recordAttempt,
  writeData,
  STORAGE_KEY,
} from "../src/lib/storage";
import { checkAnswers, newSession } from "../src/lib/engine";
describe("Local progress", () => {
  it("round-trips settings and an unfinished session", () => {
    let raw = "";
    const data = freshData();
    data.settings.theme = "dark";
    data.session = newSession(data.settings, {});
    data.session!.answers = { capital: "Баку" };
    expect(
      writeData(data, {
        setItem: (key, value) => {
          expect(key).toBe(STORAGE_KEY);
          raw = value;
        },
      }),
    ).toBe(true);
    expect(readData({ getItem: () => raw })).toEqual({ data, warning: null });
  });
  it.each([
    "bad JSON",
    "{}",
    '{"version":8}',
    '{"version":1,"session":{"index":500}}',
  ])("recovers from damaged save: %s", (raw) => {
    const result = readData({ getItem: () => raw });
    expect(result.data).toEqual(freshData());
    expect(result.warning).toBeTruthy();
  });
  it("handles unavailable or full storage", () => {
    expect(
      readData({
        getItem: () => {
          throw Error("denied");
        },
      }).warning,
    ).toBeTruthy();
    expect(
      writeData(freshData(), {
        setItem: () => {
          throw Error("full");
        },
      }),
    ).toBe(false);
  });
  it("records a completed attempt once and updates mistakes", () => {
    const data = freshData(),
      session = newSession(data.settings, {}, undefined, true)!;
    session.results = [checkAnswers(session.questions[0], {})];
    session.checked = true;
    const updated = recordAttempt(data, session);
    expect(updated.attempts).toHaveLength(1);
    expect(updated.session).toBeNull();
    expect(Object.values(updated.mistakes)[0]).toHaveLength(6);
    expect(recordAttempt(updated, session).attempts).toHaveLength(1);
  });
  it("rejects an incomplete attempt", () => {
    const data = freshData();
    expect(() => recordAttempt(data, newSession(data.settings, {})!)).toThrow(
      "Попытка ещё не завершена",
    );
  });
  it("rejects saved session indices outside the set", () => {
    const data = freshData();
    data.session = newSession(data.settings, {})!;
    data.session.index = 999;
    expect(
      readData({ getItem: () => JSON.stringify(data) }).warning,
    ).toBeTruthy();
  });
});
