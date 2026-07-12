import { CHARACTERS } from "../config/characters";
import { enqueueEvent, listQueuedEvents, queuedEventCount, removeQueuedEvent } from "./offlineQueue";
import type {
  AppSnapshot,
  Booth,
  ConsentPurpose,
  ConsentRecord,
  ExerciseSummary,
  ExerciseType,
  EventSurveyResponse,
  FamilySurvey,
  MissionProgress,
  ProductEvent,
  PreferredActivity,
} from "./mvpTypes";
import { normalizeStoredSurvey, preferredExerciseType } from "../onboarding/surveyDomain";

const CONSENT_KEY = "suwapuyo_mvp_consents_v1";
const APP_KEY = "suwapuyo_mvp_state_v1";
const EVENT_SURVEY_KEY = "suwapuyo_event_surveys_v1";
const DAILY_EXERCISE_KEY = "suwapuyo_daily_exercise_v1";
export const PRODUCT_CONSENT_VERSION = "2026-07-12.product.v2";
export const SURVEY_CONSENT_VERSION = "2026-07-12.family-purpose.v1";

const INITIAL_STATE: AppSnapshot = {
  dataMode: "demo",
  survey: null,
  arrived: false,
  selectedCharacterId: CHARACTERS[0]?.id ?? "sample-waawaa",
  processedEventIds: [],
  exerciseEvents: [],
  claimedMissionKeys: [],
};

export const DEMO_BOOTHS: Booth[] = [
  { id: "booth-demo-01", number: "01", name: "お口をたのしむブース", category: "お口（仮）", area: "お口エリア（仮）", summary: "親子で短い体験ができます。正式な出展者情報へ差し替え予定です。", theme: "mouth", position: null, positionsStatus: "uncalibrated", dataMode: "demo", pr: true },
  { id: "booth-demo-02", number: "02", name: "からだを動かすブース", category: "からだ（仮）", area: "からだエリア（仮）", summary: "家族で無理なく参加できる体験を紹介します。", theme: "neck", position: null, positionsStatus: "uncalibrated", dataMode: "demo", pr: false },
  { id: "booth-demo-03", number: "03", name: "親子でひと休みブース", category: "親子（仮）", area: "親子エリア（仮）", summary: "会場で親子が立ち寄れる場所のデモ情報です。", theme: "general", position: null, positionsStatus: "uncalibrated", dataMode: "demo", pr: true },
];

function parseJson<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readSnapshot(): AppSnapshot {
  const snapshot = parseJson<AppSnapshot>(APP_KEY, INITIAL_STATE);
  const normalizedSurvey = normalizeStoredSurvey(snapshot.survey);
  if (snapshot.survey !== null && normalizedSurvey !== snapshot.survey) {
    const migrated = { ...snapshot, survey: normalizedSurvey };
    writeSnapshot(migrated);
    return migrated;
  }
  return { ...snapshot, survey: normalizedSurvey };
}

function writeSnapshot(snapshot: AppSnapshot): void {
  window.localStorage.setItem(APP_KEY, JSON.stringify(snapshot));
}

export function listConsents(): ConsentRecord[] {
  return parseJson<ConsentRecord[]>(CONSENT_KEY, []);
}

export function hasConsent(purpose: ConsentPurpose): boolean {
  return listConsents().some((record) => record.purpose === purpose);
}

export function grantConsent(purpose: ConsentPurpose, version: string): ConsentRecord {
  const records = listConsents().filter((record) => record.purpose !== purpose);
  const record = { purpose, version, grantedAt: new Date().toISOString() } satisfies ConsentRecord;
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify([...records, record]));
  return record;
}

export function createProfileAfterConsent(): AppSnapshot {
  if (!hasConsent("product")) throw new Error("product_consent_required");
  const existing = window.localStorage.getItem(APP_KEY);
  if (existing === null) writeSnapshot(INITIAL_STATE);
  return readSnapshot();
}

export function getSnapshot(): AppSnapshot {
  if (!hasConsent("product")) return INITIAL_STATE;
  return readSnapshot();
}

export function saveSurvey(survey: FamilySurvey): AppSnapshot {
  if (!hasConsent("product") || !hasConsent("survey")) throw new Error("survey_consent_required");
  const current = readSnapshot();
  const next = { ...current, survey, arrived: survey.completedAt !== undefined ? true : current.arrived };
  writeSnapshot(next);
  return next;
}

export function listEventSurveys(): EventSurveyResponse[] {
  return parseJson<EventSurveyResponse[]>(EVENT_SURVEY_KEY, []);
}

export function saveEventSurvey(response: EventSurveyResponse): EventSurveyResponse[] {
  if (!hasConsent("product") || !hasConsent("survey")) throw new Error("survey_consent_required");
  const allowedKeys: Record<EventSurveyResponse["phase"], readonly string[]> = {
    before: ["attendance_plan"],
    during: ["adult_count", "child_count"],
    after: ["attended"],
  };
  if (Object.keys(response.answers).some((key) => !allowedKeys[response.phase].includes(key))) throw new Error("event_survey_unknown_answer");
  const next = [...listEventSurveys().filter((item) => item.phase !== response.phase), response];
  window.localStorage.setItem(EVENT_SURVEY_KEY, JSON.stringify(next));
  return next;
}

export function dailyPreferredExercise(preference: PreferredActivity, now = new Date(), randomValue = Math.random()): ExerciseType {
  if (preference === "mouth") return "mouth";
  const date = dailyPeriodKey(now);
  const stored = parseJson<{ date: string; preference: PreferredActivity; type: ExerciseType } | null>(DAILY_EXERCISE_KEY, null);
  if (stored !== null && stored.date === date && stored.preference === preference && ["mouth", "breath", "neck"].includes(stored.type)) return stored.type;
  const type = preferredExerciseType(preference, randomValue);
  window.localStorage.setItem(DAILY_EXERCISE_KEY, JSON.stringify({ date, preference, type }));
  return type;
}

export function selectCharacter(characterId: string): AppSnapshot {
  const current = readSnapshot();
  const next = { ...current, selectedCharacterId: characterId };
  writeSnapshot(next);
  return next;
}

export function markArrived(): AppSnapshot {
  const current = readSnapshot();
  const next = { ...current, arrived: true };
  writeSnapshot(next);
  return next;
}

async function acceptEvent(event: ProductEvent): Promise<boolean> {
  const current = readSnapshot();
  if (current.processedEventIds.includes(event.id)) return false;
  const next: AppSnapshot = {
    ...current,
    processedEventIds: [...current.processedEventIds, event.id],
    exerciseEvents: event.name === "exercise_completed" ? [...current.exerciseEvents, event] : current.exerciseEvents,
  };
  writeSnapshot(next);
  return true;
}

export async function recordEvent(event: ProductEvent, forceOffline = !navigator.onLine): Promise<"saved" | "queued"> {
  await enqueueEvent(event);
  if (forceOffline) return "queued";
  await acceptEvent(event);
  await removeQueuedEvent(event.id);
  return "saved";
}

export async function flushEventQueue(): Promise<number> {
  if (!navigator.onLine) return queuedEventCount();
  const queued = await listQueuedEvents();
  for (const event of queued.slice(0, 50)) {
    await acceptEvent(event);
    await removeQueuedEvent(event.id);
  }
  return queuedEventCount();
}

function jstDate(date: Date): Date {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

export function dailyPeriodKey(date = new Date()): string {
  return jstDate(date).toISOString().slice(0, 10);
}

export function weeklyPeriodKey(date = new Date()): string {
  const local = jstDate(date);
  const day = local.getUTCDay() || 7;
  local.setUTCDate(local.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(local.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((local.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${local.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function exerciseSummary(): Promise<ExerciseSummary> {
  const state = readSnapshot();
  const todayKey = dailyPeriodKey();
  const total = { mouth: 0, breath: 0, neck: 0 };
  const today = { mouth: 0, breath: 0, neck: 0 };
  const days = new Set<string>();
  for (const event of state.exerciseEvents) {
    const type = event.properties.exerciseType;
    if (type === "mouth" || type === "breath" || type === "neck") {
      total[type] += 1;
      const dayKey = dailyPeriodKey(new Date(event.occurredAt));
      days.add(dayKey);
      if (dayKey === todayKey) today[type] += 1;
    }
  }
  return {
    today,
    total,
    totalCount: total.mouth + total.breath + total.neck,
    streakDays: days.has(todayKey) ? 1 : 0,
    pendingCount: await queuedEventCount(),
  };
}

export async function missions(): Promise<MissionProgress[]> {
  const summary = await exerciseSummary();
  const state = readSnapshot();
  const dailyKey = dailyPeriodKey();
  const weeklyKey = weeklyPeriodKey();
  const rows: Array<Omit<MissionProgress, "completed" | "claimed">> = [
    { missionId: "exercise-once", period: "daily", periodKey: dailyKey, title: "たいそうを1かい", description: "きょう、好きな体操を1回やってみよう", progress: Object.values(summary.today).reduce((sum, value) => sum + value, 0), target: 1, rewardLabel: "ほし 1つ" },
    { missionId: "exercise-variety", period: "daily", periodKey: dailyKey, title: "ちがう体操にふれる", description: "2種類の体操をやってみよう", progress: Object.values(summary.today).filter((value) => value > 0).length, target: 2, rewardLabel: "バッジ 1つ" },
    { missionId: "play-three-days", period: "weekly", periodKey: weeklyKey, title: "こんしゅう3にち", description: "今週3日、体操かゲームを楽しもう", progress: summary.streakDays, target: 3, rewardLabel: "ほし 3つ" },
  ];
  return rows.map((row) => {
    const key = `${row.missionId}:${row.periodKey}`;
    return { ...row, completed: row.progress >= row.target, claimed: state.claimedMissionKeys.includes(key) };
  });
}

export async function claimMission(missionId: string, periodKey: string): Promise<boolean> {
  const rows = await missions();
  const mission = rows.find((row) => row.missionId === missionId && row.periodKey === periodKey);
  if (mission === undefined || !mission.completed || mission.claimed) return false;
  const current = readSnapshot();
  const key = `${missionId}:${periodKey}`;
  writeSnapshot({ ...current, claimedMissionKeys: [...current.claimedMissionKeys, key] });
  return true;
}

export function newEvent(name: ProductEvent["name"], properties: ProductEvent["properties"]): ProductEvent {
  return { id: crypto.randomUUID(), name, occurredAt: new Date().toISOString(), properties };
}
