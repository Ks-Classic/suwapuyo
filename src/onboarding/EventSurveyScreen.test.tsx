// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProfileAfterConsent, grantConsent, listEventSurveys, PRODUCT_CONSENT_VERSION } from "../shared/localMvpRepository";
import { EventSurveyScreen } from "./EventSurveyScreen";

describe("EventSurveyScreen", () => {
  beforeEach(() => { localStorage.clear(); grantConsent("product", PRODUCT_CONSENT_VERSION); createProfileAfterConsent(); });
  afterEach(cleanup);

  it("shows only the question for the selected phase", () => {
    render(<EventSurveyScreen phase="before" onDone={vi.fn()} onSkip={vi.fn()}/>);
    expect(screen.getByRole("heading", { name: "YourTIMEに行く予定はある？" })).toBeInTheDocument();
    expect(screen.queryByText("今日は何人で来た？")).not.toBeInTheDocument();
    expect(screen.queryByText("YourTIMEには行った？")).not.toBeInTheDocument();
  });

  it("requires both adult and child counts and stores them outside the family profile", () => {
    render(<EventSurveyScreen phase="during" onDone={vi.fn()} onSkip={vi.fn()}/>);
    const submit = screen.getByRole("button", { name: "回答する" });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getAllByRole("button", { name: "1人" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "2人" })[1]!);
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(listEventSurveys()[0]?.answers).toEqual({ adult_count: "1", child_count: "2" });
    expect(localStorage.getItem("suwapuyo_mvp_state_v1")).not.toContain("adult_count");
  });
});
