// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StampBook } from "./StampBook";
import { DEMO_BOOTH_IDS, DEMO_CAMPAIGNS, findDemoBooth, recordBoothVisit } from "./checkinRepository";

const CAMPAIGN_ID = Object.keys(DEMO_CAMPAIGNS)[0]!;
const BOOTH_ID = DEMO_BOOTH_IDS[0]!;
const BOOTH = findDemoBooth(BOOTH_ID)!;

describe("StampBook", () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(cleanup);

  it("shows zero stamps before any booth visit", () => {
    render(<StampBook campaignId={CAMPAIGN_ID}/>);
    expect(screen.getByRole("heading", { name: `0/${DEMO_BOOTH_IDS.length}こ あつめたよ` })).toBeInTheDocument();
    expect(screen.getAllByText("まだ訪れていないよ")).toHaveLength(DEMO_BOOTH_IDS.length);
  });

  it("reflects a stamped booth after a visit is recorded", () => {
    recordBoothVisit(CAMPAIGN_ID, BOOTH_ID);
    render(<StampBook campaignId={CAMPAIGN_ID}/>);
    expect(screen.getByRole("heading", { name: `1/${DEMO_BOOTH_IDS.length}こ あつめたよ` })).toBeInTheDocument();
    expect(screen.getByText("スタンプゲット済み")).toBeInTheDocument();
  });

  it("invokes onBooth for the selected row", () => {
    const onBooth = vi.fn();
    render(<StampBook campaignId={CAMPAIGN_ID} onBooth={onBooth}/>);
    fireEvent.click(screen.getAllByRole("button", { name: "見る" }).find((button) => button.closest("li")?.textContent?.includes(BOOTH.name)) ?? screen.getAllByRole("button", { name: "見る" })[0]!);
    expect(onBooth).toHaveBeenCalledTimes(1);
  });
});
