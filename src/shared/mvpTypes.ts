export type DataMode = "demo" | "test";

export type DisplayState =
  | "initial"
  | "loading"
  | "empty"
  | "invalid"
  | "network-error"
  | "forbidden"
  | "offline-unsynced"
  | "demo"
  | "reduced-motion";

export type ConsentPurpose = "product" | "survey";

export interface ConsentRecord {
  purpose: ConsentPurpose;
  version: string;
  grantedAt: string;
}

export type ChildAgeBand = "0_2" | "3_6" | "7_9" | "10_12" | "13_plus" | "unanswered";
export type PrimaryPlayer = "child" | "child_and_adult" | "adult" | "unanswered";
export type PreferredActivity = "mouth" | "body" | "random" | "unanswered";
export type ChildGender = "female" | "male" | "other" | "prefer_not_to_say";

export interface SurveyChild {
  id: string;
  birthYear: number | null;
  birthMonth: number | null;
  gender: ChildGender;
  ageBand: ChildAgeBand;
  ageAsOf: string | null;
}

export interface FamilySurvey {
  schemaVersion: 3;
  primaryPlayer: PrimaryPlayer;
  preferredActivity: PreferredActivity;
  children: SurveyChild[];
  completedAt?: string;
  skippedAt?: string;
}

export type EventSurveyPhase = "before" | "during" | "after";
export interface EventSurveyResponse {
  phase: EventSurveyPhase;
  surveyVersion: "event-2026-01";
  answers: Readonly<Record<string, string>>;
  completedAt: string;
}

export type ExerciseType = "mouth" | "breath" | "neck";

export interface ProductEvent {
  id: string;
  name: "exercise_completed" | "booth_intro_viewed" | "booth_detail_opened" | "biz_contact_clicked";
  occurredAt: string;
  properties: Readonly<Record<string, string | number | boolean>>;
}

export interface ExerciseSummary {
  today: Record<ExerciseType, number>;
  total: Record<ExerciseType, number>;
  totalCount: number;
  streakDays: number;
  pendingCount: number;
}

export type MissionPeriod = "daily" | "weekly";

export interface MissionProgress {
  missionId: string;
  period: MissionPeriod;
  periodKey: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardLabel: string;
  completed: boolean;
  claimed: boolean;
}

export interface Booth {
  id: string;
  number: string;
  name: string;
  category: string;
  area: string;
  summary: string;
  theme: ExerciseType | "general";
  position: null;
  positionsStatus: "uncalibrated";
  dataMode: DataMode;
  pr: boolean;
}

export interface AppSnapshot {
  dataMode: DataMode;
  survey: FamilySurvey | null;
  arrived: boolean;
  selectedCharacterId: string;
  processedEventIds: string[];
  exerciseEvents: ProductEvent[];
  claimedMissionKeys: string[];
}
