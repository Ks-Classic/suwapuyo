import { describe, expect, it } from "vitest";
import { getClaimTokenFromUrl } from "./characterClaimUrl";

describe("claim URL boundary", () => {
  it("reads a direct opaque claim token", () => {
    expect(getClaimTokenFromUrl({ search: "?claim=opaque-token" })).toBe("opaque-token");
  });

  it("reads a claim token from LIFF state", () => {
    expect(getClaimTokenFromUrl({ search: `?liff.state=${encodeURIComponent("/?claim=opaque-token")}` })).toBe("opaque-token");
  });

  it("does not treat unrelated parameters as identity", () => {
    expect(getClaimTokenFromUrl({ search: "?lineUserId=spoofed&artworkId=1" })).toBeNull();
  });
});
