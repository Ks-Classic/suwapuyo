import { CHARACTERS } from "../config/characters";
import { track } from "./analytics";

export type TaisouBodyPart = "mouth" | "neck" | "breath";
export type PuyoSlotId = "ghost" | "tooth" | "blob" | "tanuki";

export const DEFAULT_PUYO_CHARACTER_IDS: Record<PuyoSlotId, string> = {
  ghost: "sample-wanono",
  tooth: "sample-waawaa",
  blob: "sample-suusuu",
  tanuki: "sample-tanupei",
};

const PUYO_SLOT_ORDER: PuyoSlotId[] = ["ghost", "tooth", "blob", "tanuki"];
const RECENT_HISTORY_LIMIT = PUYO_SLOT_ORDER.length * 2;
const FRESH_CHARACTER_WEIGHT = 3;
const RECENT_CHARACTER_WEIGHT = 1;

export interface SuwapuyoProgress {
  taisou_counts: Record<TaisouBodyPart, number>;
  login_days: string[];
  streak: number;
  unlocked_character_ids: string[];
  selected_buddy: string;
  selected_puyo_character_ids: Record<PuyoSlotId, string>;
  pinned_puyo_slot_ids: PuyoSlotId[];
  recent_puyo_character_ids: string[];
  first_summoned_at?: string;
  last_play_date: string;
}

const STORAGE_KEY = "suwapuyo_progress";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function starterIds(): string[] {
  return CHARACTERS.filter((character) => character.tier === "starter").map((character) => character.id);
}

export function weightedPickCharacterIds(recentIds: string[], count: number, excludeIds: string[] = []): string[] {
  const excluded = new Set(excludeIds);
  const remaining = CHARACTERS.map((character) => character.id).filter((id) => !excluded.has(id));
  const recent = new Set(recentIds);
  const picked: string[] = [];
  for (let slot = 0; slot < count && remaining.length > 0; slot++) {
    const weights = remaining.map((id) => (recent.has(id) ? RECENT_CHARACTER_WEIGHT : FRESH_CHARACTER_WEIGHT));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * totalWeight;
    let chosenIndex = weights.length - 1;
    for (let candidate = 0; candidate < weights.length; candidate++) {
      roll -= weights[candidate];
      if (roll <= 0) {
        chosenIndex = candidate;
        break;
      }
    }
    picked.push(remaining[chosenIndex]);
    remaining.splice(chosenIndex, 1);
  }
  return picked;
}

function nextRecentPuyoCharacterIds(current: string[], added: string[]): string[] {
  return Array.from(new Set([...added, ...current])).slice(0, RECENT_HISTORY_LIMIT);
}

function weightedRandomPuyoCharacterIds(recentIds: string[]): Record<PuyoSlotId, string> {
  const picked = weightedPickCharacterIds(recentIds, PUYO_SLOT_ORDER.length);
  return {
    ghost: picked[0] ?? DEFAULT_PUYO_CHARACTER_IDS.ghost,
    tooth: picked[1] ?? DEFAULT_PUYO_CHARACTER_IDS.tooth,
    blob: picked[2] ?? DEFAULT_PUYO_CHARACTER_IDS.blob,
    tanuki: picked[3] ?? DEFAULT_PUYO_CHARACTER_IDS.tanuki,
  };
}

function normalizeProgress(raw: Partial<SuwapuyoProgress> | null): SuwapuyoProgress {
  const today = todayKey();
  const loginDays = Array.from(new Set([...(raw?.login_days ?? []), today])).sort();
  const priorRecentIds = raw?.recent_puyo_character_ids ?? [];
  const hasExistingSelection = raw?.selected_puyo_character_ids !== undefined;
  const initialPuyoIds = hasExistingSelection
    ? (raw?.selected_puyo_character_ids as Record<PuyoSlotId, string>)
    : weightedRandomPuyoCharacterIds(priorRecentIds);
  const recentPuyoCharacterIds = hasExistingSelection
    ? priorRecentIds
    : nextRecentPuyoCharacterIds(priorRecentIds, Object.values(initialPuyoIds));
  return {
    taisou_counts: {
      mouth: raw?.taisou_counts?.mouth ?? 0,
      neck: raw?.taisou_counts?.neck ?? 0,
      breath: raw?.taisou_counts?.breath ?? 0,
    },
    login_days: loginDays,
    streak: Math.max(raw?.streak ?? 1, 1),
    unlocked_character_ids: raw?.unlocked_character_ids ?? starterIds(),
    selected_buddy: raw?.selected_buddy ?? "",
    selected_puyo_character_ids: {
      ...DEFAULT_PUYO_CHARACTER_IDS,
      ...initialPuyoIds,
    },
    pinned_puyo_slot_ids: raw?.pinned_puyo_slot_ids ?? [],
    recent_puyo_character_ids: recentPuyoCharacterIds,
    first_summoned_at: raw?.first_summoned_at,
    last_play_date: today,
  };
}

export function getProgress(): SuwapuyoProgress {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    const next = normalizeProgress(null);
    saveProgress(next);
    track("puyo_auto_assign", { surface: "progress_store", kind: "initial" });
    return next;
  }
  try {
    const next = normalizeProgress(JSON.parse(raw) as Partial<SuwapuyoProgress>);
    saveProgress(next);
    return next;
  } catch (error) {
    console.debug("progressStore parse failed", error);
    const next = normalizeProgress(null);
    saveProgress(next);
    track("puyo_auto_assign", { surface: "progress_store", kind: "recovered" });
    return next;
  }
}

export function saveProgress(progress: SuwapuyoProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function setSelectedBuddy(id: string): SuwapuyoProgress {
  const progress = getProgress();
  const next = { ...progress, selected_buddy: id, last_play_date: todayKey() };
  saveProgress(next);
  return next;
}

export function setPuyoCharacter(slotId: PuyoSlotId, characterId: string): SuwapuyoProgress {
  const progress = getProgress();
  const next = {
    ...progress,
    selected_puyo_character_ids: {
      ...progress.selected_puyo_character_ids,
      [slotId]: characterId,
    },
    last_play_date: todayKey(),
  };
  saveProgress(next);
  return next;
}

export function togglePinnedPuyoSlot(slotId: PuyoSlotId): SuwapuyoProgress {
  const progress = getProgress();
  const pinned = new Set(progress.pinned_puyo_slot_ids);
  if (pinned.has(slotId)) {
    pinned.delete(slotId);
  } else {
    pinned.add(slotId);
  }
  const next = {
    ...progress,
    pinned_puyo_slot_ids: PUYO_SLOT_ORDER.filter((id) => pinned.has(id)),
    last_play_date: todayKey(),
  };
  saveProgress(next);
  return next;
}

export function randomizePuyoCharacters(): SuwapuyoProgress {
  const progress = getProgress();
  const nextIds = weightedRandomPuyoCharacterIds(progress.recent_puyo_character_ids);
  const next = {
    ...progress,
    selected_puyo_character_ids: nextIds,
    pinned_puyo_slot_ids: [],
    recent_puyo_character_ids: nextRecentPuyoCharacterIds(progress.recent_puyo_character_ids, Object.values(nextIds)),
    selected_buddy: "",
    last_play_date: todayKey(),
  };
  saveProgress(next);
  return next;
}

export function rerollUnpinnedSlots(): SuwapuyoProgress {
  const progress = getProgress();
  const pinned = new Set(progress.pinned_puyo_slot_ids);
  const unpinnedSlots = PUYO_SLOT_ORDER.filter((slotId) => !pinned.has(slotId));
  if (unpinnedSlots.length === 0) {
    return progress;
  }
  const lockedCharacterIds = PUYO_SLOT_ORDER.filter((slotId) => pinned.has(slotId)).map(
    (slotId) => progress.selected_puyo_character_ids[slotId],
  );
  const picked = weightedPickCharacterIds(progress.recent_puyo_character_ids, unpinnedSlots.length, lockedCharacterIds);
  const nextSelected = { ...progress.selected_puyo_character_ids };
  unpinnedSlots.forEach((slotId, index) => {
    nextSelected[slotId] = picked[index] ?? nextSelected[slotId];
  });
  const next = {
    ...progress,
    selected_puyo_character_ids: nextSelected,
    recent_puyo_character_ids: nextRecentPuyoCharacterIds(progress.recent_puyo_character_ids, picked),
    last_play_date: todayKey(),
  };
  saveProgress(next);
  track("puyo_reroll_unpinned", { surface: "progress_store", kind: `${unpinnedSlots.length}` });
  return next;
}

export function markFirstSummoned(): SuwapuyoProgress {
  const progress = getProgress();
  if (progress.first_summoned_at !== undefined) {
    return progress;
  }
  const next = { ...progress, first_summoned_at: new Date().toISOString() };
  saveProgress(next);
  return next;
}

export function incrementTaisouCount(bodyPart: TaisouBodyPart): SuwapuyoProgress {
  const progress = getProgress();
  const next = {
    ...progress,
    taisou_counts: {
      ...progress.taisou_counts,
      [bodyPart]: progress.taisou_counts[bodyPart] + 1,
    },
    last_play_date: todayKey(),
  };
  saveProgress(next);
  return next;
}

export function unlockCharacter(characterId: string): SuwapuyoProgress {
  const progress = getProgress();
  if (progress.unlocked_character_ids.includes(characterId)) {
    return progress;
  }
  const next = {
    ...progress,
    unlocked_character_ids: [...progress.unlocked_character_ids, characterId],
    last_play_date: todayKey(),
  };
  saveProgress(next);
  return next;
}

export function unlockRule(progress: SuwapuyoProgress): string[] {
  void progress;
  return starterIds();
}
