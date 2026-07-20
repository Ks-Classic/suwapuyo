// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./fuwafuwa-land", () => ({ FuwafuwaApp: () => <div>fuwafuwa-app</div> }));
vi.mock("./app/MvpApp", () => ({ MvpApp: () => <div>mvp-app</div> }));

describe("App route boundary", () => {
  beforeEach(() => window.history.replaceState(null, "", "/"));
  afterEach(cleanup);

  it.each(["/staff/artworks", "/staff/land", "/staff/drawing", "/staff/devices"])(
    "routes the staff deep link %s to FuwafuwaApp",
    (path) => {
      window.history.replaceState(null, "", path);
      render(<App />);
      expect(screen.getByText("fuwafuwa-app")).toBeInTheDocument();
      expect(screen.queryByText("mvp-app")).not.toBeInTheDocument();
    },
  );

  it.each(["/line", "/concierge", "/report", "/legacy/game", "/shorts-studio", "/fuwafuwa/staff"])(
    "does not expose the retired demo route %s",
    (path) => {
      window.history.replaceState(null, "", path);
      render(<App />);
      expect(screen.getByText("mvp-app")).toBeInTheDocument();
      expect(screen.queryByText("fuwafuwa-app")).not.toBeInTheDocument();
    },
  );
});
