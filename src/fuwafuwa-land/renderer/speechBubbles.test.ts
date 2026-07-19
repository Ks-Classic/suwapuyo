import { describe, expect, it, vi } from "vitest";
import type { SpeechLine } from "../types";
import {
  eligibleSpeechCharacters,
  normalizeSpeechIntervalMs,
  pickWeightedSpeechLine,
  rollSpeechIntervalMs,
  selectSpeech,
  speechLinesForCharacter,
  updateSpeechBubble,
  type SpeechBubble,
} from "./speechBubbles";

function line(overrides: Partial<SpeechLine> & Pick<SpeechLine, "id" | "text">): SpeechLine {
  return {
    characterId: null,
    category: "idle",
    boothRef: null,
    weight: 1,
    active: true,
    createdAt: "2026-07-19T00:00:00.000Z",
    ...overrides,
  };
}

describe("speech bubble selection", () => {
  it("selects idle active lines by weight", () => {
    const light = line({ id: "light", text: "軽い", weight: 1 });
    const heavy = line({ id: "heavy", text: "重い", weight: 3 });
    expect(pickWeightedSpeechLine([light, heavy], () => 0)).toBe(light);
    expect(pickWeightedSpeechLine([light, heavy], () => 0.3)).toBe(heavy);
  });

  it("applies speechIntervalMs bounds and ±30% jitter", () => {
    expect(normalizeSpeechIntervalMs(undefined)).toBe(30_000);
    expect(normalizeSpeechIntervalMs(1_000)).toBe(15_000);
    expect(normalizeSpeechIntervalMs(999_000)).toBe(120_000);
    expect(rollSpeechIntervalMs(30_000, () => 0)).toBe(21_000);
    expect(rollSpeechIntervalMs(30_000, () => 0.5)).toBe(30_000);
    expect(rollSpeechIntervalMs(30_000, () => 1)).toBe(39_000);
  });

  it("limits character-specific lines while allowing common idle lines", () => {
    const common = line({ id: "common", text: "共通" });
    const onlyA = line({ id: "a", text: "Aだけ", characterId: "a" });
    const inactive = line({ id: "inactive", text: "無効", active: false });
    const booth = line({ id: "booth", text: "ブース", category: "booth_intro" });
    expect(speechLinesForCharacter([common, onlyA, inactive, booth], "a")).toEqual([common, onlyA]);
    expect(speechLinesForCharacter([common, onlyA, inactive, booth], "b")).toEqual([common]);
    const selection = selectSpeech([{ id: "b", featured: false }], [common, onlyA], null, false, () => 0);
    expect(selection).toEqual({ characterId: "b", line: common });
  });

  it("excludes the previous speaker, featured characters, and all characters during events", () => {
    const characters = [{ id: "a", featured: false }, { id: "b", featured: false }];
    expect(eligibleSpeechCharacters(characters, "a", false)).toEqual([{ id: "b", featured: false }]);
    expect(selectSpeech(characters, [line({ id: "common", text: "共通" })], "a", false, () => 0)?.characterId).toBe("b");
    expect(selectSpeech([{ id: "a", featured: false }], [line({ id: "common", text: "共通" })], "a", false, () => 0)).toBeNull();
    expect(eligibleSpeechCharacters([{ id: "a", featured: true }, { id: "b", featured: false }], null, false)).toEqual([{ id: "b", featured: false }]);
    expect(eligibleSpeechCharacters(characters, null, true)).toEqual([]);
  });

  it("fades and destroys a bubble after about four seconds", () => {
    const destroy = vi.fn();
    const bubble = {
      characterId: "a",
      bornAt: 1_000,
      text: { destroyed: false, x: 0, y: 0, alpha: 1, destroy },
    } as unknown as SpeechBubble;
    expect(updateSpeechBubble(bubble, 4_999, { x: 300, y: 400 }, 1_000)).toBe(true);
    expect(bubble.text.alpha).toBeLessThan(0.01);
    expect(updateSpeechBubble(bubble, 5_000, { x: 300, y: 400 }, 1_000)).toBe(false);
    expect(destroy).toHaveBeenCalledOnce();
  });
});
