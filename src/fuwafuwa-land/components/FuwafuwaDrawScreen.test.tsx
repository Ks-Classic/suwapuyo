// @vitest-environment jsdom
// おえかき連続運用の遷移テスト(Codexレビュー P1):
// (a) スタッフ承認で visible になったら arrived 祝福→自動で新しいおえかきへ復帰
// (b) 非表示のままなら「またかいてね」で手動復帰
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FuwafuwaDrawScreen } from "./FuwafuwaDrawScreen";
import type { Artwork, DisplayCharacter, FuwafuwaServices } from "../types";

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
  getCharacterContentMock: ReturnType<typeof vi.fn>;
  emitCharacterChange: (character: DisplayCharacter) => void;
}

function makeServices(): ServicesHarness {
  let onChangeRef: ((character: DisplayCharacter) => void) | null = null;
  const registerMock = vi.fn(() => Promise.resolve(makeArtwork()));
  const repository = {
    register: registerMock,
  };
  const characterContent = {
    getCharacterContent: vi.fn(() => Promise.resolve(null)),
    subscribeCharacterChanges: vi.fn((onChange: (character: DisplayCharacter) => void) => {
      onChangeRef = onChange;
      return { unsubscribe: () => Promise.resolve() };
    }),
  };
  return {
    services: { repository, characterContent } as unknown as FuwafuwaServices,
    registerMock,
    getCharacterContentMock: characterContent.getCharacterContent,
    emitCharacterChange: (character) => {
      onChangeRef?.(character);
    },
  };
}

function makeCharacter(status: DisplayCharacter["status"]): DisplayCharacter {
  return {
    id: "art-1",
    sourceType: "artwork",
    sourceId: "art-1",
    label: "No.001",
    imagePath: "artworks/art-1.png",
    status,
    displayScale: 0.6,
    tapEnabled: false,
    sortOrder: 1,
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:00.000Z",
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

  it("送信失敗を到着待ちと誤案内せず、次のおえかきへ戻れる", async () => {
    const harness = makeServices();
    harness.registerMock.mockRejectedValue(new Error("送信に失敗しました"));
    render(<FuwafuwaDrawScreen services={harness.services} />);

    fireEvent.click(screen.getByRole("button", { name: "mock-できた" }));

    expect(await screen.findByText("うまく送れなかったよ")).toBeInTheDocument();
    expect(screen.queryByText("もうすぐランドに とうちゃく！")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "もういちどかく" }));
    expect(await screen.findByRole("button", { name: "mock-できた" })).toBeInTheDocument();
  });

  it("スタッフ承認で visible になると arrived 祝福→自動で新しいおえかきへ戻る", async () => {
    const harness = makeServices();
    render(<FuwafuwaDrawScreen services={harness.services} arrivedResetMs={40} />);

    fireEvent.click(screen.getByRole("button", { name: "mock-できた" }));
    await screen.findByText("もうすぐランドに とうちゃく！");

    // スタッフが「ランドへ！」→ display_characters.status visible の realtime 通知が届く
    act(() => {
      harness.emitCharacterChange(makeCharacter("visible"));
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
      harness.emitCharacterChange(makeCharacter("hidden"));
    });

    expect(screen.queryByText("とうちゃく！大きな画面を見てね！")).not.toBeInTheDocument();
    expect(screen.getByText("もうすぐランドに とうちゃく！")).toBeInTheDocument();
  });

  it("作品だけvisibleでも表示キャラがhiddenなら到着扱いにしない", async () => {
    const harness = makeServices();
    render(<FuwafuwaDrawScreen services={harness.services} />);

    fireEvent.click(screen.getByRole("button", { name: "mock-できた" }));
    await screen.findByText("もうすぐランドに とうちゃく！");

    harness.emitCharacterChange(makeCharacter("hidden"));

    expect(screen.queryByText("とうちゃく！大きな画面を見てね！")).not.toBeInTheDocument();
  });

  it("購読開始前に承認済みでも表示キャラの現在値から到着を回収する", async () => {
    const harness = makeServices();
    harness.getCharacterContentMock.mockResolvedValue({ character: makeCharacter("visible"), content: null, items: [] });
    render(<FuwafuwaDrawScreen services={harness.services} />);

    fireEvent.click(screen.getByRole("button", { name: "mock-できた" }));

    expect(await screen.findByText("とうちゃく！大きな画面を見てね！")).toBeInTheDocument();
  });
});
