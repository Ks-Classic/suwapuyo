import { describe, expect, it } from "vitest";
import { MAX_NAPPERS, isBehaviorEligible, pickNextState, strollTargetY } from "./behaviors";

describe("fuwafuwa behaviors", () => {
  it("excludes featured characters and every character during display events", () => {
    expect(isBehaviorEligible(false, false)).toBe(true);
    expect(isBehaviorEligible(true, false)).toBe(false);
    expect(isBehaviorEligible(false, true)).toBe(false);
  });

  it("enforces nap capacity and partner-only pair actions", () => {
    expect(pickNextState("float", { napCount: MAX_NAPPERS, hasPartner: false }, () => 0.99)).toBe("stroll");
    expect(["stroll", "nap"]).toContain(pickNextState("float", { napCount: 0, hasPartner: false }, () => 0.99));
    expect(["play", "greet"]).toContain(pickNextState("float", { napCount: 0, hasPartner: true }, () => 0.99));
    expect(pickNextState("nap", { napCount: 1, hasPartner: true }, () => 0.5)).toBe("float");
  });

  it("keeps stroll targets in the bottom third", () => {
    expect(strollTargetY(900, () => 0)).toBe(648);
    expect(strollTargetY(900, () => 1)).toBeCloseTo(792);
  });
});
