import type { OperationsTab } from "./components/StaffPanel";

const STAFF_TAB_SEGMENTS: readonly OperationsTab[] = ["artworks", "land", "drawing", "devices"];

// /staff/<tab> ディープリンク(04_画面遷移 §4)。旧doc表記 drawing-settings も受理する。
export function readStaffTab(pathname: string): OperationsTab {
  const segment = pathname.replace(/\/$/, "").split("/staff/")[1]?.split("/")[0] ?? "";
  if (segment === "drawing-settings") {
    return "drawing";
  }
  return (STAFF_TAB_SEGMENTS as readonly string[]).includes(segment) ? (segment as OperationsTab) : "home";
}

// AccessはURL fragmentを認識できないため、旧staff path/hashを正規pathへ移してから描画する。
export function legacyStaffRedirect(pathname: string, hash: string): string | null {
  if (pathname === "/fuwafuwa/staff" || pathname.startsWith("/fuwafuwa/staff/")) {
    return pathname.replace(/^\/fuwafuwa\/staff/, "/staff");
  }
  const hashPath = hash.replace(/^#/, "");
  if (hashPath === "/fuwafuwa/staff" || hashPath.startsWith("/fuwafuwa/staff/")) {
    return hashPath.replace(/^\/fuwafuwa\/staff/, "/staff");
  }
  return null;
}
