// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CharacterQrModal, buildClaimUrl, claimTokenStatusLabel } from "./CharacterQrModal";
import { createClaimToken, listClaimTokens, revokeClaimToken } from "../store/claimStore";
import type { ClaimToken, DisplayCharacter } from "../types";

vi.mock("qrcode", () => ({
  default: { toCanvas: vi.fn(() => Promise.resolve()) },
}));

vi.mock("../store/claimStore", () => ({
  createClaimToken: vi.fn(),
  listClaimTokens: vi.fn(),
  revokeClaimToken: vi.fn(),
}));

const createClaimTokenMock = vi.mocked(createClaimToken);
const listClaimTokensMock = vi.mocked(listClaimTokens);
const revokeClaimTokenMock = vi.mocked(revokeClaimToken);

const CHARACTER: DisplayCharacter = {
  id: "chr-1",
  sourceType: "artwork",
  sourceId: "art-1",
  label: "ふわこ",
  imagePath: "characters/chr-1.png",
  status: "visible",
  displayScale: 0.6,
  tapEnabled: false,
  sortOrder: 0,
  createdAt: "2026-07-19T00:00:00.000Z",
  updatedAt: "2026-07-19T00:00:00.000Z",
};

function makeToken(overrides: Partial<ClaimToken> = {}): ClaimToken {
  return {
    token: "11111111-2222-3333-4444-555555555555",
    displayCharacterId: CHARACTER.id,
    status: "active",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: "2026-07-19T10:00:00.000Z",
    claimedAt: null,
    ...overrides,
  };
}

describe("buildClaimUrl", () => {
  it("uses the LIFF deep link when a LIFF id is configured", () => {
    expect(buildClaimUrl("tok-1", "1234-abcd", "https://example.com")).toBe("https://liff.line.me/1234-abcd?claim=tok-1");
  });

  it("falls back to the app origin /claim route without a LIFF id", () => {
    expect(buildClaimUrl("tok-1", undefined, "https://example.com")).toBe("https://example.com/claim?token=tok-1");
  });

  it("treats a blank LIFF id as missing", () => {
    expect(buildClaimUrl("tok-1", "   ", "https://example.com")).toBe("https://example.com/claim?token=tok-1");
  });

  it("URL-encodes the token", () => {
    expect(buildClaimUrl("a b", undefined, "https://example.com")).toBe("https://example.com/claim?token=a%20b");
  });
});

describe("claimTokenStatusLabel", () => {
  it("labels active/claimed/revoked/expired tokens", () => {
    const now = new Date("2026-07-19T12:00:00.000Z");
    expect(claimTokenStatusLabel(makeToken(), now)).toBe("有効");
    expect(claimTokenStatusLabel(makeToken({ status: "claimed" }), now)).toBe("使用済み");
    expect(claimTokenStatusLabel(makeToken({ status: "revoked" }), now)).toBe("失効");
    expect(claimTokenStatusLabel(makeToken({ expiresAt: "2026-07-19T11:00:00.000Z" }), now)).toBe("期限切れ");
  });
});

describe("CharacterQrModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it("issues a new token when the character has no usable token", async () => {
    listClaimTokensMock.mockResolvedValue([]);
    createClaimTokenMock.mockResolvedValue(makeToken({ token: "fresh-token" }));
    render(<CharacterQrModal character={CHARACTER} liffId="9999-liff" onClose={() => undefined} />);
    await waitFor(() => expect(createClaimTokenMock).toHaveBeenCalledWith(CHARACTER.id));
    expect(await screen.findByText("https://liff.line.me/9999-liff?claim=fresh-token")).toBeInTheDocument();
  });

  it("reuses an existing active token instead of creating another", async () => {
    const existing = makeToken({ token: "existing-token" });
    listClaimTokensMock.mockResolvedValue([existing]);
    render(<CharacterQrModal character={CHARACTER} liffId="" onClose={() => undefined} />);
    expect(await screen.findByText(`${window.location.origin}/claim?token=existing-token`)).toBeInTheDocument();
    expect(createClaimTokenMock).not.toHaveBeenCalled();
  });

  it("revokes a token from the issued list", async () => {
    const existing = makeToken({ token: "existing-token" });
    listClaimTokensMock.mockResolvedValue([existing]);
    revokeClaimTokenMock.mockResolvedValue(undefined);
    render(<CharacterQrModal character={CHARACTER} liffId="" onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole("button", { name: "失効" }));
    await waitFor(() => expect(revokeClaimTokenMock).toHaveBeenCalledWith("existing-token"));
  });
});
