// @vitest-environment jsdom
// おえかき連続運用の遷移テスト(Codexレビュー P1):
// (a) スタッフ承認で visible になったら arrived 祝福→自動で新しいおえかきへ復帰
// (b) 非表示のままなら「またかいてね」で手動復帰
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FuwafuwaDrawScreen } from "./FuwafuwaDrawScreen";
import type { Artwork, ConnectionStatus, FuwafuwaServices } from "../types";

vi.mock("../digital/DigitalCanvas", () => ({
  DigitalCanvas: ({ onComplete }: { onComplete: (blob: Blob, width: number, height: number) => void }) => (
    <button type="button" onClick={() => onComplete(new Blob(["ink"], { type: "image/png" }), 900, 1200)}>
      mock-できた
    </button>
  ),
}));

vi.mock("../../shared/buddyStore", () => ({
  setBuddy: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../shared/analytics", () => ({
  track: vi.fn(),
}));

function makeArtwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: "art-1",
    displayLabel: "No.001",
    source: "digital",
    imageBlobKey: "artworks/art-1.png",
    width: 900,
    height: 1200,
    displayScale: 0.6,
    status: "queued",
    consentScope: "event_only",
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:00.000Z",
    showCount: 0,
    ...overrides,
  };
}

interface ServicesHarness {
  services: FuwafuwaServices;
  registerMock: ReturnType<typeof vi.fn>;
  emitArtworkChange: (artwork: Artwork) => void;
}

function makeServices(): ServicesHarness {
  let onChangeRef: ((artwork: Artwork) => void) | null = null;
  const registerMock = vi.fn(() => Promise.resolve(makeArtwork()));
  const repository = {
    register: registerMock,
    subscribeArtworkChanges: vi.fn((onChange: (artwork: Artwork) => void, _onStatus: (status: ConnectionStatus) => void) => {
      onChangeRef = onChange;
      return { unsubscribe: () => Promise.resolve() };
    }),
  };
  return {
    services: { repository } as unknown as FuwafuwaServices,
    registerMock,
    emitArtworkChange: (artwork) => {
      onChangeRef?.(artwork);
    },
  };
}

describe("FuwafuwaDrawScreen 遷移", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:mock-preview");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(cleanup);

  it("承認待ちとして characterStatus hidden で登録し waiting 画面になる", async () => {
    const harness = makeServices();
    render(<FuwafuwaDrawScreen services={harness.services} />);

    fireEvent.click(screen.getByRole("button", { name: "mock-できた" }));

    await waitFor(() => expect(harness.registerMock).toHaveBeenCalledTimes(1));
    expect(harness.registerMock).toHaveBeenCalledWith(expect.objectContaining({ characterStatus: "hidden", source: "digital" }));
    expect(await screen.findByText("もうすぐランドに とうちゃく！")).toBeInTheDocument();
  });

  it("スタッフ承認で visible になると arrived 祝福→自動で新しいおえかきへ戻る", async () => {
    const harness = makeServices();
    render(<FuwafuwaDrawScreen services={harness.services} arrivedResetMs={40} />);

    fireEvent.click(screen.getByRole("button", { name: "mock-できた" }));
    await screen.findByText("もうすぐランドに とうちゃく！");

    // スタッフが「ランドへ！」→ artworks.status visible の realtime 通知が届く
    act(() => {
      harness.emitArtworkChange(makeArtwork({ status: "visible" }));
    });

    expect(await screen.findByText("とうちゃく！大きな画面を見てね！")).toBeInTheDocument();
    expect(screen.getByText("まもなく つぎのおえかきに もどるよ")).toBeInTheDocument();

    // arrivedResetMs 経過後、自動で drawing フェーズへ復帰し次の子がすぐ描ける
    expect(await screen.findByRole("button", { name: "mock-できた" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("とうちゃく！大きな画面を見てね！")).not.toBeInTheDocument());
  });

  it("非表示のままでも「またかいてね」で手動で新しいおえかきへ戻れる", async () => {
    const harness = makeServices();
    render(<FuwafuwaDrawScreen services={harness.services} />);

    fireEvent.click(screen.getByRole("button", { name: "mock-できた" }));
    await screen.findByText("もうすぐランドに とうちゃく！");
    expect(screen.queryByRole("button", { name: "mock-できた" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "またかいてね" }));

    expect(await screen.findByRole("button", { name: "mock-できた" })).toBeInTheDocument();
    expect(screen.queryByText("もうすぐランドに とうちゃく！")).not.toBeInTheDocument();
  });

  it("visible 以外の変更(hidden など)では arrived にならない", async () => {
    const harness = makeServices();
    render(<FuwafuwaDrawScreen services={harness.services} />);

    fireEvent.click(screen.getByRole("button", { name: "mock-できた" }));
    await screen.findByText("もうすぐランドに とうちゃく！");

    act(() => {
      harness.emitArtworkChange(makeArtwork({ status: "hidden" }));
    });

    expect(screen.queryByText("とうちゃく！大きな画面を見てね！")).not.toBeInTheDocument();
    expect(screen.getByText("もうすぐランドに とうちゃく！")).toBeInTheDocument();
  });
});
