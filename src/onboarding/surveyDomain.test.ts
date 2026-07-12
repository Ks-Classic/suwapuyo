import { describe, expect, it } from "vitest";
import { birthMonthToAgeBand, eventQuestionsFor, normalizeStoredSurvey, preferredExerciseType } from "./surveyDomain";

describe("survey domain", () => {
  const asOf = new Date("2026-07-11T00:00:00Z");

  it("derives age bands at month precision", () => {
    expect(birthMonthToAgeBand({ year: 2023, month: 7 }, asOf)?.ageBand).toBe("3_6");
    expect(birthMonthToAgeBand({ year: 2020, month: 8 }, asOf)?.ageBand).toBe("3_6");
    expect(birthMonthToAgeBand({ year: 2019, month: 7 }, asOf)?.ageBand).toBe("7_9");
  });

  it("rejects future, malformed and over-age values", () => {
    expect(birthMonthToAgeBand({ year: 2026, month: 8 }, asOf)).toBeNull();
    expect(birthMonthToAgeBand({ year: 2020, month: 13 }, asOf)).toBeNull();
    expect(birthMonthToAgeBand({ year: 2000, month: 1 }, asOf)).toBeNull();
  });

  it("keeps event questions out of normal onboarding", () => {
    expect(eventQuestionsFor("normal")).toEqual([]);
    expect(eventQuestionsFor("before")).not.toEqual(eventQuestionsFor("during"));
    expect(eventQuestionsFor("during")).not.toEqual(eventQuestionsFor("after"));
  });

  it("maps the preferred activity to the first exercise", () => {
    expect(preferredExerciseType("mouth", 0.9)).toBe("mouth");
    expect(preferredExerciseType("body", 0.2)).toBe("neck");
    expect(preferredExerciseType("body", 0.8)).toBe("breath");
    expect(preferredExerciseType("random", 0.8)).toBe("neck");
  });

  it("normalizes legacy data without retaining removed fields", () => {
    const migrated = normalizeStoredSurvey({ childCount: "1", children: [{ id: "old", ageBand: "3_6", gender: "female" }], acquisitionSource: "instagram", healthWork: "yes" });
    expect(migrated).toEqual({ schemaVersion: 3, primaryPlayer: "child_and_adult", preferredActivity: "unanswered", children: [{ id: "child-1", birthYear: null, birthMonth: null, gender: "prefer_not_to_say", ageBand: "3_6", ageAsOf: null }] });
  });
});
