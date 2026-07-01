import { CHARACTERS } from "../config/characters";

export type TaisouBodyPart = "mouth" | "neck" | "breath";
export type PuyoSlotId = "ghost" | "tooth" | "blob" | "tanuki";

export const DEFAULT_PUYO_CHARACTER_IDS: Record<PuyoSlotId, string> = {
  ghost: "sample-wanono",
  tooth: "sample-waawaa",
  blob: "sample-suusuu",
  tanuki: "sample-tanupei",
};

export interface SuwapuyoProgress {
  taisou_counts: Record<TaisouBodyPart, number>;
  login_days: string[];
  streak: number;
  unlocked_character_ids: string[];
  selected_buddy: string;
  selected_puyo_character_ids: Record<PuyoSlotId, string>;
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

function randomPuyoCharacterIds(): Record<PuyoSlotId, string> {
  const pool = starterIds();
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return {
    ghost: shuffled[0] ?? DEFAULT_PUYO_CHARACTER_IDS.ghost,
    tooth: shuffled[1] ?? DEFAULT_PUYO_CHARACTER_IDS.tooth,
    blob: shuffled[2] ?? DEFAULT_PUYO_CHARACTER_IDS.blob,
    tanuki: shuffled[3] ?? DEFAULT_PUYO_CHARACTER_IDS.tanuki,
  };
}

function normalizeProgress(raw: Partial<SuwapuyoProgress> | null): SuwapuyoProgress {
  const today = todayKey();
  const loginDays = Array.from(new Set([...(raw?.login_days ?? []), today])).sort();
  const initialPuyoIds = raw?.selected_puyo_character_ids ?? randomPuyoCharacterIds();
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
    first_summoned_at: raw?.first_summoned_at,
    last_play_date: today,
  };
}

export function getProgress(): SuwapuyoProgress {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    const next = normalizeProgress(null);
    saveProgress(next);
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

export function randomizePuyoCharacters(): SuwapuyoProgress {
  const progress = getProgress();
  const next = {
    ...progress,
    selected_puyo_character_ids: randomPuyoCharacterIds(),
    selected_buddy: "",
    last_play_date: todayKey(),
  };
  saveProgress(next);
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
