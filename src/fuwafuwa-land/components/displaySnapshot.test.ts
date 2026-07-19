import { describe, expect, it, vi } from "vitest";
import type { DisplayCharacter, DisplayState, FuwafuwaServices } from "../types";
import { loadDisplaySnapshot, stateFromCharacters } from "./displaySnapshot";

const DISPLAY_STATE: DisplayState = {
  id: "current",
  visibleArtworkIds: ["sample-1"],
  mode: "idle",
  maxVisibleCount: 2,
  displayEvent: null,
  settings: {},
  updatedAt: "2026-07-19T00:00:00.000Z",
};

function character(id: string, status: DisplayCharacter["status"] = "visible"): DisplayCharacter {
  return {
    id,
    sourceType: "sample",
    sourceId: id,
    label: id,
    imagePath: `/${id}.png`,
    status,
    displayScale: 1,
    tapEnabled: false,
    sortOrder: 0,
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:00.000Z",
  };
}

function servicesWithSpeechFailure(): FuwafuwaServices {
  return {
    repository: { list: vi.fn(async () => []) },
    displayState: { getDisplayState: vi.fn(async () => DISPLAY_STATE) },
    characterContent: { listCharacters: vi.fn(async () => [character("sample-1")]) },
    speechLines: { list: vi.fn(async () => { throw new Error("speech_table_missing"); }) },
  } as unknown as FuwafuwaServices;
}

describe("loadDisplaySnapshot", () => {
  it("keeps the core display available when optional speech loading fails", async () => {
    await expect(loadDisplaySnapshot(servicesWithSpeechFailure())).resolves.toEqual({
      artworks: [],
      displayState: DISPLAY_STATE,
      characters: [character("sample-1")],
      speechLines: [],
    });
  });
});

describe("stateFromCharacters", () => {
  it("keeps the sample fallback when the character table is empty", () => {
    expect(stateFromCharacters(DISPLAY_STATE, [])).toBe(DISPLAY_STATE);
  });

  it("uses visible characters without replacing the configured display limit", () => {
    const result = stateFromCharacters(DISPLAY_STATE, [character("one"), character("two"), character("three"), character("hidden", "hidden")]);
    expect(result.visibleArtworkIds).toEqual(["one", "two"]);
    expect(result.maxVisibleCount).toBe(2);
  });
});
