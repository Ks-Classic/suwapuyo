// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MouthMission, TaisouMissionHost } from "./mouthMissions";
import { RECENT_INTROS_KEY, pickMissionIntro } from "./missionIntro";

const HOST: TaisouMissionHost = { id: "sample-suusuu", name: "すーすー", image: "/host.png" };
const MISSION = { id: "aan", name: "おおきくあーん" } as MouthMission;

describe("mission intro", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => vi.restoreAllMocks());

  it("combines the selected character style with the exercise name", () => {
    const intro = pickMissionIntro(HOST, MISSION);
    expect(intro.missionLine).toBe("きょうは「おおきくあーん」！");
    expect(intro.cheerLine.length).toBeGreaterThan(0);
    expect(intro.launchLine.length).toBeGreaterThan(0);
  });

  it("avoids the immediately repeated variation for the same character", () => {
    const first = pickMissionIntro(HOST, MISSION);
    const second = pickMissionIntro(HOST, MISSION);
    expect(second.id).not.toBe(first.id);
    expect(JSON.parse(localStorage.getItem(RECENT_INTROS_KEY) ?? "[]")).toEqual([second.id, first.id]);
  });
});
