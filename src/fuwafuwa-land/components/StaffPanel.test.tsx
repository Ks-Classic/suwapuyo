// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectionStatus, DisplayState, FuwafuwaServices } from "../types";
import { StaffPanel } from "./StaffPanel";

vi.mock("./CharacterList", () => ({ CharacterList: () => <div>characters</div> }));
vi.mock("./ArtworkList", () => ({ ArtworkList: () => <div>artworks</div> }));

const baseState: DisplayState = {
  id: "current",
  visibleArtworkIds: [],
  mode: "idle",
  maxVisibleCount: 12,
  displayEvent: null,
  settings: { bgmTrackId: "fuwafuwa_march", bgmVolume: 0.5 },
  updatedAt: "2026-07-19T00:00:00.000Z",
};

function makeHarness() {
  let onDisplayChange: ((state: DisplayState) => void) | null = null;
  const updateSettings = vi.fn(() => Promise.resolve());
  const startDisplayEvent = vi.fn(() => Promise.resolve());
  const services = {
    repository: {
      list: vi.fn(() => Promise.resolve([])),
      subscribeArtworkChanges: vi.fn((_onChange: unknown, onStatus: (status: ConnectionStatus) => void) => {
        onStatus("online");
        return { unsubscribe: () => Promise.resolve() };
      }),
    },
    displayState: {
      getDisplayState: vi.fn(() => Promise.resolve(baseState)),
      subscribeDisplayState: vi.fn((onChange: (state: DisplayState) => void, onStatus: (status: ConnectionStatus) => void) => {
        onDisplayChange = onChange;
        onStatus("online");
        return { unsubscribe: () => Promise.resolve() };
      }),
      startDisplayEvent,
      clearDisplayEvent: vi.fn(() => Promise.resolve(baseState)),
      updateSettings,
      pauseToggle: vi.fn(() => Promise.resolve(baseState)),
    },
    characterContent: {},
  } as unknown as FuwafuwaServices;
  return { services, updateSettings, startDisplayEvent, emitDisplay: (state: DisplayState) => onDisplayChange?.(state) };
}

describe("StaffPanel v2", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("applies realtime BGM state and debounces volume persistence for 600ms", async () => {
    const harness = makeHarness();
    render(<StaffPanel services={harness.services} tab="land" />);
    await act(async () => vi.runOnlyPendingTimersAsync());

    act(() => harness.emitDisplay({ ...baseState, settings: { bgmTrackId: "omatsuri", bgmVolume: 0.7 } }));
    expect(screen.getByRole("button", { name: "おまつりばやし" })).toHaveClass("is-active");
    const slider = screen.getByRole("slider", { name: /音量 70%/ });
    fireEvent.change(slider, { target: { value: "0.8" } });
    await act(async () => vi.advanceTimersByTimeAsync(599));
    expect(harness.updateSettings).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(harness.updateSettings).toHaveBeenCalledWith({ bgmVolume: 0.8 });
  });

  it("prevents repeated event starts while the first request is pending", async () => {
    const harness = makeHarness();
    let resolveStart: (() => void) | undefined;
    harness.startDisplayEvent.mockImplementation(() => new Promise<void>((resolve) => { resolveStart = resolve; }));
    render(<StaffPanel services={harness.services} tab="land" />);
    await act(async () => vi.runOnlyPendingTimersAsync());

    const button = screen.getByRole("button", { name: /にじのアーチ/ });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(harness.startDisplayEvent).toHaveBeenCalledTimes(1);
    await act(async () => resolveStart?.());
  });
});
