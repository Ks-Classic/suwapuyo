// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as analytics from "../shared/analytics";
import { MakerPage } from "./MakerPage";

describe("MakerPage", () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(cleanup);

  it("tracks maker_viewed on mount and shows the problem entries", () => {
    const trackSpy = vi.spyOn(analytics, "track");
    render(<MakerPage/>);
    expect(screen.getByRole("heading", { name: "いい活動が、ちゃんと届く仕組みをつくる" })).toBeInTheDocument();
    expect(trackSpy).toHaveBeenCalledWith("maker_viewed", { surface: "maker_page" });
    expect(screen.getByRole("button", { name: "もっと覚えてもらいたい" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "発信や仕事をラクにしたい" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新しい体験をつくりたい" })).toBeInTheDocument();
  });

  it("goes from problem selection through draft editing to a demo send, without ever auto-sending", () => {
    const trackSpy = vi.spyOn(analytics, "track");
    render(<MakerPage/>);

    fireEvent.click(screen.getByRole("button", { name: "発信や仕事をラクにしたい" }));
    expect(trackSpy).toHaveBeenCalledWith("problem_selected", { id: "efficiency" });
    expect(screen.getByRole("heading", { name: "どんなふうに話したい？" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "自分の活動でできることを聞く" }));
    const textarea = screen.getByLabelText("送る前に、自由に書きかえられます") as HTMLTextAreaElement;
    expect(textarea.value).toContain("発信や日々の業務にかかる時間や手間を");
    expect(trackSpy).not.toHaveBeenCalledWith("consultation_started", expect.anything());

    fireEvent.change(textarea, { target: { value: "こんにちは、地域でパン教室をしています。" } });
    fireEvent.click(screen.getByRole("button", { name: "内容を確認する" }));
    expect(screen.getByText("こんにちは、地域でパン教室をしています。")).toBeInTheDocument();
    expect(trackSpy).not.toHaveBeenCalledWith("consultation_started", expect.anything());

    fireEvent.click(screen.getByRole("button", { name: "この内容で送信する" }));
    expect(trackSpy).toHaveBeenCalledWith("consultation_started", { id: "efficiency", kind: "ask_general" });
    expect(screen.getByText(/実際には送信されていません/)).toBeInTheDocument();
  });

  it("lets the user go back from the draft to editing without losing the edited text", () => {
    render(<MakerPage/>);
    fireEvent.click(screen.getByRole("button", { name: "新しい体験をつくりたい" }));
    fireEvent.click(screen.getByRole("button", { name: "まず事例を見たい" }));
    const textarea = screen.getByLabelText("送る前に、自由に書きかえられます") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "書きかえたテキスト" } });
    fireEvent.click(screen.getByRole("button", { name: "内容を確認する" }));
    fireEvent.click(screen.getByRole("button", { name: "編集にもどる" }));
    expect((screen.getByLabelText("送る前に、自由に書きかえられます") as HTMLTextAreaElement).value).toBe("書きかえたテキスト");
  });
});
