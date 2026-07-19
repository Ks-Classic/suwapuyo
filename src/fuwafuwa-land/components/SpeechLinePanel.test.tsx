// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FuwafuwaServices } from "../types";
import { SpeechLinePanel } from "./SpeechLinePanel";

function makeServices() {
  const updateSettings = vi.fn(() => Promise.resolve());
  const add = vi.fn(() => Promise.resolve({}));
  const services = {
    displayState: { updateSettings },
    speechLines: {
      list: vi.fn(() => Promise.resolve([])),
      add,
      remove: vi.fn(() => Promise.resolve()),
      setActive: vi.fn(() => Promise.resolve({})),
      subscribeChanges: vi.fn(() => ({ unsubscribe: () => Promise.resolve() })),
    },
    characterContent: {
      listCharacters: vi.fn(() => Promise.resolve([])),
      subscribeCharacterChanges: vi.fn(() => ({ unsubscribe: () => Promise.resolve() })),
    },
  } as unknown as FuwafuwaServices;
  return { services, updateSettings, add };
}

describe("SpeechLinePanel", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("debounces speechIntervalMs persistence and reflects the configured frequency", async () => {
    const { services, updateSettings } = makeServices();
    render(<SpeechLinePanel services={services} speechIntervalMs={30_000} />);
    await act(async () => vi.runOnlyPendingTimersAsync());
    const slider = screen.getByRole("slider", { name: /発話間隔 30秒/ });
    fireEvent.change(slider, { target: { value: "45" } });
    expect(screen.getByRole("slider", { name: /発話間隔 45秒/ })).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTimeAsync(599));
    expect(updateSettings).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(updateSettings).toHaveBeenCalledWith({ speechIntervalMs: 45_000 });
  });

  it("adds an idle speech line with anyone as the default target", async () => {
    const { services, add } = makeServices();
    render(<SpeechLinePanel services={services} />);
    await act(async () => vi.runOnlyPendingTimersAsync());
    fireEvent.change(screen.getByRole("textbox", { name: /テキスト/ }), { target: { value: "お腹すいたー" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    await act(async () => Promise.resolve());
    expect(add).toHaveBeenCalledWith({ text: "お腹すいたー", characterId: null, weight: 1 });
  });
});
