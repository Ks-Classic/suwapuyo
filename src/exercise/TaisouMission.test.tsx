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

function advanceToCompletionWait(): void {
  act(() => vi.advanceTimersByTime(TAISOU_TIMING.YOKOKU_MS));
  act(() => vi.advanceTimersByTime(TAISOU_TIMING.TAME_MS));
  act(() => vi.advanceTimersByTime(TAISOU_TIMING.KAKEGOE_MS));
  MISSION.steps.forEach(() => act(() => vi.advanceTimersByTime(TAISOU_TIMING.BEAT_MS)));
}

describe("TaisouMission", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("runs the specified intro phases and mission-specific audio", () => {
    render(<TaisouMission onComplete={vi.fn()} />);
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

  it("has no close/skip/button until all exercise steps finish", () => {
    const onComplete = vi.fn();
    const { container } = render(<TaisouMission onComplete={onComplete} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(container.querySelector('[role="dialog"]') as HTMLElement);
    advanceToCompletionWait();
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "できた！" })).toBeInTheDocument();
    expect(screen.queryByText(/スキップ|閉じる/)).not.toBeInTheDocument();
  });

  it("completes exactly once only after できた and the stamp animation", () => {
    const onComplete = vi.fn();
    render(<TaisouMission onComplete={onComplete} />);
    advanceToCompletionWait();
    fireEvent.click(screen.getByRole("button", { name: "できた！" }));
    expect(mocks.increment).toHaveBeenCalledOnce();
    expect(mocks.increment).toHaveBeenCalledWith("mouth");
    expect(mocks.music.playFanfare).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(TAISOU_TIMING.STAMP_MS));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
