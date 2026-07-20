import { SAMPLE_CHARACTERS } from "../shared/characters/sampleCharacters";
import type { SuwapuyoProgress } from "../shared/progressStore";

export interface SelectableCharacter {
  id: string;
  name: string;
  image: string;
  tier: "starter" | "hidden";
}

const HIDDEN_IDS = new Set([
  "sample-enshou",
  "sample-touka",
  "sample-sanka",
  "sample-emahime",
  "sample-hagurin",
  "sample-mieru",
  "sample-tenpiyo",
  "sample-kamumu",
  "sample-seiucchi",
]);

export const CHARACTERS: SelectableCharacter[] = SAMPLE_CHARACTERS.map((sample) => ({
  id: sample.id,
  name: sample.label,
  image: sample.imageUrl,
  tier: HIDDEN_IDS.has(sample.id) ? "hidden" : "starter",
}));

export async function loadCharacters(): Promise<SelectableCharacter[]> {
  return CHARACTERS;
}

export function isUnlocked(character: SelectableCharacter, progress: SuwapuyoProgress): boolean {
  return character.tier === "starter" || progress.unlocked_character_ids.includes(character.id);
}
