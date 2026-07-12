// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as repository from "../shared/localMvpRepository";
import { createProfileAfterConsent, grantConsent, PRODUCT_CONSENT_VERSION } from "../shared/localMvpRepository";
import { OnboardingFlow } from "./OnboardingFlow";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("OnboardingFlow", () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    grantConsent("product", PRODUCT_CONSENT_VERSION);
    createProfileAfterConsent();
  });

  it("shows the data purpose before child registration", () => {
    render(<OnboardingFlow onSkip={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "みんなで遊びやすくするために" })).toBeInTheDocument();
    expect(screen.getByText(/生まれた年月、性別、遊んだ記録を保存/)).toBeInTheDocument();
  });

  it("lets an adult start without child fields", () => {
    render(<OnboardingFlow onSkip={vi.fn()} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "内容を確認してはじめる" }));
    fireEvent.click(screen.getByRole("button", { name: "大人" }));
    expect(screen.getByRole("heading", { name: "遊ぶ準備を確認" })).toBeInTheDocument();
    expect(screen.queryByText("生まれた年")).not.toBeInTheDocument();
  });

  it("persists every child's birth month and gender after confirmation", () => {
    vi.setSystemTime(new Date("2026-07-11T00:00:00Z"));
    render(<OnboardingFlow onSkip={vi.fn()} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "内容を確認してはじめる" }));
    fireEvent.click(screen.getByRole("button", { name: "子ども" }));
    fireEvent.click(screen.getByRole("button", { name: "1人" }));
    fireEvent.change(screen.getByLabelText("1人目の生まれた年"), { target: { value: "2021" } });
    fireEvent.change(screen.getByLabelText("1人目の生まれた月"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "女の子" }));
    fireEvent.click(screen.getByRole("button", { name: "確認する" }));
    fireEvent.click(screen.getByRole("button", { name: "この内容ではじめる" }));
    const stored = localStorage.getItem("suwapuyo_mvp_state_v1") ?? "";
    expect(stored).toContain('"birthYear":2021');
    expect(stored).toContain('"birthMonth":5');
    expect(stored).toContain('"gender":"female"');
    expect(stored).toContain('"ageBand":"3_6"');
    expect(stored).not.toContain('"preferredActivity":"mouth"');
  });

  it("restores an interrupted registration after remounting", () => {
    render(<OnboardingFlow onSkip={vi.fn()} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "内容を確認してはじめる" }));
    fireEvent.click(screen.getByRole("button", { name: "子ども" }));
    fireEvent.click(screen.getByRole("button", { name: "2人" }));
    fireEvent.change(screen.getByLabelText("1人目の生まれた年"), { target: { value: "2021" } });
    fireEvent.change(screen.getByLabelText("1人目の生まれた月"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "女の子" }));
    fireEvent.click(screen.getByRole("button", { name: "次のお子さんへ" }));
    expect(screen.getByRole("heading", { name: "2人目のお子さん" })).toBeInTheDocument();

    cleanup();
    render(<OnboardingFlow onSkip={vi.fn()} onComplete={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "2人目のお子さん" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "前へ戻る" }));
    expect(screen.getByRole("heading", { name: "1人目のお子さん" })).toBeInTheDocument();
    expect(screen.getByLabelText("1人目の生まれた年")).toHaveValue("2021");
    expect(screen.getByLabelText("1人目の生まれた月")).toHaveValue("5");
    expect(screen.getByRole("button", { name: "女の子" })).toHaveAttribute("aria-pressed", "true");
  });

  it("does not persist a draft before survey consent is granted", () => {
    render(<OnboardingFlow onSkip={vi.fn()} onComplete={vi.fn()} />);
    expect(sessionStorage.getItem("suwapuyo_onboarding_draft_v1")).toBeNull();
  });

  it("keeps the input and lets the user retry after a save failure", () => {
    const saveSpy = vi.spyOn(repository, "saveSurvey").mockImplementationOnce(() => { throw new Error("boom"); });
    render(<OnboardingFlow onSkip={vi.fn()} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "内容を確認してはじめる" }));
    fireEvent.click(screen.getByRole("button", { name: "大人" }));
    fireEvent.click(screen.getByRole("button", { name: "この内容ではじめる" }));

    expect(screen.getByRole("alert")).toHaveTextContent("保存できませんでした");
    expect(screen.queryByRole("heading", { name: "遊ぶ準備ができたよ！" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "この内容ではじめる" }));
    expect(saveSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { name: "遊ぶ準備ができたよ！" })).toBeInTheDocument();
  });
});
