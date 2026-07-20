// すわぷよ側: QRクレーム連携(claim_character / list_my_characters RPC)。
// 正本: docs/70_すわぷよ・ユアタイム統合仕様/02_体験設計/08_ふわふわランドLive・QR連動・お口体操ミッション設計.md §5
// トークン発行(運営側)は src/fuwafuwa-land/store/claimStore.ts。
import { ARTWORK_BUCKET, CHARACTER_CONTENT_BUCKET } from "../fuwafuwa-land/config";
import { getSupabaseClient } from "../fuwafuwa-land/lib/supabase";
export { getClaimTokenFromUrl } from "./characterClaimUrl";

export type ClaimedCharacterSourceType = "sample" | "artwork" | "sponsor";

export interface ClaimedCharacter {
  displayCharacterId: string;
  label: string;
  imagePath: string;
  sourceType: ClaimedCharacterSourceType;
  sourceId: string;
}

export interface LinkedCharacter extends ClaimedCharacter {
  linkedAt: string;
}

export type ClaimFailureReason = "invalid" | "missing-config" | "network";

export type ClaimCharacterResult =
  | { ok: true; character: ClaimedCharacter }
  | { ok: false; reason: ClaimFailureReason };

// claim_character RPC: active トークンを原子的に消費して LINE ユーザーとキャラを連結する。
// claim済みトークンを同一ユーザーが再スキャンした場合は冪等に成功が返る(migration 側仕様)。
export async function claimCharacter(token: string, lineUserId: string): Promise<ClaimCharacterResult> {
  const client = getSupabaseClient();
  if (client === null) {
    return { ok: false, reason: "missing-config" };
  }
  const trimmedToken = token.trim();
  if (trimmedToken.length === 0) {
    return { ok: false, reason: "invalid" };
  }
  const response = await client.rpc("claim_character", { p_token: trimmedToken, p_line_user_id: lineUserId });
  if (response.error !== null) {
    const invalid = response.error.message.includes("invalid_or_used_token") || response.error.message.includes("invalid input syntax for type uuid");
    return { ok: false, reason: invalid ? "invalid" : "network" };
  }
  const row = response.data.at(0);
  if (row === undefined) {
    return { ok: false, reason: "invalid" };
  }
  return {
    ok: true,
    character: {
      displayCharacterId: row.display_character_id,
      label: row.label,
      imagePath: row.image_path,
      sourceType: row.source_type,
      sourceId: row.source_id,
    },
  };
}

// 自分(LINEユーザー)に連結済みのキャラ一覧。Supabase 未設定時は空配列(ローカルデモ耐性)。
export async function listMyCharacters(lineUserId: string): Promise<LinkedCharacter[]> {
  const client = getSupabaseClient();
  if (client === null) {
    return [];
  }
  const response = await client.rpc("list_my_characters", { p_line_user_id: lineUserId });
  if (response.error !== null) {
    throw response.error;
  }
  return response.data.map((row) => ({
    displayCharacterId: row.display_character_id,
    label: row.label,
    imagePath: row.image_path,
    sourceType: row.source_type,
    sourceId: row.source_id,
    linkedAt: row.linked_at,
  }));
}

// display_characters.image_path → 表示URL。
// "/" 始まりは同梱アセット(サンプルキャラ等)なのでそのまま返す。
// それ以外は Supabase storage の公開URL。作品由来(sourceType==="artwork")は
// artworks バケット、それ以外は character-content バケットに実体がある。
export function getCharacterImageUrl(imagePath: string, sourceType?: ClaimedCharacterSourceType): string {
  if (imagePath.startsWith("/")) {
    return imagePath;
  }
  const client = getSupabaseClient();
  if (client === null) {
    return imagePath;
  }
  const bucket = sourceType === "artwork" ? ARTWORK_BUCKET : CHARACTER_CONTENT_BUCKET;
  return client.storage.from(bucket).getPublicUrl(imagePath).data.publicUrl;
}

const DEMO_LINE_USER_KEY = "suwapuyo.claim.demoUserId";

// LIFF demo モード(VITE_SUWAPUYO_LIFF_MODE==="demo")用のローカル擬似 LINE userId。
// 端末ごとに固定なので、demo でも claim → キャラ選択の一連の流れを検証できる。
export function getDemoLineUserId(): string {
  const existing = window.localStorage.getItem(DEMO_LINE_USER_KEY);
  if (existing !== null && existing.length > 0) {
    return existing;
  }
  const created = `demo-${crypto.randomUUID()}`;
  window.localStorage.setItem(DEMO_LINE_USER_KEY, created);
  return created;
}
