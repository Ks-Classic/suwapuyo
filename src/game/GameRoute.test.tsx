// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameRoute } from "./GameRoute";

vi.mock("../components/screens/DemoScreen", () => ({
  DemoScreen: () => <div>game board</div>,
}));

describe("GameRoute", () => {
  afterEach(cleanup);

  it("uses an explicit new-game action", () => {
    const onNewGame = vi.fn();
    render(<GameRoute onHome={vi.fn()} onExercise={vi.fn()} onNewGame={onNewGame} />);

    fireEvent.click(screen.getByRole("button", { name: "新しいゲーム" }));

    expect(onNewGame).toHaveBeenCalledOnce();
  });
});
