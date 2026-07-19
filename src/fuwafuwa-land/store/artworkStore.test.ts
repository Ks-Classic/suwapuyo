import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FuwafuwaSupabaseClient } from "../lib/supabase";
import { SupabaseArtworkRepository } from "./artworkStore";

vi.mock("./db", () => ({
  cacheArtwork: vi.fn(() => Promise.resolve()),
  cacheArtworks: vi.fn(() => Promise.resolve()),
  cacheImage: vi.fn(() => Promise.resolve()),
  getCachedArtwork: vi.fn(() => Promise.resolve(null)),
  getCachedArtworks: vi.fn(() => Promise.resolve([])),
  getCachedImage: vi.fn(() => Promise.resolve(undefined)),
}));
vi.mock("./operationLog", () => ({ appendOperationLog: vi.fn(() => Promise.resolve()) }));

const artworkRow = {
  id: "ART-0001",
  display_label: "ART-0001",
  given_name: null,
  source: "digital" as const,
  image_path: "event/art.png",
  width: 900,
  height: 1200,
  status: "visible" as const,
  consent_scope: "event_only" as const,
  created_at: "2026-07-19T00:00:00.000Z",
  updated_at: "2026-07-19T00:00:00.000Z",
  last_shown_at: null,
  show_count: 0,
  notes: null,
};

function makeClient(characterReady: boolean): { client: FuwafuwaSupabaseClient; tables: string[] } {
  const tables: string[] = [];
  const characterQuery = {
    update: vi.fn(() => characterQuery),
    eq: vi.fn(() => characterQuery),
    select: vi.fn(() => characterQuery),
    maybeSingle: vi.fn(() => Promise.resolve({ data: characterReady ? { id: "ART-0001" } : null, error: null })),
  };
  const artworkQuery = {
    update: vi.fn(() => artworkQuery),
    eq: vi.fn(() => artworkQuery),
    select: vi.fn(() => artworkQuery),
    single: vi.fn(() => Promise.resolve({ data: artworkRow, error: null })),
  };
  const client = {
    from: vi.fn((table: string) => {
      tables.push(table);
      return table === "display_characters" ? characterQuery : artworkQuery;
    }),
  } as unknown as FuwafuwaSupabaseClient;
  return { client, tables };
}

describe("SupabaseArtworkRepository.setStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("表示キャラを先に更新してから作品statusを進める", async () => {
    const harness = makeClient(true);
    const repository = new SupabaseArtworkRepository(Promise.resolve(harness.client));

    await expect(repository.setStatus("ART-0001", "visible")).resolves.toMatchObject({ id: "ART-0001", status: "visible" });
    expect(harness.tables).toEqual(["display_characters", "artworks"]);
  });

  it("登録直後で表示キャラが未作成なら作品statusを変更しない", async () => {
    const harness = makeClient(false);
    const repository = new SupabaseArtworkRepository(Promise.resolve(harness.client));

    await expect(repository.setStatus("ART-0001", "visible")).rejects.toThrow("display_character_not_ready");
    expect(harness.tables).toEqual(["display_characters"]);
  });
});
