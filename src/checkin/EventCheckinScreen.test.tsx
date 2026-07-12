// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventCheckinScreen } from "./EventCheckinScreen";
import { DEMO_CAMPAIGNS, listRewardGrants } from "./checkinRepository";

const CAMPAIGN_ID = Object.keys(DEMO_CAMPAIGNS)[0]!;
const CAMPAIGN = DEMO_CAMPAIGNS[CAMPAIGN_ID]!;

describe("EventCheckinScreen", () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(cleanup);

  it("shows the campaign name and date before checking in", () => {
    render(<EventCheckinScreen campaignId={CAMPAIGN_ID} onPlay={vi.fn()} onBooths={vi.fn()}/>);
    expect(screen.getByRole("heading", { name: CAMPAIGN.title })).toBeInTheDocument();
    expect(screen.getByText(CAMPAIGN.dateLabel)).toBeInTheDocument();
    expect(screen.queryByText(CAMPAIGN.limitedCharacterName)).not.toBeInTheDocument();
  });

  it("shows an unknown-event screen for a campaign id that has no fixture", () => {
    render(<EventCheckinScreen campaignId="not-a-real-campaign" onPlay={vi.fn()} onBooths={vi.fn()}/>);
    expect(screen.getByRole("heading", { name: "イベントを確認できません" })).toBeInTheDocument();
  });

  it("checks in once, reveals the limited character, and grants the reward only once", () => {
    render(<EventCheckinScreen campaignId={CAMPAIGN_ID} onPlay={vi.fn()} onBooths={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "会場にチェックイン" }));
    expect(screen.getByRole("heading", { name: `${CAMPAIGN.title}へようこそ！` })).toBeInTheDocument();
    expect(screen.getByText(CAMPAIGN.limitedCharacterName)).toBeInTheDocument();
    expect(listRewardGrants(CAMPAIGN_ID)).toHaveLength(1);
  });

  it("shows an already-checked-in state without re-granting on a later visit", () => {
    render(<EventCheckinScreen campaignId={CAMPAIGN_ID} onPlay={vi.fn()} onBooths={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "会場にチェックイン" }));
    cleanup();
    render(<EventCheckinScreen campaignId={CAMPAIGN_ID} onPlay={vi.fn()} onBooths={vi.fn()}/>);
    expect(screen.getByRole("heading", { name: "チェックイン済みだよ" })).toBeInTheDocument();
    expect(listRewardGrants(CAMPAIGN_ID)).toHaveLength(1);
  });

  it("navigates onward from the success screen", () => {
    const onPlay = vi.fn();
    const onBooths = vi.fn();
    render(<EventCheckinScreen campaignId={CAMPAIGN_ID} onPlay={onPlay} onBooths={onBooths}/>);
    fireEvent.click(screen.getByRole("button", { name: "会場にチェックイン" }));
    fireEvent.click(screen.getByRole("button", { name: "ブースを見つける" }));
    expect(onBooths).toHaveBeenCalledTimes(1);
    expect(onPlay).not.toHaveBeenCalled();
  });
});
