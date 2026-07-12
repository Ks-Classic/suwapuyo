import type { ChildAgeBand, ExerciseType, FamilySurvey, PreferredActivity } from "../shared/mvpTypes";

export type EventPhase = "normal" | "before" | "during" | "after";

export interface BirthMonthInput {
  year: number;
  month: number;
}

export interface AgeBandResult {
  ageBand: ChildAgeBand;
  ageAsOf: string;
}

export function monthStart(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function birthMonthToAgeBand(input: BirthMonthInput, now = new Date()): AgeBandResult | null {
  if (!Number.isInteger(input.year) || !Number.isInteger(input.month) || input.month < 1 || input.month > 12) return null;
  const asOf = monthStart(now);
  const born = new Date(Date.UTC(input.year, input.month - 1, 1));
  if (born.getUTCFullYear() !== input.year || born.getUTCMonth() !== input.month - 1 || born > asOf) return null;
  const months = (asOf.getUTCFullYear() - input.year) * 12 + asOf.getUTCMonth() - (input.month - 1);
  // 子ども向け設定の入力境界。成人相当の年月は保存せず、未回答導線を案内する。
  if (months < 0 || months >= 19 * 12) return null;
  const years = Math.floor(months / 12);
  const ageBand: ChildAgeBand = years <= 2 ? "0_2" : years <= 6 ? "3_6" : years <= 9 ? "7_9" : years <= 12 ? "10_12" : "13_plus";
  return { ageBand, ageAsOf: asOf.toISOString().slice(0, 10) };
}

export function eventQuestionsFor(phase: EventPhase): readonly string[] {
  if (phase === "before") return ["イベントで楽しみにしていること"];
  if (phase === "during") return ["会場で一緒にいる大人と子どもの人数"];
  if (phase === "after") return ["楽しかった遊び"];
  return [];
}

export function preferredExerciseType(preference: PreferredActivity, randomValue = Math.random()): ExerciseType {
  if (preference === "mouth") return "mouth";
  if (preference === "body") return randomValue < 0.5 ? "neck" : "breath";
  const choices: ExerciseType[] = ["mouth", "breath", "neck"];
  return choices[Math.min(choices.length - 1, Math.floor(Math.max(0, randomValue) * choices.length))] ?? "mouth";
}

export function normalizeStoredSurvey(value: unknown): FamilySurvey | null {
  if (value === null || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (source.schemaVersion === 3) return value as FamilySurvey;

  const oldChildren = Array.isArray(source.children) ? source.children : [];
  const children = oldChildren.flatMap((item, index) => {
    if (item === null || typeof item !== "object") return [];
    const ageBand = (item as Record<string, unknown>).ageBand;
    const allowed: ChildAgeBand[] = ["0_2", "3_6", "7_9", "10_12", "13_plus", "unanswered"];
    if (!allowed.includes(ageBand as ChildAgeBand)) return [];
    const child = item as Record<string, unknown>;
    return [{ id: `child-${index + 1}`, birthYear: typeof child.birthYear === "number" ? child.birthYear : null, birthMonth: typeof child.birthMonth === "number" ? child.birthMonth : null, gender: "prefer_not_to_say" as const, ageBand: ageBand as ChildAgeBand, ageAsOf: typeof child.ageAsOf === "string" ? child.ageAsOf : null }];
  });
  const childCount = source.childCount;
  return {
    schemaVersion: 3,
    primaryPlayer: childCount === "0" ? "adult" : children.length > 0 ? "child_and_adult" : "unanswered",
    preferredActivity: "unanswered",
    children,
    ...(typeof source.completedAt === "string" ? { completedAt: source.completedAt } : {}),
    ...(typeof source.skippedAt === "string" ? { skippedAt: source.skippedAt } : {}),
  };
}
