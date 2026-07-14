import type { TaisouBodyPart } from "../shared/progressStore";

export interface TaisouHost {
  bodyPart: TaisouBodyPart;
  hostCharacterId: "sample-mogupiyo" | "sample-shinbo" | "sample-sanka";
  hostName: string;
  hostImage: string;
  kana: string[];
  mouthPicts: string[];
  hostLine: string;
  beatLines: string[];
}

export const TAISOU_HOSTS: TaisouHost[] = [
  {
    bodyPart: "mouth",
    hostCharacterId: "sample-mogupiyo",
    hostName: "もぐぴよ",
    hostImage: "/content/01_すわぷよ/01_キャラクター/02_表示用/07_もぐぴよ.png",
    kana: ["あ", "い", "う", "え", "お"],
    mouthPicts: ["open", "wide", "round-small", "smile", "round"],
    hostLine: "いっしょに お口あそび〜！",
    beatLines: ["お口、ぽか〜ん「あ」！", "にっこり「い」〜！", "とんがり「う」！", "えがおで「え」！", "まる〜く「お」！"],
  },
  {
    bodyPart: "neck",
    hostCharacterId: "sample-shinbo",
    hostName: "シンボー",
    hostImage: "/content/01_すわぷよ/01_キャラクター/02_表示用/05_シンボー.png",
    kana: ["ゆ", "っ", "く", "り"],
    mouthPicts: ["neck-left", "neck-down", "neck-right", "neck-up"],
    hostLine: "姿勢、見えた。ゆ〜っくり、首まわそ〜",
    beatLines: ["ゆっくり左〜", "下を見て〜", "右へ〜", "上でにこっ"],
  },
  {
    bodyPart: "breath",
    hostCharacterId: "sample-sanka",
    hostName: "酸化わーわー",
    hostImage: "/content/01_すわぷよ/01_キャラクター/02_表示用/09_酸化.png",
    kana: ["す", "う", "ふ", "ー"],
    mouthPicts: ["nose-in", "hold", "blow", "smile"],
    hostLine: "鼻からすー…お口とじて、にこっ",
    beatLines: ["鼻からすー", "ちょっと待って", "ふーっと長く", "にこっ"],
  },
];

export const DEFAULT_TAISOU_HOST = TAISOU_HOSTS[0];
