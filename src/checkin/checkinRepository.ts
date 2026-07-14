import { CHARACTERS } from "../config/characters";
import { DEMO_BOOTHS } from "../shared/localMvpRepository";
import type { Booth } from "../shared/mvpTypes";
import type {
  BoothEngagementAction,
  BoothEngagementEvent,
  CheckinEvent,
  DemoCampaign,
  FeedbackRating,
  RewardGrantEvent,
} from "./checkinTypes";

const CHECKIN_EVENTS_KEY = "suwapuyo_checkin_events_v1";
export const BOOTH_VISIT_MILESTONES: readonly number[] = [3, 5];

export const DEMO_BOOTH_IDS: readonly string[] = DEMO_BOOTHS.map((booth) => booth.id);

const LIMITED_CHARACTER = CHARACTERS.find((character) => character.tier === "hidden") ?? CHARACTERS[0];

export const DEMO_CAMPAIGNS: Record<string, DemoCampaign> = {
  "yourtime-2026-08": {
    id: "yourtime-2026-08",
    title: "YourTIME 2026",
    dateLabel: "2026.08.02（土）",
    limitedCharacterId: LIMITED_CHARACTER?.id ?? "sample-waawaa",
    limitedCharacterName: LIMITED_CHARACTER?.name ?? "わーわー",
    limitedCharacterImage: LIMITED_CHARACTER?.image ?? "/content/01_すわぷよ/01_キャラクター/02_表示用/02_わーわー.png",
  },
};

export function findCampaign(campaignId: string): DemoCampaign | null {
  return DEMO_CAMPAIGNS[campaignId] ?? null;
}

export function findDemoBooth(boothId: string): Booth | null {
  return DEMO_BOOTHS.find((booth) => booth.id === boothId) ?? null;
}

function parseJson<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readEvents(): CheckinEvent[] {
  return parseJson<CheckinEvent[]>(CHECKIN_EVENTS_KEY, []);
}

function writeEvents(events: readonly CheckinEvent[]): void {
  window.localStorage.setItem(CHECKIN_EVENTS_KEY, JSON.stringify(events));
}

function hasEventId(events: readonly CheckinEvent[], id: string): boolean {
  return events.some((event) => event.id === id);
}

/** 冪等キー(id)がすでに記録済みなら何もせず false を返す。すべての書込はこの関数を通す。 */
function appendEvent(event: CheckinEvent): boolean {
  const events = readEvents();
  if (hasEventId(events, event.id)) return false;
  writeEvents([...events, event]);
  return true;
}

export function boothVisitId(campaignId: string, boothId: string): string {
  return `${campaignId}:${boothId}`;
}

export interface EventCheckinResult {
  granted: boolean;
  alreadyCheckedIn: boolean;
  campaign: DemoCampaign | null;
}

/** 同じ利用者・campaignの重複チェックインは冪等に成功扱い。報酬付与は一度だけ。 */
export function recordEventCheckin(campaignId: string, now = new Date()): EventCheckinResult {
  const campaign = findCampaign(campaignId);
  const occurredAt = now.toISOString();
  const granted = appendEvent({ id: `${campaignId}:checkin`, kind: "event_checkin", campaignId, occurredAt, source: "entrance_qr" });
  if (granted && campaign !== null) {
    appendEvent({ id: `${campaignId}:reward:event_checkin`, kind: "reward_grant", campaignId, occurredAt, rewardId: campaign.limitedCharacterId, reason: "event_checkin" });
  }
  return { granted, alreadyCheckedIn: !granted, campaign };
}

export function hasCheckedIn(campaignId: string): boolean {
  return readEvents().some((event) => event.kind === "event_checkin" && event.campaignId === campaignId);
}

export function listStampedBoothIds(campaignId: string): string[] {
  const seen = new Set<string>();
  for (const event of readEvents()) {
    if (event.kind === "booth_visit" && event.campaignId === campaignId) seen.add(event.boothId);
  }
  return [...seen];
}

export function hasVisitedBooth(campaignId: string, boothId: string): boolean {
  return listStampedBoothIds(campaignId).includes(boothId);
}

export interface BoothVisitResult {
  granted: boolean;
  stampCount: number;
  newMilestone: number | null;
}

/** スタンプは訪問確定時に1個のみ付与する。複数選択・評価・コメントでは追加しない。 */
export function recordBoothVisit(campaignId: string, boothId: string, now = new Date()): BoothVisitResult {
  const occurredAt = now.toISOString();
  const granted = appendEvent({ id: `${boothVisitId(campaignId, boothId)}:visit`, kind: "booth_visit", campaignId, boothId, occurredAt, source: "booth_qr" });
  const stampCount = listStampedBoothIds(campaignId).length;
  let newMilestone: number | null = null;
  if (granted && BOOTH_VISIT_MILESTONES.includes(stampCount)) {
    const grantedMilestone = appendEvent({ id: `${campaignId}:reward:milestone:${stampCount}`, kind: "reward_grant", campaignId, occurredAt, rewardId: `milestone-${stampCount}`, reason: "booth_visit_milestone" });
    if (grantedMilestone) newMilestone = stampCount;
  }
  return { granted, stampCount, newMilestone };
}

/** 複数選択・評価・コメントは何度でも追記でき、監査用にすべて履歴として残る(最新値のみUIに反映)。 */
export function recordBoothEngagement(campaignId: string, boothId: string, actions: readonly BoothEngagementAction[], now = new Date()): void {
  appendEvent({ id: crypto.randomUUID(), kind: "booth_engagement", campaignId, boothId, boothVisitId: boothVisitId(campaignId, boothId), actions: [...actions], occurredAt: now.toISOString(), evidence: "self_report" });
}

export function recordBoothFeedback(campaignId: string, boothId: string, rating: FeedbackRating | null, comment: string | null, now = new Date()): void {
  const trimmed = comment !== null && comment.trim() !== "" ? comment.trim() : null;
  appendEvent({ id: crypto.randomUUID(), kind: "booth_feedback", campaignId, boothId, boothVisitId: boothVisitId(campaignId, boothId), rating, comment: trimmed, occurredAt: now.toISOString() });
}

function isBoothEngagementEvent(event: CheckinEvent): event is BoothEngagementEvent {
  return event.kind === "booth_engagement";
}

export function latestEngagementActions(campaignId: string, boothId: string): BoothEngagementAction[] {
  const events = readEvents().filter((event): event is BoothEngagementEvent => isBoothEngagementEvent(event) && event.campaignId === campaignId && event.boothId === boothId);
  const last = events[events.length - 1];
  return last !== undefined ? last.actions : [];
}

function isRewardGrantEvent(event: CheckinEvent): event is RewardGrantEvent {
  return event.kind === "reward_grant";
}

export function listRewardGrants(campaignId: string): RewardGrantEvent[] {
  return readEvents().filter((event): event is RewardGrantEvent => isRewardGrantEvent(event) && event.campaignId === campaignId);
}
