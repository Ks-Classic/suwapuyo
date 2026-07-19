// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CharacterContentRepository, DisplayCharacter } from "../types";
import { CharacterList } from "./CharacterList";

vi.mock("./CharacterQrModal", () => ({ CharacterQrModal: () => null }));

const CHARACTER: DisplayCharacter = {
  id: "sample-one", sourceType: "sample", sourceId: "sample-one", label: "ふわこ", imagePath: "/one.png",
  status: "visible", displayScale: 0.6, tapEnabled: false, sortOrder: 0,
  createdAt: "2026-07-19T00:00:00.000Z", updatedAt: "2026-07-19T00:00:00.000Z",
};

function makeRepository() {
  const setCharacterLabel = vi.fn(() => Promise.resolve());
  const setCharacterDisplayScale = vi.fn(() => Promise.resolve(CHARACTER));
  const repository = {
    listCharacters: vi.fn(() => Promise.resolve([CHARACTER])),
    subscribeCharacterChanges: vi.fn(() => ({ unsubscribe: () => Promise.resolve() })),
    subscribeContentChanges: vi.fn(() => ({ unsubscribe: () => Promise.resolve() })),
    setCharacterLabel,
    setCharacterDisplayScale,
    getMediaPublicUrl: vi.fn((path: string) => path),
  } as unknown as CharacterContentRepository;
  return { repository, setCharacterLabel, setCharacterDisplayScale };
}

describe("CharacterList debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("saves inline names only after 600ms", async () => {
    const harness = makeRepository();
    render(<CharacterList repository={harness.repository} />);
    await act(async () => Promise.resolve());
    fireEvent.click(screen.getByTitle("タップで名前を編集"));
    fireEvent.change(screen.getByRole("textbox", { name: "ふわこ の名前を編集" }), { target: { value: "ふわふわ" } });
    act(() => vi.advanceTimersByTime(599));
    expect(harness.setCharacterLabel).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(harness.setCharacterLabel).toHaveBeenCalledOnce();
    expect(harness.setCharacterLabel).toHaveBeenCalledWith("sample-one", "ふわふわ");
  });

  it("coalesces rapid per-character scale changes into one 600ms save", async () => {
    const harness = makeRepository();
    render(<CharacterList repository={harness.repository} />);
    await act(async () => Promise.resolve());
    const sliders = screen.getAllByRole("slider");
    const characterSlider = sliders[1];
    fireEvent.change(characterSlider, { target: { value: "0.8" } });
    fireEvent.change(characterSlider, { target: { value: "1.2" } });
    act(() => vi.advanceTimersByTime(600));
    expect(harness.setCharacterDisplayScale).toHaveBeenCalledOnce();
    expect(harness.setCharacterDisplayScale).toHaveBeenCalledWith("sample-one", 1.2);
  });
});
