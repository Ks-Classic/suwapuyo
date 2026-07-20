export type OwnedCharacterSource = "fuwafuwa_artwork";
export type CharacterAvailability = "available" | "source_hidden" | "source_archived";
export type ClaimTokenState = "active" | "claimed" | "expired" | "revoked" | "rejected";

// 生LINE IDや作品連番を境界へ持ち込まない。所有主体は検証済みsessionからserverが解決する。
export interface ClaimCharacterRequest {
  opaqueToken: string;
  requestId: string;
}

export interface OwnedCharacter {
  characterId: string;
  displayName: string;
  imageUrl: string;
  source: OwnedCharacterSource;
  availability: CharacterAvailability;
  linkedAt: string;
}

export type ClaimCharacterFailure =
  | "invalid_token"
  | "expired_token"
  | "revoked_token"
  | "claimed_by_another_owner"
  | "session_required"
  | "temporarily_unavailable";

export type ClaimCharacterResponse =
  | { ok: true; character: OwnedCharacter; idempotent: boolean }
  | { ok: false; reason: ClaimCharacterFailure };

const ALLOWED_TRANSITIONS: Readonly<Record<ClaimTokenState, readonly ClaimTokenState[]>> = {
  active: ["claimed", "expired", "revoked"],
  claimed: ["claimed", "rejected"],
  expired: ["rejected"],
  revoked: ["rejected"],
  rejected: [],
};

export function isAllowedClaimTransition(from: ClaimTokenState, to: ClaimTokenState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export interface CharacterClaimGateway {
  claim(request: ClaimCharacterRequest): Promise<ClaimCharacterResponse>;
  listOwnedCharacters(): Promise<readonly OwnedCharacter[]>;
}
