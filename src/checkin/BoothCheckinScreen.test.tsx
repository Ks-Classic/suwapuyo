// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoothCheckinScreen } from "./BoothCheckinScreen";
import { DEMO_BOOTH_IDS, DEMO_CAMPAIGNS, findDemoBooth, latestEngagementActions, listStampedBoothIds } from "./checkinRepository";

const CAMPAIGN_ID = Object.keys(DEMO_CAMPAIGNS)[0]!;
const BOOTH_ID = DEMO_BOOTH_IDS[0]!;
const BOOTH = findDemoBooth(BOOTH_ID)!;

describe("BoothCheckinScreen", () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(cleanup);

  it("grants a stamp on first visit and shows the get message", async () => {
    render(<BoothCheckinScreen campaignId={CAMPAIGN_ID} boothId={BOOTH_ID} onFindNext={vi.fn()}/>);
    expect(await screen.findByText("スタンプをゲットしました")).toBeInTheDocument();
    expect(listStampedBoothIds(CAMPAIGN_ID)).toEqual([BOOTH_ID]);
  });

  it("shows an unknown-booth screen for a booth id that has no fixture", () => {
    render(<BoothCheckinScreen campaignId={CAMPAIGN_ID} boothId="not-a-real-booth" onFindNext={vi.fn()}/>);
    expect(screen.getByRole("heading", { name: "ブースを確認できません" })).toBeInTheDocument();
  });

  it("records the multi-selected actions once and only stamps once on a repeat visit", async () => {
    render(<BoothCheckinScreen campaignId={CAMPAIGN_ID} boothId={BOOTH_ID} onFindNext={vi.fn()}/>);
    await screen.findByText("スタンプをゲットしました");
    fireEvent.click(screen.getByRole("button", { name: "説明を聞いた" }));
    fireEvent.click(screen.getByRole("button", { name: "体験した" }));
    fireEvent.click(screen.getByRole("button", { name: "回答を送る" }));
    expect(screen.getByText("ありがとう！")).toBeInTheDocument();
    expect(latestEngagementActions(CAMPAIGN_ID, BOOTH_ID)).toEqual(["heard_explanation", "participated"]);

    cleanup();
    render(<BoothCheckinScreen campaignId={CAMPAIGN_ID} boothId={BOOTH_ID} onFindNext={vi.fn()}/>);
    expect(await screen.findByText(`${BOOTH.name}のスタンプはもう持ってるよ`)).toBeInTheDocument();
    expect(listStampedBoothIds(CAMPAIGN_ID)).toEqual([BOOTH_ID]);
  });

  it("lets the visitor skip the survey without losing the stamp", async () => {
    const onFindNext = vi.fn();
    render(<BoothCheckinScreen campaignId={CAMPAIGN_ID} boothId={BOOTH_ID} onFindNext={onFindNext}/>);
    await screen.findByText("スタンプをゲットしました");
    fireEvent.click(screen.getByRole("button", { name: "あとで" }));
    expect(screen.getByText("ありがとう！")).toBeInTheDocument();
    expect(latestEngagementActions(CAMPAIGN_ID, BOOTH_ID)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "次のブースを探す" }));
    expect(onFindNext).toHaveBeenCalledTimes(1);
  });
});
