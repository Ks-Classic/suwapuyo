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
