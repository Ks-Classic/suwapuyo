// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TAISOU_TIMING, type MouthMission, type TaisouMissionHost } from "./mouthMissions";

const mocks = vi.hoisted(() => ({
  music: { playDrumroll: vi.fn(), playIntro: vi.fn(), startLoop: vi.fn(), stopLoop: vi.fn(), playFanfare: vi.fn() },
  increment: vi.fn(),
  track: vi.fn(),
}));

vi.mock("../audio/TaisouMusic", () => ({ getTaisouMusic: () => mocks.music }));
vi.mock("../shared/progressStore", () => ({ incrementTaisouCount: mocks.increment }));
vi.mock("../shared/analytics", () => ({ track: mocks.track }));
vi.mock("../components/VillageNarrator", () => ({ VillageNarrator: ({ line }: { line: string }) => <div>{line}</div> }));

const HOST: TaisouMissionHost = { id: "host", name: "ホスト", image: "/host.png" };
const MISSION: MouthMission = {
  id: "aan", name: "おおきくあーん", aim: "開口", kakegoe: "いっくよ〜！", musicId: "aan", musicStyle: "march",
  suggestedDurationSec: 15,
  steps: [
    { kana: "あ", pict: "open", pictLabel: "ひらく" },
    { kana: "あーん", pict: "open-big", pictLabel: "おおきく" },
  ],
};

vi.mock("./mouthMissions", async () => {
  const actual = await vi.importActual<typeof import("./mouthMissions")>("./mouthMissions");
  return { ...actual, pickMissionHost: () => HOST, pickMouthMission: () => MISSION };
});

import { TaisouMission } from "./TaisouMission";

function advanceToExercise(): void {
  act(() => vi.advanceTimersByTime(TAISOU_TIMING.YOKOKU_MS));
  act(() => vi.advanceTimersByTime(TAISOU_TIMING.TAME_MS));
  act(() => vi.advanceTimersByTime(TAISOU_TIMING.KAKEGOE_MS));
}

function advanceToCompletionWait(): void {
  advanceToExercise();
  for (let second = 0; second < MISSION.suggestedDurationSec; second++) {
    act(() => vi.advanceTimersByTime(1000));
  }
}

describe("TaisouMission", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("runs the specified intro phases and mission-specific audio", () => {
    render(<TaisouMission onComplete={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText("♪")).toBeInTheDocument();
    expect(mocks.music.playDrumroll).toHaveBeenCalledWith(1200);
    act(() => vi.advanceTimersByTime(TAISOU_TIMING.YOKOKU_MS));
    expect(screen.getByText("すー…")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(TAISOU_TIMING.TAME_MS));
    expect(screen.getAllByText("いっくよ〜！").length).toBeGreaterThan(0);
    expect(mocks.music.playIntro).toHaveBeenCalledWith("aan");
    act(() => vi.advanceTimersByTime(TAISOU_TIMING.KAKEGOE_MS));
    expect(mocks.music.startLoop).toHaveBeenCalledWith("aan");
    expect(screen.getByText("ひらく")).toBeInTheDocument();
  });

  it("allows skipping from the start without recording completion", () => {
    const onSkip = vi.fn();
    render(<TaisouMission onComplete={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole("button", { name: "スキップ" }));
    expect(onSkip).toHaveBeenCalledOnce();
    expect(mocks.increment).not.toHaveBeenCalled();
    expect(mocks.track).toHaveBeenCalledWith("item_view", expect.objectContaining({ kind: "taisou_mouth_skip" }));
  });

  it("pauses and resumes the type-specific countdown", () => {
    render(<TaisouMission onComplete={vi.fn()} onSkip={vi.fn()} />);
    advanceToExercise();
    expect(screen.getByRole("button", { name: "できた！" })).toBeInTheDocument();
    expect(screen.getByLabelText("目安の残り時間 15秒")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "一時停止" }));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByLabelText("目安の残り時間 15秒")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "再開" }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByLabelText("目安の残り時間 14秒")).toBeInTheDocument();
  });

  it("completes exactly once only after できた and the stamp animation", () => {
    const onComplete = vi.fn();
    render(<TaisouMission onComplete={onComplete} onSkip={vi.fn()} />);
    advanceToExercise();
    fireEvent.click(screen.getByRole("button", { name: "できた！" }));
    expect(mocks.increment).toHaveBeenCalledOnce();
    expect(mocks.increment).toHaveBeenCalledWith("mouth");
    expect(mocks.music.playFanfare).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(TAISOU_TIMING.STAMP_MS));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("waits for explicit completion after the suggested duration", () => {
    const onComplete = vi.fn();
    render(<TaisouMission onComplete={onComplete} onSkip={vi.fn()} />);
    advanceToCompletionWait();
    expect(screen.getByLabelText("目安の残り時間 0秒")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "できた！" })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    expect(mocks.increment).not.toHaveBeenCalled();
  });
});
