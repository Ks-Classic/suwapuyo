// QR直リンクとLIFF deep linkからopaque claim tokenだけを取り出す。
// 所有者の解決やtoken検証は行わず、検証済みsessionを要求する接続Gatewayへ渡す。
export function getClaimTokenFromUrl(location?: Pick<Location, "search">): string | null {
  const search = location?.search ?? (typeof window === "undefined" ? null : window.location.search);
  if (search === null) return null;

  const params = new URLSearchParams(search);
  const direct = params.get("claim");
  if (direct !== null && direct.trim().length > 0) return direct.trim();

  const state = params.get("liff.state");
  if (state === null || state.trim().length === 0) return null;
  try {
    const decoded = decodeURIComponent(state);
    const stateQuery = decoded.includes("?") ? decoded.slice(decoded.indexOf("?") + 1) : decoded.replace(/^\?/, "");
    const claim = new URLSearchParams(stateQuery).get("claim");
    return claim !== null && claim.trim().length > 0 ? claim.trim() : null;
  } catch {
    return null;
  }
}
