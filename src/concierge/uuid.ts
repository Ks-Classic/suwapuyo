/**
 * iOS Safari <15.4 / LINEアプリ内WebView / 非HTTPS では `crypto.randomUUID` が
 * 未定義で TypeError になり、呼び出し元の工程ごと止まる（iPhoneで「エラー」に見える主因）。
 * 利用可能なら使い、無ければ getRandomValues → Math.random の順に安全に退避する。
 */
export function safeUuid(): string {
  try {
    const globalCrypto = typeof crypto !== "undefined" ? crypto : undefined;
    if (globalCrypto?.randomUUID !== undefined) {
      return globalCrypto.randomUUID();
    }
    if (globalCrypto?.getRandomValues !== undefined) {
      const bytes = globalCrypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch {
    // 下の Math.random fallback に落とす。
  }
  const rand = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `${rand()}${rand()}-${rand()}-4${rand().slice(1)}-${rand()}-${rand()}${rand()}${rand()}`;
}
