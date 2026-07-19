// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { taisouTuneSignature } from "../audio/TaisouMusic";
import { MOUTH_MISSIONS, RECENT_HOSTS_KEY, pickMissionHost } from "./mouthMissions";

describe("mouth missions v2", () => {
  beforeEach(() => localStorage.clear());

  it("contains exactly the ten specified mouth/face exercises and no neck exercise", () => {
    expect(MOUTH_MISSIONS.map(({ id }) => id)).toEqual(["aan", "niko_ii", "tako_uu", "pukupuku", "beee", "pachipachi", "wink", "aiube", "fuusen", "chu"]);
    expect(MOUTH_MISSIONS).toHaveLength(10);
    expect(MOUTH_MISSIONS.every((mission) => !`${mission.id}${mission.name}${mission.aim}`.includes("首"))).toBe(true);
  });

  it("provides a distinct generated tune for every exercise", () => {
    const signatures = MOUTH_MISSIONS.map(({ musicId }) => taisouTuneSignature(musicId));
    expect(signatures.every((signature) => signature !== null)).toBe(true);
    expect(new Set(signatures).size).toBe(10);
  });

  it("weights recently used hosts lower", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const first = pickMissionHost();
    expect(JSON.parse(localStorage.getItem(RECENT_HOSTS_KEY) ?? "[]")).toContain(first.id);
    vi.restoreAllMocks();
  });
});
