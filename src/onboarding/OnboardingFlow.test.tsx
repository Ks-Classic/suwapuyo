// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProfileAfterConsent, grantConsent, PRODUCT_CONSENT_VERSION } from "../shared/localMvpRepository";
import { OnboardingFlow } from "./OnboardingFlow";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("OnboardingFlow", () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  beforeEach(() => {
    localStorage.clear();
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
});
