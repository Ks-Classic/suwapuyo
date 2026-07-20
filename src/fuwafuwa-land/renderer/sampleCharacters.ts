import { SAMPLE_CHARACTERS, type SampleCharacter } from "../../shared/characters/sampleCharacters";
import { DEFAULT_ARTWORK_DISPLAY_SCALE, type Artwork, type ArtworkStatus } from "../types";

// 既存のランド内importを保つ互換adapter。catalogの正本はsharedに置く。
export { SAMPLE_CHARACTERS, type SampleCharacter };

export function isSampleCharacterId(id: string): boolean {
  return SAMPLE_CHARACTERS.some((sample) => sample.id === id);
}

export function createSampleArtwork(sample: SampleCharacter, status: ArtworkStatus): Artwork {
  return {
    id: sample.id,
    displayLabel: sample.label,
    givenName: sample.label,
    source: "digital",
    imageBlobKey: sample.imageUrl,
    width: 1024,
    height: 1024,
    displayScale: DEFAULT_ARTWORK_DISPLAY_SCALE,
    status,
    consentScope: "event_only",
    createdAt: "2026-06-25T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
    showCount: 0,
    notes: `Default sample from ${sample.sourceImageUrl}`,
  };
}
