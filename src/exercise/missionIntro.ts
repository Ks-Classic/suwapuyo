import type { MouthMission, TaisouMissionHost } from "./mouthMissions";

export const RECENT_INTROS_KEY = "suwapuyo_taisou_recent_intros";
const RECENT_INTRO_LIMIT = 4;

type CheerStyle = "genki" | "ouen" | "nonbiri" | "challenge" | "playful";

interface IntroVariant {
  id: string;
  cheerLine: string;
  launchLine: string;
}

export interface MissionIntro {
  id: string;
  missionLine: string;
  cheerLine: string;
  launchLine: string;
}

const INTRO_VARIANTS: Record<CheerStyle, readonly IntroVariant[]> = {
  genki: [
    { id: "genki-1", cheerLine: "よーし！げんきに いくぞー！", launchLine: "いっくよー！" },
    { id: "genki-2", cheerLine: "おくちの じゅんびは いい？", launchLine: "スタートだー！" },
    { id: "genki-3", cheerLine: "いっしょに たのしもう！", launchLine: "せーのっ！" },
  ],
  ouen: [
    { id: "ouen-1", cheerLine: "だいじょうぶ！いっしょに やろう！", launchLine: "いくよー！" },
    { id: "ouen-2", cheerLine: "できるところまでで だいじょうぶ！", launchLine: "ゆっくり スタート！" },
    { id: "ouen-3", cheerLine: "きみなら きっと できるよ！", launchLine: "はじめよう！" },
  ],
  nonbiri: [
    { id: "nonbiri-1", cheerLine: "あせらなくて いいよ〜", launchLine: "いくよ〜！" },
    { id: "nonbiri-2", cheerLine: "ふーっと じゅんびしよう〜", launchLine: "せーの〜！" },
    { id: "nonbiri-3", cheerLine: "いっしょに のびのび やろう〜", launchLine: "ゆったり スタート！" },
  ],
  challenge: [
    { id: "challenge-1", cheerLine: "ぼくの まねっこ できるかな？", launchLine: "ちょうせん スタート！" },
    { id: "challenge-2", cheerLine: "きょうの チャレンジ、はじまるよ！", launchLine: "いっくよー！" },
    { id: "challenge-3", cheerLine: "どこまで できるか やってみよう！", launchLine: "レッツ チャレンジ！" },
  ],
  playful: [
    { id: "playful-1", cheerLine: "ぼくより じょうずに できるかな〜？", launchLine: "せーのっ！" },
    { id: "playful-2", cheerLine: "おもしろい おかおで やってみよう！", launchLine: "へんしん スタート！" },
    { id: "playful-3", cheerLine: "わくわくしてきたー！", launchLine: "いっくよー！" },
  ],
};

function styleForHost(hostId: string): CheerStyle {
  const styles: readonly CheerStyle[] = ["genki", "ouen", "nonbiri", "challenge", "playful"];
  const hash = [...hostId].reduce((total, character) => total + character.charCodeAt(0), 0);
  return styles[hash % styles.length];
}

function readRecentIntros(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_INTROS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function rememberIntro(id: string, recent: string[]): void {
  try {
    localStorage.setItem(RECENT_INTROS_KEY, JSON.stringify([id, ...recent.filter((item) => item !== id)].slice(0, RECENT_INTRO_LIMIT)));
  } catch {
    // localStorageを利用できなくても導入演出は継続する。
  }
}

export function pickMissionIntro(host: TaisouMissionHost, mission: MouthMission): MissionIntro {
  const variants = INTRO_VARIANTS[styleForHost(host.id)];
  const recent = readRecentIntros();
  const candidates = variants.filter((variant) => !recent.includes(variant.id));
  const pool = candidates.length > 0 ? candidates : variants;
  const selected = pool[Math.floor(Math.random() * pool.length)];
  rememberIntro(selected.id, recent);
  return {
    ...selected,
    missionLine: `きょうは「${mission.name}」！`,
  };
}
