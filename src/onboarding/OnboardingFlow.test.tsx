// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { grantConsent, PRODUCT_CONSENT_VERSION } from "../shared/localMvpRepository";
import { OnboardingFlow } from "./OnboardingFlow";

describe("OnboardingFlow", () => {
  afterEach(cleanup);
  beforeEach(() => {
    localStorage.clear();
    grantConsent("product", PRODUCT_CONSENT_VERSION);
  });

  it("lets a family skip without creating survey answers", () => {
    const onSkip = vi.fn();
    render(<OnboardingFlow onSkip={onSkip} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "あとで" }));
    expect(onSkip).toHaveBeenCalledOnce();
    expect(localStorage.getItem("suwapuyo_mvp_state_v1")).toBeNull();
  });

  it("records survey consent separately before asking questions", () => {
    render(<OnboardingFlow onSkip={vi.fn()} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "教えてあげる" }));
    expect(screen.getByRole("heading", { name: "きょうは だれといっしょ？" })).toBeInTheDocument();
    expect(localStorage.getItem("suwapuyo_mvp_consents_v1")).toContain('"purpose":"survey"');
  });
});
