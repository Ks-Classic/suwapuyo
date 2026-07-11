// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  claimMission,
  createProfileAfterConsent,
  dailyPeriodKey,
  exerciseSummary,
  getSnapshot,
  grantConsent,
  missions,
  newEvent,
  PRODUCT_CONSENT_VERSION,
  recordEvent,
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

  it("keeps unanswered and 3_plus survey values without inventing children", () => {
    grantConsent("product", PRODUCT_CONSENT_VERSION);
    createProfileAfterConsent();
    grantConsent("survey", SURVEY_CONSENT_VERSION);
    saveSurvey({ adults: "3_plus", childCount: "3_plus", children: [], acquisitionSource: "unanswered", healthWork: "unanswered", interests: [], completedAt: "2026-07-11T00:00:00.000Z" });
    expect(getSnapshot().survey).toMatchObject({ adults: "3_plus", childCount: "3_plus", children: [] });
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
});
