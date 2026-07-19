// キャラQRクレームトークン管理(運営側)。
// 正本: docs/70_すわぷよ・ユアタイム統合仕様/02_体験設計/08_ふわふわランドLive・QR連動・お口体操ミッション設計.md §5
// claim の消費(すわぷよ側)は src/integrations/characterClaim.ts の claim_character RPC 経由。
import { getSupabaseClient, type FuwafuwaSupabaseClient } from "../lib/supabase";
import type { ClaimToken } from "../types";
import type { Database } from "../types/database.types";
import { appendOperationLog } from "./operationLog";

type ClaimTokenRow = Database["public"]["Tables"]["character_claim_tokens"]["Row"];

function claimTokenFromRow(row: ClaimTokenRow): ClaimToken {
  return {
    token: row.token,
    displayCharacterId: row.display_character_id,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
  };
}

async function ensureClient(): Promise<FuwafuwaSupabaseClient> {
  const client = getSupabaseClient();
  if (client === null) {
    await appendOperationLog("error", "supabase_config_missing");
    throw new Error("supabase_config_missing");
  }
  return client;
}

// QR1枚 = 1トークン。expires_at 既定30日は migration 側の default に任せる。
export async function createClaimToken(displayCharacterId: string): Promise<ClaimToken> {
  const client = await ensureClient();
  const response = await client.from("character_claim_tokens").insert({ display_character_id: displayCharacterId }).select().single();
  if (response.error !== null) {
    await appendOperationLog("error", response.error.message, displayCharacterId);
    throw response.error;
  }
  return claimTokenFromRow(response.data);
}

export async function listClaimTokens(displayCharacterId: string): Promise<ClaimToken[]> {
  const client = await ensureClient();
  const response = await client
    .from("character_claim_tokens")
    .select("*")
    .eq("display_character_id", displayCharacterId)
    .order("created_at", { ascending: false });
  if (response.error !== null) {
    await appendOperationLog("error", response.error.message, displayCharacterId);
    throw response.error;
  }
  return response.data.map(claimTokenFromRow);
}

export async function revokeClaimToken(token: string): Promise<void> {
  const client = await ensureClient();
  const response = await client.from("character_claim_tokens").update({ status: "revoked" }).eq("token", token);
  if (response.error !== null) {
    await appendOperationLog("error", response.error.message);
    throw response.error;
  }
}
