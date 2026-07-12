// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { boothHasSnsLink, boothThumbnailSrc, FEATURED_BOOTHS, FeaturedBoothCatalog, matchesBoothSearch } from "./FeaturedBooths";
import type { FeaturedBooth } from "./FeaturedBooths";

function buildFeaturedBooth(overrides: Partial<FeaturedBooth> = {}): FeaturedBooth {
  return {
    id: "booth-x",
    name: "テストブース",
    organizer: "テスト運営",
    handle: "@test_booth",
    category: "テストカテゴリ",
    summary: "テスト用の要約です。",
    description: "テスト用の説明です。",
    highlights: ["ハイライト1"],
    images: [],
    confirmationNote: "テスト用の注記です。",
    ...overrides,
  };
}

describe("matchesBoothSearch", () => {
  it("matches an empty query against every booth", () => {
    expect(matchesBoothSearch(buildFeaturedBooth(), "")).toBe(true);
  });

  it("matches by name case-insensitively", () => {
    const booth = buildFeaturedBooth({ name: "PaTaKaRUSH" });
    expect(matchesBoothSearch(booth, "patakarush")).toBe(true);
  });

  it("matches by category", () => {
    const booth = buildFeaturedBooth({ category: "食・相談／販売" });
    expect(matchesBoothSearch(booth, "食")).toBe(true);
  });

  it("does not match an unrelated query", () => {
    const booth = buildFeaturedBooth({ name: "PaTaKaRUSH", category: "お口・体験" });
    expect(matchesBoothSearch(booth, "存在しないキーワード")).toBe(false);
  });
});

describe("boothThumbnailSrc", () => {
  it("returns the first image when present", () => {
    expect(boothThumbnailSrc(buildFeaturedBooth({ images: ["/a.jpg", "/b.jpg"] }))).toBe("/a.jpg");
  });

  it("returns null when no image is available", () => {
    expect(boothThumbnailSrc(buildFeaturedBooth({ images: [] }))).toBeNull();
  });
});

describe("boothHasSnsLink", () => {
  it("is true when sourceUrl is a non-empty string", () => {
    expect(boothHasSnsLink(buildFeaturedBooth({ sourceUrl: "https://example.com" }))).toBe(true);
  });

  it("is false when sourceUrl is missing", () => {
    expect(boothHasSnsLink(buildFeaturedBooth({ sourceUrl: undefined }))).toBe(false);
  });

  it("is false when sourceUrl is blank", () => {
    expect(boothHasSnsLink(buildFeaturedBooth({ sourceUrl: "   " }))).toBe(false);
  });
});

describe("FeaturedBoothCatalog", () => {
  afterEach(cleanup);

  it("shows every featured booth by default", () => {
    render(<FeaturedBoothCatalog onMap={vi.fn()}/>);
    for (const booth of FEATURED_BOOTHS) {
      expect(screen.getByRole("heading", { name: booth.name })).toBeInTheDocument();
    }
  });

  it("filters booths by search text", () => {
    render(<FeaturedBoothCatalog onMap={vi.fn()}/>);
    fireEvent.change(screen.getByPlaceholderText("名前やカテゴリで検索"), { target: { value: "まみ先生" } });
    expect(screen.getByRole("heading", { name: "キッズヨガ まみ先生" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "PaTaKaRUSH" })).not.toBeInTheDocument();
  });

  it("shows an empty state with a way back to the full list when nothing matches", () => {
    render(<FeaturedBoothCatalog onMap={vi.fn()}/>);
    fireEvent.change(screen.getByPlaceholderText("名前やカテゴリで検索"), { target: { value: "存在しないキーワード" } });
    expect(screen.getByText(/一致するブースが見つからなかったよ/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "検索をやめて全部見る" }));
    expect(screen.getByRole("heading", { name: "PaTaKaRUSH" })).toBeInTheDocument();
  });
});
