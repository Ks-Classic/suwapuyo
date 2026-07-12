// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEMO_CAMPAIGNS,
  hasCheckedIn,
  hasVisitedBooth,
  latestEngagementActions,
  listRewardGrants,
  listStampedBoothIds,
  recordBoothEngagement,
  recordBoothFeedback,
  recordBoothVisit,
  recordEventCheckin,
} from "./checkinRepository";

const CAMPAIGN_ID = Object.keys(DEMO_CAMPAIGNS)[0]!;
const BOOTH_A = "booth-demo-01";
const BOOTH_B = "booth-demo-02";
const BOOTH_C = "booth-demo-03";

describe("checkin repository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("checks in only once and grants the entrance reward only once", () => {
    const first = recordEventCheckin(CAMPAIGN_ID);
    const second = recordEventCheckin(CAMPAIGN_ID);
    expect(first.granted).toBe(true);
    expect(first.alreadyCheckedIn).toBe(false);
    expect(second.granted).toBe(false);
    expect(second.alreadyCheckedIn).toBe(true);
    expect(hasCheckedIn(CAMPAIGN_ID)).toBe(true);
    expect(listRewardGrants(CAMPAIGN_ID).filter((event) => event.reason === "event_checkin")).toHaveLength(1);
  });

  it("does not check in an unknown campaign into a reward", () => {
    const outcome = recordEventCheckin("unknown-campaign");
    expect(outcome.granted).toBe(true);
    expect(listRewardGrants("unknown-campaign")).toHaveLength(0);
  });

  it("grants exactly one stamp per booth regardless of repeated visits", () => {
    const first = recordBoothVisit(CAMPAIGN_ID, BOOTH_A);
    const second = recordBoothVisit(CAMPAIGN_ID, BOOTH_A);
    expect(first.granted).toBe(true);
    expect(second.granted).toBe(false);
    expect(hasVisitedBooth(CAMPAIGN_ID, BOOTH_A)).toBe(true);
    expect(listStampedBoothIds(CAMPAIGN_ID)).toEqual([BOOTH_A]);
  });

  it("does not add extra stamps for multiple engagement selections on the same booth", () => {
    recordBoothVisit(CAMPAIGN_ID, BOOTH_A);
    recordBoothEngagement(CAMPAIGN_ID, BOOTH_A, ["heard_explanation"]);
    recordBoothEngagement(CAMPAIGN_ID, BOOTH_A, ["heard_explanation", "participated", "purchased"]);
    recordBoothFeedback(CAMPAIGN_ID, BOOTH_A, "great", "たのしかった");
    expect(listStampedBoothIds(CAMPAIGN_ID)).toEqual([BOOTH_A]);
    expect(latestEngagementActions(CAMPAIGN_ID, BOOTH_A)).toEqual(["heard_explanation", "participated", "purchased"]);
  });

  it("keeps a full history of engagement submissions for audit while the UI reads only the latest", () => {
    recordBoothVisit(CAMPAIGN_ID, BOOTH_A);
    recordBoothEngagement(CAMPAIGN_ID, BOOTH_A, ["browsing"]);
    recordBoothEngagement(CAMPAIGN_ID, BOOTH_A, ["participated"]);
    expect(latestEngagementActions(CAMPAIGN_ID, BOOTH_A)).toEqual(["participated"]);
  });

  it("grants a milestone reward once the third distinct booth is stamped", () => {
    recordBoothVisit(CAMPAIGN_ID, BOOTH_A);
    const secondVisit = recordBoothVisit(CAMPAIGN_ID, BOOTH_B);
    const thirdVisit = recordBoothVisit(CAMPAIGN_ID, BOOTH_C);
    expect(secondVisit.newMilestone).toBeNull();
    expect(thirdVisit.newMilestone).toBe(3);
    expect(listRewardGrants(CAMPAIGN_ID).filter((event) => event.reason === "booth_visit_milestone")).toHaveLength(1);
  });

  it("keeps checkin and stamps scoped to their own campaign", () => {
    recordEventCheckin(CAMPAIGN_ID);
    recordBoothVisit(CAMPAIGN_ID, BOOTH_A);
    expect(hasCheckedIn("another-campaign")).toBe(false);
    expect(listStampedBoothIds("another-campaign")).toEqual([]);
  });
});
