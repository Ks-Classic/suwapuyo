// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  claimMission,
  createProfileAfterConsent,
  dailyPeriodKey,
  dailyPreferredExercise,
  exerciseSummary,
  getSnapshot,
  grantConsent,
  missions,
  newEvent,
  PRODUCT_CONSENT_VERSION,
  recordEvent,
  listEventSurveys,
  saveEventSurvey,
  saveSurvey,
  SURVEY_CONSENT_VERSION,
  weeklyPeriodKey,
} from "./localMvpRepository";

describe("local MVP repository contracts", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("does not persist an app profile before product consent", () => {
    expect(() => createProfileAfterConsent()).toThrow("product_consent_required");
    expect(localStorage.getItem("suwapuyo_mvp_state_v1")).toBeNull();
  });

  it("persists only the current family survey boundary", () => {
    grantConsent("product", PRODUCT_CONSENT_VERSION);
    createProfileAfterConsent();
    grantConsent("survey", SURVEY_CONSENT_VERSION);
    saveSurvey({ schemaVersion: 3, primaryPlayer: "child_and_adult", preferredActivity: "unanswered", children: [{ id: "child-1", birthYear: 2021, birthMonth: 5, gender: "female", ageBand: "3_6", ageAsOf: "2026-07-01" }], completedAt: "2026-07-11T00:00:00.000Z" });
    expect(getSnapshot().survey).toMatchObject({ schemaVersion: 3, primaryPlayer: "child_and_adult", children: [{ birthYear: 2021, birthMonth: 5, gender: "female", ageBand: "3_6" }] });
  });

  it("accepts a repeated event id only once", async () => {
    grantConsent("product", PRODUCT_CONSENT_VERSION);
    createProfileAfterConsent();
    const event = newEvent("exercise_completed", { exerciseType: "mouth" });
    await recordEvent(event, false);
    await recordEvent(event, false);
    expect((await exerciseSummary()).total.mouth).toBe(1);
  });

  it("claims a completed mission only once", async () => {
    grantConsent("product", PRODUCT_CONSENT_VERSION);
    createProfileAfterConsent();
    await recordEvent(newEvent("exercise_completed", { exerciseType: "mouth" }), false);
    const mission = (await missions()).find((row) => row.missionId === "exercise-once");
    expect(mission?.completed).toBe(true);
    expect(await claimMission("exercise-once", mission?.periodKey ?? "")).toBe(true);
    expect(await claimMission("exercise-once", mission?.periodKey ?? "")).toBe(false);
  });

  it("uses JST date and ISO week period keys", () => {
    const instant = new Date("2026-07-10T16:30:00.000Z");
    expect(dailyPeriodKey(instant)).toBe("2026-07-11");
    expect(weeklyPeriodKey(instant)).toMatch(/^2026-W\d{2}$/);
  });

  it("stores event answers separately and rejects unknown fields", () => {
    grantConsent("product", PRODUCT_CONSENT_VERSION);
    createProfileAfterConsent();
    grantConsent("survey", SURVEY_CONSENT_VERSION);
    saveEventSurvey({ phase: "during", surveyVersion: "event-2026-01", answers: { adult_count: "2", child_count: "1" }, completedAt: "2026-07-11T00:00:00.000Z" });
    expect(listEventSurveys()[0]?.answers).toEqual({ adult_count: "2", child_count: "1" });
    expect(() => saveEventSurvey({ phase: "during", surveyVersion: "event-2026-01", answers: { gender: "female" }, completedAt: "2026-07-11T00:00:00.000Z" })).toThrow("event_survey_unknown_answer");
  });

  it("keeps the selected exercise stable for the same day and preference", () => {
    const now = new Date("2026-07-12T03:00:00.000Z");
    expect(dailyPreferredExercise("random", now, 0.1)).toBe("mouth");
    expect(dailyPreferredExercise("random", now, 0.9)).toBe("mouth");
    expect(dailyPreferredExercise("body", now, 0.9)).toBe("breath");
  });
});
