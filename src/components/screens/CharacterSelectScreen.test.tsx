// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as analytics from "../../shared/analytics";
import { CharacterSelectScreen } from "./CharacterSelectScreen";

describe("CharacterSelectScreen pin & reroll", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(cleanup);

  it("starts with every slot unpinned", () => {
    render(<CharacterSelectScreen onSelect={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "📍 固定する" })).toHaveLength(4);
    expect(screen.queryAllByRole("button", { name: "📌 固定中" })).toHaveLength(0);
  });

  it("pins a slot on click and tracks the toggle", () => {
    const trackSpy = vi.spyOn(analytics, "track");
    render(<CharacterSelectScreen onSelect={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: "📍 固定する" })[0]!);

    expect(screen.getAllByRole("button", { name: "📌 固定中" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "📍 固定する" })).toHaveLength(3);
    expect(trackSpy).toHaveBeenCalledWith("tap", { surface: "character_select", id: "pin_toggle", kind: "pinned" });
  });

  it("unpins a slot when the pin toggle is clicked again", () => {
    render(<CharacterSelectScreen onSelect={vi.fn()} onCancel={vi.fn()} />);
    const toggle = screen.getAllByRole("button", { name: "📍 固定する" })[0]!;

    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "📌 固定中" }));

    expect(screen.getAllByRole("button", { name: "📍 固定する" })).toHaveLength(4);
  });

  it("clears every pin when おまかせで選ぶ runs a full reroll", () => {
    render(<CharacterSelectScreen onSelect={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "📍 固定する" })[0]!);
    expect(screen.getAllByRole("button", { name: "📌 固定中" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "おまかせで選ぶ" }));

    expect(screen.queryAllByRole("button", { name: "📌 固定中" })).toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "📍 固定する" })).toHaveLength(4);
  });

  it("keeps a slot pinned when switching the active slot", () => {
    render(<CharacterSelectScreen onSelect={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "📍 固定する" })[0]!);
    expect(screen.getAllByRole("button", { name: "📌 固定中" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /2枠目/ }));

    expect(screen.getAllByRole("button", { name: "📌 固定中" })).toHaveLength(1);
  });
});
