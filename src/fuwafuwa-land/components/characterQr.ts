import type { ClaimToken } from "../types";

// QRに載せるURL。LIFF IDがあればLIFFディープリンク、なければ自ホストの /claim ルート。
export function buildClaimUrl(token: string, liffId: string | undefined, origin: string): string {
  const trimmedLiffId = liffId?.trim() ?? "";
  if (trimmedLiffId.length > 0) {
    return `https://liff.line.me/${trimmedLiffId}?claim=${encodeURIComponent(token)}`;
  }
  return `${origin}/claim?token=${encodeURIComponent(token)}`;
}

export function claimTokenStatusLabel(token: ClaimToken, now: Date = new Date()): string {
  if (token.status === "claimed") {
    return "使用済み";
  }
  if (token.status === "revoked") {
    return "失効";
  }
  if (Date.parse(token.expiresAt) < now.getTime()) {
    return "期限切れ";
  }
  return "有効";
}
