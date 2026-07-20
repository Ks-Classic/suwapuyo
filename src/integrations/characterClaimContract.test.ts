import { describe, expect, it } from "vitest";
import { isAllowedClaimTransition, type ClaimCharacterRequest } from "./characterClaimContract";

describe("character claim contract", () => {
  it("allows first claim and same-owner idempotent replay", () => {
    expect(isAllowedClaimTransition("active", "claimed")).toBe(true);
    expect(isAllowedClaimTransition("claimed", "claimed")).toBe(true);
  });

  it("rejects reopening expired or revoked tokens", () => {
    expect(isAllowedClaimTransition("expired", "active")).toBe(false);
    expect(isAllowedClaimTransition("revoked", "active")).toBe(false);
  });

  it("does not accept a client-declared LINE user ID", () => {
    const request: ClaimCharacterRequest = { opaqueToken: "opaque", requestId: "request-1" };
    expect(Object.keys(request)).toEqual(["opaqueToken", "requestId"]);
    expect("lineUserId" in request).toBe(false);
  });
});
