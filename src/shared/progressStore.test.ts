// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as analytics from "./analytics";
import { CHARACTERS } from "../config/characters";
import {
  getProgress,
  randomizePuyoCharacters,
  rerollUnpinnedSlots,
  togglePinnedPuyoSlot,
  weightedPickCharacterIds,
  type PuyoSlotId,
} from "./progressStore";

const ALL_SLOT_IDS: PuyoSlotId[] = ["ghost", "tooth", "blob", "tanuki"];
const ALL_CHARACTER_IDS = CHARACTERS.map((character) => character.id);

describe("progressStore puyo character formation", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("auto-assigns 4 distinct characters on first load and tracks puyo_auto_assign", () => {
    const trackSpy = vi.spyOn(analytics, "track");
    const progress = getProgress();
    const assignedIds = ALL_SLOT_IDS.map((slotId) => progress.selected_puyo_character_ids[slotId]);
    expect(new Set(assignedIds).size).toBe(4);
    assignedIds.forEach((id) => expect(ALL_CHARACTER_IDS).toContain(id));
    expect(progress.pinned_puyo_slot_ids).toEqual([]);
    expect(progress.recent_puyo_character_ids).toEqual(expect.arrayContaining(assignedIds));
    expect(trackSpy).toHaveBeenCalledWith("puyo_auto_assign", { surface: "progress_store", kind: "initial" });
  });

  it("toggles a slot's pinned state and persists it across reads", () => {
    getProgress();
    const pinned = togglePinnedPuyoSlot("tooth");
    expect(pinned.pinned_puyo_slot_ids).toEqual(["tooth"]);
    expect(getProgress().pinned_puyo_slot_ids).toEqual(["tooth"]);

    const unpinned = togglePinnedPuyoSlot("tooth");
    expect(unpinned.pinned_puyo_slot_ids).toEqual([]);
  });

  it("keeps pinned slots untouched while rerolling only unpinned slots", () => {
    const trackSpy = vi.spyOn(analytics, "track");
    const initial = getProgress();
    togglePinnedPuyoSlot("ghost");
    togglePinnedPuyoSlot("blob");
    const pinnedGhostId = initial.selected_puyo_character_ids.ghost;
    const pinnedBlobId = initial.selected_puyo_character_ids.blob;

    const rerolled = rerollUnpinnedSlots();

    expect(rerolled.selected_puyo_character_ids.ghost).toBe(pinnedGhostId);
    expect(rerolled.selected_puyo_character_ids.blob).toBe(pinnedBlobId);
    expect(rerolled.selected_puyo_character_ids.tooth).not.toBe(pinnedGhostId);
    expect(rerolled.selected_puyo_character_ids.tooth).not.toBe(pinnedBlobId);
    expect(rerolled.selected_puyo_character_ids.tanuki).not.toBe(pinnedGhostId);
    expect(rerolled.selected_puyo_character_ids.tanuki).not.toBe(pinnedBlobId);
    expect(trackSpy).toHaveBeenCalledWith("puyo_reroll_unpinned", { surface: "progress_store", kind: "2" });
  });

  it("does nothing and skips tracking when every slot is already pinned", () => {
    getProgress();
    ALL_SLOT_IDS.forEach((slotId) => togglePinnedPuyoSlot(slotId));
    const before = getProgress();
    const trackSpy = vi.spyOn(analytics, "track");

    const after = rerollUnpinnedSlots();

    expect(after.selected_puyo_character_ids).toEqual(before.selected_puyo_character_ids);
    expect(trackSpy).not.toHaveBeenCalledWith("puyo_reroll_unpinned", expect.anything());
  });

  it("rerolls all 4 slots and clears pinned slots on full randomize", () => {
    getProgress();
    togglePinnedPuyoSlot("ghost");

    const randomized = randomizePuyoCharacters();

    expect(randomized.pinned_puyo_slot_ids).toEqual([]);
    const assignedIds = ALL_SLOT_IDS.map((slotId) => randomized.selected_puyo_character_ids[slotId]);
    expect(new Set(assignedIds).size).toBe(4);
  });

  it("weights the pick so a recently seen character is chosen less often than a fresh one", () => {
    const recentId = ALL_CHARACTER_IDS[0];
    const freshSampleIds = ALL_CHARACTER_IDS.slice(1, 6);
    const trials = 4000;
    let recentPicked = 0;
    let freshPicked = 0;

    for (let trial = 0; trial < trials; trial++) {
      const [picked] = weightedPickCharacterIds([recentId], 1);
      if (picked === recentId) {
        recentPicked += 1;
      }
      if (freshSampleIds.includes(picked)) {
        freshPicked += 1;
      }
    }

    const recentFrequency = recentPicked / trials;
    const freshAverageFrequency = freshPicked / trials / freshSampleIds.length;
    expect(recentFrequency).toBeLessThan(freshAverageFrequency * 0.7);
  });
});
