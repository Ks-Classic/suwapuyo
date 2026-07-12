import { describe, expect, it } from "vitest";
import { DEMO_BOOTHS } from "../shared/localMvpRepository";
import type { Booth } from "../shared/mvpTypes";
import { isBoothDisplayable, validateBoothCatalog } from "./boothValidator";

function buildBooth(overrides: Partial<Booth> = {}): Booth {
  return {
    id: "booth-01",
    number: "01",
    name: "テストブース",
    category: "お口（仮）",
    area: "お口エリア（仮）",
    summary: "テスト用の要約です。",
    theme: "mouth",
    position: null,
    positionsStatus: "uncalibrated",
    dataMode: "demo",
    pr: false,
    ...overrides,
  };
}

describe("validateBoothCatalog", () => {
  it("accepts every entry in DEMO_BOOTHS", () => {
    const result = validateBoothCatalog(DEMO_BOOTHS);
    expect(result.rejected).toEqual([]);
    expect(result.valid).toEqual(DEMO_BOOTHS);
  });

  it("rejects a booth with an empty name", () => {
    const booth = buildBooth({ name: "  " });
    expect(isBoothDisplayable(booth)).toBe(false);
    const result = validateBoothCatalog([booth]);
    expect(result.valid).toEqual([]);
    expect(result.rejected).toEqual([{ booth, reason: "name_missing" }]);
  });

  it("rejects a booth whose positionsStatus is not uncalibrated while position stays null", () => {
    const booth = buildBooth({ positionsStatus: "calibrated" as Booth["positionsStatus"] });
    const result = validateBoothCatalog([booth]);
    expect(result.rejected).toEqual([{ booth, reason: "positions_status_invalid" }]);
  });

  it("rejects a booth that has a non-null position while marked uncalibrated", () => {
    const booth = buildBooth({ position: { x: 0, y: 0 } as unknown as Booth["position"] });
    const result = validateBoothCatalog([booth]);
    expect(result.rejected).toEqual([{ booth, reason: "position_status_mismatch" }]);
  });

  it("rejects a booth with an unknown theme", () => {
    const booth = buildBooth({ theme: "unknown" as Booth["theme"] });
    const result = validateBoothCatalog([booth]);
    expect(result.rejected).toEqual([{ booth, reason: "theme_invalid" }]);
  });

  it("rejects a booth with an unknown dataMode", () => {
    const booth = buildBooth({ dataMode: "prod" as Booth["dataMode"] });
    const result = validateBoothCatalog([booth]);
    expect(result.rejected).toEqual([{ booth, reason: "data_mode_invalid" }]);
  });

  it("splits valid and rejected entries across a mixed catalog", () => {
    const okBooth = buildBooth({ id: "booth-ok" });
    const badBooth = buildBooth({ id: "booth-bad", category: "" });
    const result = validateBoothCatalog([okBooth, badBooth]);
    expect(result.valid).toEqual([okBooth]);
    expect(result.rejected).toEqual([{ booth: badBooth, reason: "category_missing" }]);
  });
});
