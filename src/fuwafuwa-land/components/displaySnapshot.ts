import type { Artwork, DisplayCharacter, DisplayState, FuwafuwaServices, SpeechLine } from "../types";

export interface DisplaySnapshot {
  artworks: Artwork[];
  displayState: DisplayState;
  characters: DisplayCharacter[];
  speechLines: SpeechLine[];
}

// せりふは補助機能。table未作成や一時障害でランド本体の初期表示を止めない。
export async function loadDisplaySnapshot(services: FuwafuwaServices): Promise<DisplaySnapshot> {
  const [artworks, displayState, characters, speechLines] = await Promise.all([
    services.repository.list(),
    services.displayState.getDisplayState(),
    services.characterContent.listCharacters(),
    services.speechLines.list().catch((): SpeechLine[] => []),
  ]);
  return { artworks, displayState, characters, speechLines };
}

export function stateFromCharacters(base: DisplayState, characters: DisplayCharacter[] | null): DisplayState {
  if (characters === null || characters.length === 0) {
    return base;
  }
  const visibleArtworkIds = characters
    .filter((character) => character.status === "visible")
    .map((character) => character.id)
    .slice(0, base.maxVisibleCount);
  return {
    ...base,
    visibleArtworkIds,
    featuredArtworkId: base.featuredArtworkId !== undefined && visibleArtworkIds.includes(base.featuredArtworkId) ? base.featuredArtworkId : undefined,
  };
}
