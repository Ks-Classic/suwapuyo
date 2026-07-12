export type BoothEngagementAction = "heard_explanation" | "participated" | "purchased" | "browsing";
export type FeedbackRating = "great" | "good" | "neutral" | "not_sure";
export type RewardReason = "event_checkin" | "booth_visit_milestone";

export interface DemoCampaign {
  id: string;
  title: string;
  dateLabel: string;
  limitedCharacterId: string;
  limitedCharacterName: string;
  limitedCharacterImage: string;
}

interface CheckinEventBase {
  id: string;
  campaignId: string;
  occurredAt: string;
}

export interface EventCheckinEvent extends CheckinEventBase {
  kind: "event_checkin";
  source: "entrance_qr";
}

export interface BoothVisitEvent extends CheckinEventBase {
  kind: "booth_visit";
  boothId: string;
  source: "booth_qr";
}

export interface BoothEngagementEvent extends CheckinEventBase {
  kind: "booth_engagement";
  boothId: string;
  boothVisitId: string;
  actions: BoothEngagementAction[];
  evidence: "self_report";
}

export interface BoothFeedbackEvent extends CheckinEventBase {
  kind: "booth_feedback";
  boothId: string;
  boothVisitId: string;
  rating: FeedbackRating | null;
  comment: string | null;
}

export interface RewardGrantEvent extends CheckinEventBase {
  kind: "reward_grant";
  rewardId: string;
  reason: RewardReason;
}

export type CheckinEvent = EventCheckinEvent | BoothVisitEvent | BoothEngagementEvent | BoothFeedbackEvent | RewardGrantEvent;
