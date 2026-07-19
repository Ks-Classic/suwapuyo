// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameRoute } from "./GameRoute";

const demoProps = vi.hoisted(() => vi.fn());
vi.mock("../components/screens/DemoScreen", () => ({ DemoScreen: (props: unknown) => { demoProps(props); return <div>game board</div>; } }));

describe("GameRoute", () => {
  afterEach(cleanup);

  it("uses an explicit new-game action", () => {
    const onNewGame = vi.fn();
    render(<GameRoute onHome={vi.fn()} onExercise={vi.fn()} onNewGame={onNewGame} />);

    fireEvent.click(screen.getByRole("button", { name: "新しいゲーム" }));

    expect(onNewGame).toHaveBeenCalledOnce();
  });

  it("opens the in-game mouth mission instead of leaving the game", () => {
    const onExercise = vi.fn();
    render(<GameRoute onHome={vi.fn()} onExercise={onExercise} onNewGame={vi.fn()} />);
    expect(demoProps).toHaveBeenLastCalledWith(expect.objectContaining({ taisouRequested: false }));
    fireEvent.click(screen.getByRole("button", { name: "お口ミッション" }));
    expect(demoProps).toHaveBeenLastCalledWith(expect.objectContaining({ taisouRequested: true }));
    expect(onExercise).not.toHaveBeenCalled();
  });
});
