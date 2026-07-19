import { describe, expect, it } from "vitest";
import { settingsFromJson, settingsToJson } from "./displayState";

describe("display state settings persistence", () => {
  it("round-trips BGM selection and volume through display_state.settings", () => {
    const stored = settingsToJson({ bgmTrackId: "omatsuri", bgmVolume: 0.65 });
    expect(settingsFromJson(stored)).toEqual({ bgmTrackId: "omatsuri", bgmVolume: 0.65 });
  });

  it("uses safe values for realtime rows with invalid settings", () => {
    expect(settingsFromJson({ bgmTrackId: "unknown", bgmVolume: 2 })).toEqual({ bgmVolume: 1 });
    expect(settingsFromJson(null)).toEqual({});
  });
});
