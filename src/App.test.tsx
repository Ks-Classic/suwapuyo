// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./fuwafuwa-land", () => ({ FuwafuwaApp: () => <div>fuwafuwa-app</div> }));
vi.mock("./app/MvpApp", () => ({ MvpApp: () => <div>mvp-app</div> }));
vi.mock("./concierge/ConciergeApp", () => ({ ConciergeApp: () => <div>concierge-app</div> }));
vi.mock("./components/screens/DemoScreen", () => ({ DemoScreen: () => <div>demo-screen</div> }));
vi.mock("./components/screens/LineDemoMenu", () => ({ LineDemoMenu: () => <div>line-menu</div> }));
vi.mock("./report/ExhibitorReport", () => ({ ExhibitorReport: () => <div>report</div> }));
vi.mock("./shorts-studio/ShortsStudioMock", () => ({ ShortsStudioMock: () => <div>shorts</div> }));

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
});
