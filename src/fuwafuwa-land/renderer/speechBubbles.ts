import { Container, Text } from "pixi.js";
import { DEFAULT_SPEECH_INTERVAL_MS, type SpeechLine } from "../types";

export const SPEECH_BUBBLE_LIFETIME_MS = 4_000;
const SPEECH_BUBBLE_FADE_MS = 800;

export interface SpeechCharacterCandidate {
  id: string;
  featured: boolean;
}

export interface SpeechSelection {
  characterId: string;
  line: SpeechLine;
}

export interface SpeechBubble {
  text: Text;
  characterId: string;
  bornAt: number;
}

export function normalizeSpeechIntervalMs(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_SPEECH_INTERVAL_MS;
  }
  return Math.min(120_000, Math.max(15_000, value));
}

/** speechIntervalMs ±30% の次回発話間隔。 */
export function rollSpeechIntervalMs(intervalMs: number, rng: () => number): number {
  return Math.round(normalizeSpeechIntervalMs(intervalMs) * (0.7 + rng() * 0.6));
}

export function eligibleSpeechCharacters(
  characters: readonly SpeechCharacterCandidate[],
  lastCharacterId: string | null,
  displayEventActive: boolean,
): SpeechCharacterCandidate[] {
  if (displayEventActive) {
    return [];
  }
  return characters.filter((character) => !character.featured && character.id !== lastCharacterId);
}

export function speechLinesForCharacter(lines: readonly SpeechLine[], characterId: string): SpeechLine[] {
  return lines.filter(
    (line) => line.active && line.category === "idle" && (line.characterId === null || line.characterId === characterId),
  );
}

export function pickWeightedSpeechLine(lines: readonly SpeechLine[], rng: () => number): SpeechLine | null {
  const totalWeight = lines.reduce((total, line) => total + line.weight, 0);
  if (totalWeight <= 0) {
    return null;
  }
  const roll = rng() * totalWeight;
  let cumulative = 0;
  for (const line of lines) {
    cumulative += line.weight;
    if (roll < cumulative) {
      return line;
    }
  }
  return lines.at(-1) ?? null;
}

/** 仕様順: 話者を抽選し、その話者が言えるidleセリフを重み付き抽選する。 */
export function selectSpeech(
  characters: readonly SpeechCharacterCandidate[],
  lines: readonly SpeechLine[],
  lastCharacterId: string | null,
  displayEventActive: boolean,
  rng: () => number,
): SpeechSelection | null {
  const eligibleCharacters = eligibleSpeechCharacters(characters, lastCharacterId, displayEventActive);
  if (eligibleCharacters.length === 0) {
    return null;
  }
  const characterIndex = Math.min(eligibleCharacters.length - 1, Math.floor(rng() * eligibleCharacters.length));
  const character = eligibleCharacters[characterIndex];
  const line = pickWeightedSpeechLine(speechLinesForCharacter(lines, character.id), rng);
  return line === null ? null : { characterId: character.id, line };
}

/** napのZzzと同じstage上のPixi Textパーティクルとして生成する。 */
export function createSpeechBubble(stage: Container, selection: SpeechSelection, now: number): SpeechBubble {
  const text = new Text({
    text: selection.line.text,
    style: {
      fill: 0x27433a,
      fontSize: 24,
      fontWeight: "900",
      align: "center",
      wordWrap: true,
      wordWrapWidth: 360,
      stroke: { color: 0xffffff, width: 8 },
    },
  });
  text.anchor.set(0.5, 1);
  stage.addChild(text);
  return { text, characterId: selection.characterId, bornAt: now };
}

export function updateSpeechBubble(
  bubble: SpeechBubble,
  now: number,
  characterPosition: { x: number; y: number } | undefined,
  screenWidth: number,
): boolean {
  if (bubble.text.destroyed || characterPosition === undefined || now - bubble.bornAt >= SPEECH_BUBBLE_LIFETIME_MS) {
    destroySpeechBubble(bubble);
    return false;
  }
  bubble.text.x = Math.min(Math.max(190, characterPosition.x), Math.max(190, screenWidth - 190));
  bubble.text.y = characterPosition.y - 92;
  const fadeStartedAt = SPEECH_BUBBLE_LIFETIME_MS - SPEECH_BUBBLE_FADE_MS;
  const age = now - bubble.bornAt;
  bubble.text.alpha = age <= fadeStartedAt ? 1 : Math.max(0, 1 - (age - fadeStartedAt) / SPEECH_BUBBLE_FADE_MS);
  return true;
}

export function destroySpeechBubble(bubble: SpeechBubble | null): void {
  if (bubble !== null && !bubble.text.destroyed) {
    bubble.text.destroy();
  }
}
