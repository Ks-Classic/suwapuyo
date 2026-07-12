import type { Booth } from "../shared/mvpTypes";

const VALID_THEMES: ReadonlySet<string> = new Set(["mouth", "breath", "neck", "general"]);
const VALID_DATA_MODES: ReadonlySet<string> = new Set(["demo", "test"]);
const VALID_POSITIONS_STATUSES: ReadonlySet<string> = new Set(["uncalibrated"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function boothRejectionReason(booth: Booth): string | null {
  if (!isNonEmptyString(booth.id)) return "id_missing";
  if (!isNonEmptyString(booth.number)) return "number_missing";
  if (!isNonEmptyString(booth.name)) return "name_missing";
  if (!isNonEmptyString(booth.category)) return "category_missing";
  if (!isNonEmptyString(booth.area)) return "area_missing";
  if (!isNonEmptyString(booth.summary)) return "summary_missing";
  if (!VALID_THEMES.has(booth.theme)) return "theme_invalid";
  if (!VALID_DATA_MODES.has(booth.dataMode)) return "data_mode_invalid";
  if (typeof booth.pr !== "boolean") return "pr_invalid";
  const positionsStatus: string = booth.positionsStatus;
  if (!VALID_POSITIONS_STATUSES.has(positionsStatus)) return "positions_status_invalid";
  if (positionsStatus === "uncalibrated" && booth.position !== null) return "position_status_mismatch";
  if (positionsStatus !== "uncalibrated" && booth.position === null) return "position_status_mismatch";
  return null;
}

export function isBoothDisplayable(booth: Booth): boolean {
  return boothRejectionReason(booth) === null;
}

export function validateBoothCatalog(booths: Booth[]): { valid: Booth[]; rejected: Array<{ booth: Booth; reason: string }> } {
  const valid: Booth[] = [];
  const rejected: Array<{ booth: Booth; reason: string }> = [];
  for (const booth of booths) {
    const reason = boothRejectionReason(booth);
    if (reason === null) {
      valid.push(booth);
    } else {
      rejected.push({ booth, reason });
    }
  }
  return { valid, rejected };
}
