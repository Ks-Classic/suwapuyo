import { describe, expect, it } from "vitest";
import { settingsFromJson, settingsToJson } from "./displayState";

describe("speechIntervalMs settings persistence", () => {
  it("round-trips speech frequency without dropping existing settings", () => {
    const stored = settingsToJson({ bgmTrackId: "omatsuri", bgmVolume: 0.65, speechIntervalMs: 45_000 });
    expect(settingsFromJson(stored)).toEqual({ bgmTrackId: "omatsuri", bgmVolume: 0.65, speechIntervalMs: 45_000 });
  });

  it("clamps persisted speech frequency to the specified range", () => {
    expect(settingsFromJson({ speechIntervalMs: 1_000 })).toEqual({ speechIntervalMs: 15_000 });
    expect(settingsFromJson({ speechIntervalMs: 999_000 })).toEqual({ speechIntervalMs: 120_000 });
  });
});
