// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProfileAfterConsent, getSnapshot, grantConsent, hasConsent, PRODUCT_CONSENT_VERSION, saveSurvey, SURVEY_CONSENT_VERSION } from "../shared/localMvpRepository";
import { FamilySettings } from "./MvpApp";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function seedTwoChildren(): void {
  grantConsent("product", PRODUCT_CONSENT_VERSION);
  createProfileAfterConsent();
  grantConsent("survey", SURVEY_CONSENT_VERSION);
  saveSurvey({
    schemaVersion: 3,
    primaryPlayer: "child_and_adult",
    preferredActivity: "unanswered",
    children: [
      { id: "child-1", birthYear: 2021, birthMonth: 5, gender: "female", ageBand: "3_6", ageAsOf: "2026-07-01" },
      { id: "child-2", birthYear: 2018, birthMonth: 9, gender: "male", ageBand: "7_9", ageAsOf: "2026-07-01" },
    ],
    completedAt: "2026-07-11T00:00:00.000Z",
  });
}

describe("FamilySettings", () => {
  afterEach(cleanup);
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("lists every registered child", () => {
    seedTwoChildren();
    render(<FamilySettings navigate={vi.fn()} />);
    expect(screen.getByText("1人目・2021年5月・女の子")).toBeInTheDocument();
    expect(screen.getByText("2人目・2018年9月・男の子")).toBeInTheDocument();
  });

  it("edits a child's birth month and gender", () => {
    seedTwoChildren();
    render(<FamilySettings navigate={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "変更" })[0]!);
    fireEvent.change(screen.getByLabelText("1人目の生まれた年"), { target: { value: "2022" } });
    fireEvent.change(screen.getByLabelText("1人目の生まれた月"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    expect(screen.getByText("1人目・2022年3月・女の子")).toBeInTheDocument();
    expect(getSnapshot().survey?.children[0]).toMatchObject({ birthYear: 2022, birthMonth: 3, ageBand: "3_6" });
  });

  it("deletes a child only after confirmation", () => {
    seedTwoChildren();
    render(<FamilySettings navigate={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "削除" })[0]!);
    expect(screen.getByText("1人目・2021年5月・女の子")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    expect(screen.queryByText(/2021年5月/)).not.toBeInTheDocument();
    expect(getSnapshot().survey?.children).toHaveLength(1);
  });

  it("revokes survey consent and clears the family profile", () => {
    seedTwoChildren();
    render(<FamilySettings navigate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "遊びの記録の保存をやめる" }));
    fireEvent.click(screen.getByRole("button", { name: "同意を撤回する" }));
    expect(hasConsent("survey")).toBe(false);
    expect(getSnapshot().survey).toBeNull();
    expect(screen.getByText("まだ遊び方を設定していません。")).toBeInTheDocument();
  });

  it("deletes all local data and navigates home", () => {
    seedTwoChildren();
    const navigate = vi.fn();
    render(<FamilySettings navigate={navigate} />);
    fireEvent.click(screen.getByRole("button", { name: "すべてのデータを削除する" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    expect(navigate).toHaveBeenCalledWith("/");
    expect(hasConsent("product")).toBe(false);
    expect(localStorage.getItem("suwapuyo_mvp_state_v1")).toBeNull();
  });
});
