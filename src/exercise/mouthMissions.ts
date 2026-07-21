// お口ミッション定義(お口体操v2)。
// 正本: docs/70_すわぷよ・ユアタイム統合仕様/02_体験設計/08_ふわふわランドLive・QR連動・お口体操ミッション設計.md §6.2
// 首(neck)系の体操は廃止 — お口と顔(まばたき・ウィンク含む)のみを収録する。
import { CHARACTERS } from "../config/characters";

export type MouthMissionId =
  | "aan"
  | "niko_ii"
  | "tako_uu"
  | "pukupuku"
  | "beee"
  | "pachipachi"
  | "wink"
  | "aiube"
  | "fuusen"
  | "chu";

export interface MouthMissionStep {
  /** ビート同期で大表示するかな */
  kana: string;
  /** ピクトグラムid(PICT_EMOJI のキー) */
  pict: string;
  /** ピクト大表示の説明ラベル */
  pictLabel: string;
}

export interface MouthMission {
  id: MouthMissionId;
  /** 体操名(仕様6.2) */
  name: string;
  /** ねらい(仕様6.2) */
  aim: string;
  /** かけ声(体操ごとにバリエーション) */
  kakegoe: string;
  /** 対応する音楽id(TaisouMusic の譜面キー) */
  musicId: MouthMissionId;
  /** 音楽の性格(仕様6.2) */
  musicStyle:
    | "march"
    | "skip"
    | "waltz"
    | "percussive"
    | "blues"
    | "pizzicato"
    | "jazz"
    | "exercise-classic"
    | "latin"
    | "cute-pop";
  /** UX上の目安時間。医療的な運動量ではなく、いつでも完了・中断できる。 */
  suggestedDurationSec: 15 | 20 | 30 | 45 | 60;
  steps: MouthMissionStep[];
}

// ピクトグラム大表示用の絵文字(TAISOU_HOSTS の mouthPicts + pictLabel 方式を拡張)
export const PICT_EMOJI: Record<string, string> = {
  open: "😮",
  "open-big": "😲",
  wide: "😁",
  "round-small": "😗",
  "round-out": "😙",
  puff: "🐡",
  pop: "😊",
  tongue: "😛",
  "tongue-long": "😝",
  blink: "😉",
  "eyes-shut": "😆",
  "eyes-open": "👀",
  "wink-right": "😉",
  "wink-left": "😜",
  "puff-right": "🐹",
  "puff-left": "🐹",
  "puff-switch": "🎈",
  kiss: "😘",
  smile: "😊",
};

export const MOUTH_MISSIONS: MouthMission[] = [
  {
    id: "aan",
    name: "おおきくあーん",
    aim: "開口",
    kakegoe: "いっくよ〜！",
    musicId: "aan",
    musicStyle: "march",
    suggestedDurationSec: 15,
    steps: [
      { kana: "あ", pict: "open", pictLabel: "おくちを おおきく ひらく" },
      { kana: "あ", pict: "open", pictLabel: "もういちど おおきく" },
      { kana: "あーん", pict: "open-big", pictLabel: "せかいいち おおきく あーん！" },
    ],
  },
  {
    id: "niko_ii",
    name: "にっこりいー",
    aim: "口角挙上",
    kakegoe: "じゅんびはいい？",
    musicId: "niko_ii",
    musicStyle: "skip",
    suggestedDurationSec: 15,
    steps: [
      { kana: "い", pict: "wide", pictLabel: "おくちを よこに ひく" },
      { kana: "い", pict: "wide", pictLabel: "にっこり もういちど" },
      { kana: "いー", pict: "wide", pictLabel: "にっこり いーっと キープ！" },
    ],
  },
  {
    id: "tako_uu",
    name: "たこさんうー",
    aim: "口唇突出",
    kakegoe: "おくちのじかんだよ〜！",
    musicId: "tako_uu",
    musicStyle: "waltz",
    suggestedDurationSec: 15,
    steps: [
      { kana: "う", pict: "round-small", pictLabel: "おくちを すぼめる" },
      { kana: "う", pict: "round-small", pictLabel: "たこさんみたいに" },
      { kana: "うー", pict: "round-out", pictLabel: "まえに ぐーっと つきだす！" },
    ],
  },
  {
    id: "pukupuku",
    name: "ぷくぷくほっぺ",
    aim: "頬筋",
    kakegoe: "ほっぺの じゅんびは いい？",
    musicId: "pukupuku",
    musicStyle: "percussive",
    suggestedDurationSec: 20,
    steps: [
      { kana: "ぷく", pict: "puff", pictLabel: "ほっぺを ふくらませる" },
      { kana: "ぷく", pict: "puff", pictLabel: "もっと ぷくーっと" },
      { kana: "ぱっ", pict: "pop", pictLabel: "ぱっと ちからを ぬく" },
    ],
  },
  {
    id: "beee",
    name: "べーっとした",
    aim: "舌出し",
    kakegoe: "べろの じかんだよ〜！",
    musicId: "beee",
    musicStyle: "blues",
    suggestedDurationSec: 15,
    steps: [
      { kana: "べ", pict: "tongue", pictLabel: "したを だす" },
      { kana: "べ", pict: "tongue", pictLabel: "もういちど べっ" },
      { kana: "べー", pict: "tongue-long", pictLabel: "したを ながーく べー！" },
    ],
  },
  {
    id: "pachipachi",
    name: "まばたきぱちぱち",
    aim: "眼輪筋",
    kakegoe: "おめめも いっしょに いくよ〜！",
    musicId: "pachipachi",
    musicStyle: "pizzicato",
    suggestedDurationSec: 20,
    steps: [
      { kana: "ぱち", pict: "blink", pictLabel: "まばたき ぱち" },
      { kana: "ぱち", pict: "blink", pictLabel: "もういちど ぱち" },
      { kana: "ぎゅっ", pict: "eyes-shut", pictLabel: "おめめを ぎゅっと とじる" },
      { kana: "ぱっ", pict: "eyes-open", pictLabel: "ぱっちり ひらく！" },
    ],
  },
  {
    id: "wink",
    name: "かためウィンク",
    aim: "表情筋左右",
    kakegoe: "かたっぽずつ いっくよ〜！",
    musicId: "wink",
    musicStyle: "jazz",
    suggestedDurationSec: 30,
    steps: [
      { kana: "みぎ", pict: "wink-right", pictLabel: "みぎめで ウィンク" },
      { kana: "ひだり", pict: "wink-left", pictLabel: "ひだりめで ウィンク" },
      { kana: "みぎ", pict: "wink-right", pictLabel: "もういちど みぎ" },
      { kana: "ひだり", pict: "wink-left", pictLabel: "もういちど ひだり" },
    ],
  },
  {
    id: "aiube",
    name: "あいうべたいそう",
    aim: "口腔機能総合",
    kakegoe: "せーの、いっくよ〜！",
    musicId: "aiube",
    musicStyle: "exercise-classic",
    suggestedDurationSec: 45,
    steps: [
      { kana: "あ", pict: "open", pictLabel: "おおきく あ" },
      { kana: "い", pict: "wide", pictLabel: "よこに い" },
      { kana: "う", pict: "round-small", pictLabel: "すぼめて う" },
      { kana: "べー", pict: "tongue-long", pictLabel: "したを だして べー！" },
    ],
  },
  {
    id: "fuusen",
    name: "ほっぺふうせん",
    aim: "頬交互",
    kakegoe: "ふうせん ぷくー！じゅんびはいい？",
    musicId: "fuusen",
    musicStyle: "latin",
    suggestedDurationSec: 30,
    steps: [
      { kana: "みぎぷく", pict: "puff-right", pictLabel: "みぎの ほっぺを ぷくー" },
      { kana: "ひだりぷく", pict: "puff-left", pictLabel: "ひだりの ほっぺを ぷくー" },
      { kana: "こうたい", pict: "puff-switch", pictLabel: "みぎ ひだり こうたいで！" },
    ],
  },
  {
    id: "chu",
    name: "ちゅーのくち",
    aim: "口輪筋",
    kakegoe: "さいごは ちゅーのくちだよ〜！",
    musicId: "chu",
    musicStyle: "cute-pop",
    suggestedDurationSec: 15,
    steps: [
      { kana: "ちゅ", pict: "kiss", pictLabel: "ちゅーの おくち" },
      { kana: "ちゅ", pict: "kiss", pictLabel: "もういちど ちゅ" },
      { kana: "にこっ", pict: "smile", pictLabel: "さいごは にっこり えがお！" },
    ],
  },
];

// 導入は合計約6.6秒。本編は既存 TaisouInterlude の BEAT_MS=1500 を踏襲。
export const TAISOU_TIMING = {
  YOKOKU_MS: 1200,
  SHOUKAI_MS: 1200,
  CHEER_MS: 1300,
  COUNTDOWN_STEP_MS: 700,
  LAUNCH_MS: 800,
  BEAT_MS: 1500,
  STAMP_MS: 2400,
} as const;

// ═══════════════════════════════════════
// ローテーション抽選(localStorage記憶)
// ═══════════════════════════════════════
export const RECENT_HOSTS_KEY = "suwapuyo_taisou_recent_hosts";
export const RECENT_MISSIONS_KEY = "suwapuyo_taisou_recent_missions";
export const RECENT_HOST_LIMIT = 4;
export const RECENT_MISSION_LIMIT = 3;
const FRESH_WEIGHT = 5;
const RECENT_WEIGHT = 1;

export interface TaisouMissionHost {
  id: string;
  name: string;
  image: string;
}

function readHistory(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeHistory(key: string, ids: string[], limit: number): void {
  try {
    localStorage.setItem(key, JSON.stringify(ids.slice(0, limit)));
  } catch {
    // localStorage が使えない環境では記憶なしで続行(抽選自体は成立する)
  }
}

// CHARACTERS 22体から、直近に出た子(既定4体)を避ける重み付き抽選。
export function pickMissionHost(): TaisouMissionHost {
  const recent = new Set(readHistory(RECENT_HOSTS_KEY));
  const weights = CHARACTERS.map((character) => (recent.has(character.id) ? RECENT_WEIGHT : FRESH_WEIGHT));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = CHARACTERS[CHARACTERS.length - 1];
  for (let index = 0; index < CHARACTERS.length; index++) {
    roll -= weights[index];
    if (roll <= 0) {
      chosen = CHARACTERS[index];
      break;
    }
  }
  writeHistory(RECENT_HOSTS_KEY, [chosen.id, ...readHistory(RECENT_HOSTS_KEY).filter((id) => id !== chosen.id)], RECENT_HOST_LIMIT);
  return { id: chosen.id, name: chosen.name, image: chosen.image };
}

// 直近3種を避けるミッションローテーション。
export function pickMouthMission(): MouthMission {
  const recent = readHistory(RECENT_MISSIONS_KEY);
  const recentSet = new Set(recent);
  const candidates = MOUTH_MISSIONS.filter((mission) => !recentSet.has(mission.id));
  const pool = candidates.length > 0 ? candidates : MOUTH_MISSIONS;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  writeHistory(RECENT_MISSIONS_KEY, [chosen.id, ...recent.filter((id) => id !== chosen.id)], RECENT_MISSION_LIMIT);
  return chosen;
}
