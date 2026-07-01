import { useMemo, useState } from "react";
import "./shorts-studio.css";

type Audience = "親子" | "健康に不安" | "正しく知りたい" | "医療従事者";
type View = "today" | "characters" | "rules" | "learning";
type ProductionStatus = "未生成" | "レビュー待ち" | "修正中" | "MP4生成待ち" | "MP4出力済み";

type Character = {
  id: string;
  name: string;
  role: string;
  image: string;
  tone: string;
  fit: string;
  frequency: string;
  pitch?: number;
  color?: [number, number, number];
  hasDetailedProfile: boolean;
};

type Candidate = {
  id: string;
  title: string;
  weather: string;
  audience: Audience;
  theme: string;
  duration: string;
  score: number;
  status: "本命" | "調整中" | "実験";
  productionStatus: ProductionStatus;
  postSlot: string;
  titleStyle: string;
  characters: [string, string];
  hook: string;
  lines: string[];
  action: string;
  eventAnimations: string[];
};

type EffectPreset = {
  id: string;
  name: string;
  label: string;
  description: string;
};

type TitleStyleOption = {
  id: string;
  name: string;
  sample: string;
  description: string;
  previewClass: string;
};

type WorkflowStep = {
  number: string;
  title: string;
  body: string;
  output: string;
};

type RenderStep = {
  id: string;
  label: string;
  status: "done" | "active" | "next";
};

type QualityCheck = {
  id: string;
  label: string;
  status: "ok" | "warn" | "error";
  message: string;
};

type VideoSpecPreview = {
  schemaVersion: "shorts.video.v1";
  episodeId: string;
  version: number;
  title: string;
  topTitle: string;
  titleStyle: {
    id: string;
    name: string;
  };
  targetAudience: Audience;
  theme: string;
  weather: string;
  layout: {
    titleY: number;
    characterY: number;
    subtitleY: number;
  };
  stage: {
    leftCharacterId: string;
    rightCharacterId?: string;
    swapped: boolean;
    mode: "solo" | "duo";
  };
  eventAnimation: string;
  lines: string[];
  manualPostDraft: {
    caption: string;
    hashtags: string[];
  };
};

type RenderScriptLine = {
  who: string;
  text: string;
  dur: number;
};

type RenderReadySpec = {
  title: string;
  size: [number, number];
  fps: number;
  background: string;
  backgroundVariant: string;
  topTitle: string;
  titleStyle: string;
  layout: {
    titleX: number;
    titleY: number;
    titleFontSize: number;
    topIllustX: number;
    topIllustY: number;
    topIllustHeight: number;
    leftCharacterX: number;
    rightCharacterX: number;
    characterHeight: number;
    characterBaselineY: number;
    subtitleY: number;
    ctaY: number;
    subtitleFontSize: number;
    ctaFontSize: number;
  };
  targetAudience: {
    primary: Audience;
    secondary: Audience;
  };
  viewerState: string;
  theme: string;
  behaviorGoal: string;
  cognitiveHook: string;
  marketingPhilosophy: string;
  weather: string;
  topIllust: string;
  characters: {
    [key: string]: {
      img: string;
      side: "left" | "right";
      pitch: number;
      color: [number, number, number];
    };
  };
  cta: {
    color: [number, number, number];
  };
  audio: {
    bgm: boolean;
    animalese: boolean;
  };
  debugSafezone: boolean;
  eventAnimation: string[];
  emotion: {
    [key: string]: string;
  };
  lines: RenderScriptLine[];
};

type RenderJobStatus = "idle" | "checking" | "rendering" | "success" | "error";

type RenderJobResult = {
  title: string;
  outputPath: string;
  downloadUrl: string;
  duration: number;
  size: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRenderJobResult(value: unknown): value is RenderJobResult {
  return isRecord(value)
    && typeof value.title === "string"
    && typeof value.outputPath === "string"
    && typeof value.downloadUrl === "string"
    && typeof value.duration === "number"
    && typeof value.size === "number";
}

function errorMessageFromResponse(value: unknown): string {
  if (!isRecord(value)) {
    return "MP4生成に失敗しました";
  }
  if (typeof value.message === "string") {
    return value.message;
  }
  if (typeof value.type === "string") {
    return value.type;
  }
  return "MP4生成に失敗しました";
}

function formatBytes(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)}KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

const characters: Character[] = [
  {
    id: "waawaa",
    name: "わーわー",
    role: "村長",
    image: "/content/fuwafuwa-land/characters/display/waawaa.png",
    tone: "元気に勘違いして、すぐ冒険にする",
    fit: "朝の導入、親子の一緒にやる系、村の宣言",
    frequency: "920Hz / fast",
    hasDetailedProfile: true,
  },
  {
    id: "suusuu",
    name: "すーすー",
    role: "助手長",
    image: "/content/fuwafuwa-land/characters/display/suusuu.png",
    tone: "やさしく整理する。短く正確にツッコむ",
    fit: "説明の交通整理、医療従事者向け、誤解の修正",
    frequency: "760Hz / medium",
    hasDetailedProfile: true,
  },
  {
    id: "mogupiyo",
    name: "もぐぴよ",
    role: "口腔育成部長",
    image: "/content/fuwafuwa-land/characters/display/mogupiyo.png",
    tone: "ほめ上手。口の動きを合言葉にする",
    fit: "口たいそう、親子実践、赤ちゃんのお口",
    frequency: "700Hz / bubbly",
    hasDetailedProfile: true,
  },
  {
    id: "ketonyan",
    name: "けとにゃん",
    role: "健康文化部長",
    image: "/content/fuwafuwa-land/characters/display/ketonyan.png",
    tone: "先生っぽいけど、甘いものに耳が動く",
    fit: "血糖、食べ方、健康知識のやさしい翻訳",
    frequency: "650Hz / medium-fast",
    hasDetailedProfile: true,
  },
  {
    id: "wanono",
    name: "わのの",
    role: "つながり担当",
    image: "/content/fuwafuwa-land/characters/display/wanono.png",
    tone: "ふわっと受け止める。つながりの話が得意",
    fit: "会話、コミュニティ、YourTIMEの哲学",
    frequency: "840Hz / slow",
    hasDetailedProfile: true,
  },
  {
    id: "rapiko",
    name: "ラピ子",
    role: "未病美容部長",
    image: "/content/fuwafuwa-land/characters/display/rapiko.png",
    tone: "きらっと明るく、自分責めをほどく",
    fit: "美容、未病、親子の自己肯定感",
    frequency: "980Hz / sparkly",
    hasDetailedProfile: true,
  },
  {
    id: "tanupei",
    name: "たぬぺい",
    role: "夢とお金の文化部長",
    image: "/content/fuwafuwa-land/characters/display/tanupei.png",
    tone: "落ち着いた兄さん口調。夢とお金をやさしい例えにする",
    fit: "イベント参加、家族の未来、選び方、応援メッセージ",
    frequency: "560Hz / medium-slow",
    hasDetailedProfile: true,
  },
  {
    id: "shinbo",
    name: "シンボー",
    role: "からだ改革部長",
    image: "/content/fuwafuwa-land/characters/display/shinbo.png",
    tone: "まじめに観察するが、例えが少し変。体の動きが得意",
    fit: "姿勢、体操、呼吸、からだの小さな違和感",
    frequency: "610Hz / dry-comic",
    hasDetailedProfile: true,
  },
  {
    id: "enshou",
    name: "炎症わーわー",
    role: "おくちの火消し部長",
    image: "/content/fuwafuwa-land/characters/display/enshou.png",
    tone: "あわて気味だけど素直。最後はきれいにしようへ着地する",
    fit: "歯みがき、清潔、違和感に気づく、やさしい注意喚起",
    frequency: "880Hz / jittery",
    hasDetailedProfile: true,
  },
  {
    id: "touka",
    name: "糖化わーわー",
    role: "血糖値管理して部長",
    image: "/content/fuwafuwa-land/characters/display/touka.png",
    tone: "低めでゆっくり。怖がらせず今日の小さい選択へ戻す",
    fit: "甘いもの、食べ方、小皿、水分、だらだら食べ",
    frequency: "520Hz / toasty",
    hasDetailedProfile: true,
  },
  {
    id: "sanka",
    name: "酸化わーわー",
    role: "おくち閉じるぞ部長",
    image: "/content/fuwafuwa-land/characters/display/sanka.png",
    tone: "少ししょんぼり始まり、鼻呼吸の話で明るくなる",
    fit: "口呼吸、乾燥、睡眠、鼻呼吸、朝の違和感",
    frequency: "740Hz / breathy",
    hasDetailedProfile: true,
  },
  {
    id: "haisha-gorisan",
    name: "歯医者のごりさん",
    role: "歯科の見守り役",
    image: "/content/fuwafuwa-land/characters/display/haisha-gorisan.png",
    tone: "専門家っぽく安心感を出す。難しい話は一言でかみ砕く",
    fit: "専門家コメント、受診の背中押し、歯科相談",
    frequency: "540Hz / calm",
    hasDetailedProfile: false,
  },
  {
    id: "seiucchi",
    name: "セイウッチー",
    role: "海の応援係",
    image: "/content/fuwafuwa-land/characters/display/seiucchi.png",
    tone: "おおらかで、ゆっくり相づちする。詳細は未設定",
    fit: "ゆるい雑談、水分、リラックス、親子の休憩",
    frequency: "600Hz / relaxed",
    hasDetailedProfile: false,
  },
  {
    id: "kamumu",
    name: "かむむ",
    role: "かむ力の練習係",
    image: "/content/fuwafuwa-land/characters/display/kamumu.png",
    tone: "もぐもぐ前のめり。詳細は未設定",
    fit: "噛む、食べる、あご、食育、親子実践",
    frequency: "720Hz / chewy",
    hasDetailedProfile: false,
  },
  {
    id: "hagurin",
    name: "はぐりん",
    role: "歯ぐき見守り係",
    image: "/content/fuwafuwa-land/characters/display/hagurin.png",
    tone: "やさしく心配して、すぐ明るい行動にする。詳細は未設定",
    fit: "歯ぐき、歯みがき、観察、朝晩の習慣",
    frequency: "760Hz / tender",
    hasDetailedProfile: false,
  },
  {
    id: "chippippi",
    name: "チッピッピ",
    role: "小さな気づき係",
    image: "/content/fuwafuwa-land/characters/display/chippippi.png",
    tone: "小さく元気に反応する。詳細は未設定",
    fit: "短い小ぼけ、子どもの反応、発見、合いの手",
    frequency: "1020Hz / tiny-fast",
    hasDetailedProfile: false,
  },
  {
    id: "sukumaru",
    name: "すくまる",
    role: "成長見守り係",
    image: "/content/fuwafuwa-land/characters/display/sukumaru.png",
    tone: "まるく受け止める。詳細は未設定",
    fit: "成長、親子の安心、習慣化、やさしい励まし",
    frequency: "690Hz / warm",
    hasDetailedProfile: false,
  },
  {
    id: "mieru",
    name: "ミエル",
    role: "見える化係",
    image: "/content/fuwafuwa-land/characters/display/mieru.png",
    tone: "見えたことを短く言う。詳細は未設定",
    fit: "チェックリスト、見える化、気づき、比較",
    frequency: "800Hz / clear",
    hasDetailedProfile: false,
  },
  {
    id: "mamyu",
    name: "マミュー",
    role: "やさしい見守り係",
    image: "/content/fuwafuwa-land/characters/display/mamyu.png",
    tone: "ふんわり包む。詳細は未設定",
    fit: "親子、安心、自愛、寝る前の習慣",
    frequency: "830Hz / soft",
    hasDetailedProfile: false,
  },
  {
    id: "tenpiyo",
    name: "てんぴよ",
    role: "お天気小ぼけ係",
    image: "/content/fuwafuwa-land/characters/display/tenpiyo.png",
    tone: "天気に反応して少しずれる。詳細は未設定",
    fit: "天気導入、朝の挨拶、小ぼけ、軽い雑談",
    frequency: "930Hz / chirpy",
    hasDetailedProfile: false,
  },
  {
    id: "sukusuke",
    name: "すくすけ",
    role: "すくすく応援係",
    image: "/content/fuwafuwa-land/characters/display/sukusuke.png",
    tone: "前向きに背中を押す。詳細は未設定",
    fit: "成長、運動、親子チャレンジ、継続",
    frequency: "780Hz / upbeat",
    hasDetailedProfile: false,
  },
  {
    id: "emahime",
    name: "えまひめ",
    role: "笑顔の案内係",
    image: "/content/fuwafuwa-land/characters/display/emahime.png",
    tone: "上品だけど親しみやすい。詳細は未設定",
    fit: "笑顔、美容、イベント案内、親子の記念",
    frequency: "910Hz / graceful",
    hasDetailedProfile: false,
  },
];

const candidates: Candidate[] = [
  {
    id: "yt-001",
    title: "口たいそう",
    weather: "晴れ",
    audience: "親子",
    theme: "ほっぺ・舌・笑顔でお口を起こす",
    duration: "46秒",
    score: 94,
    status: "本命",
    productionStatus: "レビュー待ち",
    postSlot: "08:00 朝",
    titleStyle: "puku-yellow",
    characters: ["waawaa", "mogupiyo"],
    hook: "見た瞬間に親子で真似できる",
    action: "ぷー、ぺろ、にこーを一緒にやる",
    eventAnimations: ["cheek-balloon", "tongue-flag", "smile-stamp"],
    lines: [
      "おはようございます！",
      "今日のふわふわランドの天気は、、、",
      "晴れです！",
      "お口も、まだねぼけてるかも",
      "えっ、ぼくの口、寝ぐせある？",
      "あるある。じゃあ、ほっぺぷー！",
      "おうちでも、親子でぷーぺろにこー！",
    ],
  },
  {
    id: "yt-002",
    title: "雨の日の選び方",
    weather: "雨",
    audience: "健康に不安",
    theme: "だらだら食べを減らして体を整える",
    duration: "39秒",
    score: 87,
    status: "調整中",
    productionStatus: "修正中",
    postSlot: "12:30 昼",
    titleStyle: "teacher-green",
    characters: ["ketonyan", "waawaa"],
    hook: "雨とアメの小ぼけから血糖の話へ",
    action: "甘いものを小皿に分ける",
    eventAnimations: ["candy-rain", "small-plate", "water-sparkle"],
    lines: [
      "おはようございます！",
      "今日のふわふわランドの天気は、、、",
      "雨です！",
      "雨かあ。アメが降る日じゃないよね？",
      "水の雨にゃ。甘い方は、悪者じゃない",
      "我慢じゃなくて、作戦なんだね",
    ],
  },
  {
    id: "yt-003",
    title: "つながる朝",
    weather: "くもり",
    audience: "医療従事者",
    theme: "押しつけず、困りごとから会話を始める",
    duration: "38秒",
    score: 91,
    status: "本命",
    productionStatus: "MP4生成待ち",
    postSlot: "19:00 夜",
    titleStyle: "fuwa-blue",
    characters: ["wanono", "suusuu"],
    hook: "話しやすい空気をつくる",
    action: "最初の一言を質問にする",
    eventAnimations: ["halo-link", "soft-popup", "care-glow"],
    lines: [
      "おはようございます！",
      "今日のふわふわランドの天気は、、、",
      "くもりです！",
      "まぶしすぎないから、話しやすい朝だね",
      "まずは、最近こまっていることを聞く",
      "次のケアは、信頼のあとについてくる",
    ],
  },
];

const titleStyles: TitleStyleOption[] = [
  {
    id: "puku-yellow",
    name: "ぷくっと黄色",
    sample: "ぷく",
    description: "親子実践・朝の導入向け。元気で一番読みやすい標準。",
    previewClass: "title-style-puku-yellow",
  },
  {
    id: "teacher-green",
    name: "先生みどり",
    sample: "先生",
    description: "健康知識・医療従事者向け。安心感と整理感を出す。",
    previewClass: "title-style-teacher-green",
  },
  {
    id: "fuwa-blue",
    name: "ふわ水色",
    sample: "ふわ",
    description: "つながり・雑談・やさしい回。空気をやわらかくする。",
    previewClass: "title-style-fuwa-blue",
  },
  {
    id: "kiratto-peach",
    name: "きらっと桃",
    sample: "きら",
    description: "美容・未病・自己肯定感。かわいく前向きに見せる。",
    previewClass: "title-style-kiratto-peach",
  },
  {
    id: "hand-white",
    name: "手書き白",
    sample: "手書き",
    description: "村の会話・ゆるい雑談。説明感を減らす。",
    previewClass: "title-style-hand-white",
  },
  {
    id: "adventure-orange",
    name: "探検オレンジ",
    sample: "探検",
    description: "わーわーの冒険回。発見・小ぼけ・チャレンジ向け。",
    previewClass: "title-style-adventure-orange",
  },
  {
    id: "night-drop",
    name: "夜のしずく",
    sample: "しずく",
    description: "睡眠・鼻呼吸・夜の習慣。落ち着きと余韻を出す。",
    previewClass: "title-style-night-drop",
  },
  {
    id: "fire-red",
    name: "火消し赤",
    sample: "火消し",
    description: "炎症わーわー向け。注意喚起をかわいく止める。",
    previewClass: "title-style-fire-red",
  },
];
const themes = ["口腔育成", "未病", "食べ方", "親子体操", "会話づくり", "雑談から健康"];
const viewLabels: Record<View, string> = {
  today: "今日",
  characters: "キャラ",
  rules: "ルール",
  learning: "学習",
};

const workflowSteps: WorkflowStep[] = [
  {
    number: "01",
    title: "今日の狙いを決める",
    body: "親子、健康に不安、正しく知りたい、医療従事者のどこへ届けるかを先に固定。",
    output: "targetAudience / viewerState",
  },
  {
    number: "02",
    title: "キャラと関係性を選ぶ",
    body: "ボケ、受け止め、専門補足、YourTIME哲学のどれを誰が担当するかを決める。",
    output: "characters / stageRole",
  },
  {
    number: "03",
    title: "脚本を自動生成",
    body: "最初の挨拶、天気、テーマ、小ぼけ、実践、持ち帰りの型で30-60秒に収める。",
    output: "title / lines / duration",
  },
  {
    number: "04",
    title: "見た目を微調整",
    body: "タイトル、キャラ、セリフを1:1安全域の中心へ。演出は内容を邪魔しない範囲にする。",
    output: "layout / eventAnimation",
  },
  {
    number: "05",
    title: "承認して学習",
    body: "直した理由を次回ルールに変換。毎回の注意を人間が言い続けなくていい状態へ。",
    output: "approvedDraft / learnedRules",
  },
];

const qualityRules = [
  "冒頭は必ず「おはようございます！」から始める",
  "天気は「今日のふわふわランドの天気は、、、」で一度区切る",
  "タイトル、キャラ、セリフは1:1安全域の中心に寄せる",
  "説明口調だけにしない。村で本当に会話している感じにする",
  "診断や不安あおりではなく、今日できる小さい行動へ落とす",
  "YourTIMEの価値は売り込みではなく、体験と持ち帰りで伝える",
];

const learningSignals = [
  { label: "タイトル位置", value: "上げすぎない", confidence: "98%" },
  { label: "天気", value: "普通に伝える", confidence: "95%" },
  { label: "語尾", value: "硬いまとめを避ける", confidence: "91%" },
  { label: "会話", value: "子どもが言いそうな反応を混ぜる", confidence: "89%" },
];

const renderSteps: RenderStep[] = [
  { id: "generate", label: "候補生成", status: "done" },
  { id: "review", label: "レビュー", status: "done" },
  { id: "preview", label: "高速確認", status: "active" },
  { id: "render", label: "MP4生成", status: "next" },
  { id: "manual-post", label: "手動投稿", status: "next" },
];

const manualPostItems = [
  "MP4をダウンロード",
  "冒頭3秒と字幕をスマホで確認",
  "投稿文とハッシュタグを確認",
  "SNSへ手動投稿",
  "投稿済みにして学習へ反映",
];

const semiAutoMp4Steps = [
  "render.py入力JSONを確認",
  "JSONをダウンロード",
  "同じJSONを scripts/ に置く",
  "表示されたCLIコマンドでMP4生成",
  "shorts/out のMP4を確認",
];
const effectPresets: EffectPreset[] = [
  {
    id: "cheek-balloon",
    name: "ほっぺ風船",
    label: "ぷく",
    description: "口たいそうや親子実践向け。丸い空気がぽんぽん出る。",
  },
  {
    id: "candy-rain",
    name: "キャンディ雨",
    label: "雨",
    description: "雨とアメの小ぼけ用。途中から水しずくに変える。",
  },
  {
    id: "halo-link",
    name: "つながり輪っか",
    label: "輪",
    description: "会話、信頼、コミュニティの話に合わせる。",
  },
  {
    id: "care-glow",
    name: "ケアの光",
    label: "光",
    description: "大事な一言の直後に、ふわっと安心感を出す。",
  },
  {
    id: "none",
    name: "演出なし",
    label: "静",
    description: "会話の表情を優先して、情報を邪魔しない。",
  },
];

function getCharacter(id: string) {
  return characters.find((character) => character.id === id) ?? characters[0];
}

function getTitleStyle(id: string) {
  return titleStyles.find((style) => style.id === id || style.name === id) ?? titleStyles[0];
}

function assetPathForRender(path: string) {
  return path.replace(/^\//, "");
}

function inferPitch(character: Character) {
  if (character.pitch) {
    return character.pitch;
  }
  const match = character.frequency.match(/(\d+)/);
  return match ? Number(match[1]) : 760;
}

function colorForCharacter(character: Character): [number, number, number] {
  if (character.color) {
    return character.color;
  }
  const palette: [number, number, number][] = [
    [222, 120, 44],
    [56, 152, 224],
    [93, 147, 78],
    [210, 132, 156],
    [90, 172, 192],
    [164, 112, 52],
  ];
  const index = character.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

function stableHash(input: string) {
  return input.split("").reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7);
}

function pickStageCharacterIds(candidate: Candidate, swapped: boolean): [string] | [string, string] {
  const ordered = swapped
    ? [candidate.characters[1], candidate.characters[0]]
    : [candidate.characters[0], candidate.characters[1]];
  const seed = stableHash(`${candidate.id}:${candidate.theme}:${candidate.audience}`);
  const soloFriendly = candidate.audience !== "医療従事者" && !candidate.theme.includes("会話");
  const useSolo = soloFriendly && seed % 3 === 0;
  if (!useSolo) {
    return [ordered[0], ordered[1]];
  }
  return [ordered[seed % ordered.length]];
}

function buildRenderLines(scriptText: string, isDuo: boolean): RenderScriptLine[] {
  const lines = scriptText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines.map((line, index) => {
    const isLast = index === lines.length - 1;
    const who = isLast ? "cta" : !isDuo || index < 3 ? "left" : index % 2 === 0 ? "left" : "right";
    const baseDuration = Math.min(4.2, Math.max(2.2, line.length * 0.18));
    return {
      who,
      text: line,
      dur: Number(baseDuration.toFixed(1)),
    };
  });
}

function buildQualityChecks(params: {
  lines: RenderScriptLine[];
  titleY: number;
  characterY: number;
  subtitleY: number;
  title: string;
  theme: string;
  behaviorGoal: string;
}): QualityCheck[] {
  const scriptTexts = params.lines.map((line) => line.text);
  const totalDuration = params.lines.reduce((sum, line) => sum + line.dur, 0);
  const hasOpening = scriptTexts[0] === "おはようございます！";
  const hasWeatherLead = scriptTexts[1] === "今日のふわふわランドの天気は、、、";
  const hasWeatherResult = Boolean(scriptTexts[2]?.endsWith("です！"));
  const titleInSafeArea = params.titleY >= 24 && params.titleY <= 38;
  const characterInSafeArea = params.characterY >= 36 && params.characterY <= 52;
  const subtitleInSafeArea = params.subtitleY >= 56 && params.subtitleY <= 76;

  return [
    {
      id: "opening",
      label: "冒頭ルール",
      status: hasOpening && hasWeatherLead && hasWeatherResult ? "ok" : "error",
      message: hasOpening && hasWeatherLead && hasWeatherResult
        ? "挨拶、天気ふり、天気結果が揃っています"
        : "最初の3行を固定ルールに戻してください",
    },
    {
      id: "duration",
      label: "尺",
      status: totalDuration >= 30 && totalDuration <= 60 ? "ok" : "warn",
      message: `${totalDuration.toFixed(1)}秒。目標は30-60秒です`,
    },
    {
      id: "safe-area",
      label: "1:1安全域",
      status: titleInSafeArea && characterInSafeArea && subtitleInSafeArea ? "ok" : "error",
      message: titleInSafeArea && characterInSafeArea && subtitleInSafeArea
        ? "タイトル、キャラ、セリフが安全域に収まります"
        : "位置調整で上部1:1の範囲に戻してください",
    },
    {
      id: "theme",
      label: "テーマ",
      status: params.theme.trim() && params.behaviorGoal.trim() ? "ok" : "error",
      message: params.theme.trim() && params.behaviorGoal.trim()
        ? "テーマと行動目標があります"
        : "テーマと今日できる行動が必要です",
    },
    {
      id: "title",
      label: "タイトル",
      status: params.title.trim().length > 0 && params.title.length <= 12 ? "ok" : "warn",
      message: params.title.length <= 12
        ? "短く読みやすいタイトルです"
        : "タイトルが長めです。短くすると視認性が上がります",
    },
  ];
}

export function ShortsStudioMock() {
  const [activeView, setActiveView] = useState<View>("today");
  const [selectedId, setSelectedId] = useState(candidates[0].id);
  const selected = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0],
    [selectedId],
  );
  const [title, setTitle] = useState(selected.title);
  const [script, setScript] = useState(selected.lines.join("\n"));
  const [titleY, setTitleY] = useState(32);
  const [characterY, setCharacterY] = useState(45);
  const [subtitleY, setSubtitleY] = useState(68);
  const [isSwapped, setIsSwapped] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState(candidates[0].eventAnimations[0]);
  const [selectedTitleStyleName, setSelectedTitleStyleName] = useState(candidates[0].titleStyle);
  const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0].id);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [renderJobStatus, setRenderJobStatus] = useState<RenderJobStatus>("idle");
  const [renderJobResult, setRenderJobResult] = useState<RenderJobResult | null>(null);
  const [renderJobError, setRenderJobError] = useState<string | null>(null);

  const stageCharacters = isSwapped
    ? [selected.characters[1], selected.characters[0]]
    : selected.characters;
  const previewStageCharacters = pickStageCharacterIds(selected, isSwapped);
  const leftCharacter = getCharacter(stageCharacters[0]);
  const rightCharacter = getCharacter(stageCharacters[1]);
  const effect = effectPresets.find((preset) => preset.id === selectedEffect) ?? effectPresets[0];
  const selectedTitleStyle = getTitleStyle(selectedTitleStyleName);
  const selectedCharacter = getCharacter(selectedCharacterId);
  const renderLines = useMemo(() => buildRenderLines(script, stageCharacters.length > 1), [script, stageCharacters.length]);
  const postHashtags = useMemo(() => ["#YourTIME", "#ふわふわランド", "#親子健康", "#口腔育成"], []);
  const postCaption = `${title}。${selected.action} YourTIMEで、親子で持ち帰れる健康のきっかけを。`;
  const qualityChecks = useMemo(() => buildQualityChecks({
    lines: renderLines,
    titleY,
    characterY,
    subtitleY,
    title,
    theme: selected.theme,
    behaviorGoal: selected.action,
  }), [characterY, renderLines, selected.action, selected.theme, subtitleY, title, titleY]);
  const hasBlockingQualityError = qualityChecks.some((check) => check.status === "error");
  const currentRenderSpec = useMemo<RenderReadySpec>(() => ({
    title: `${selected.id}-edited`,
    size: [1080, 1920],
    fps: 30,
    background: "public/content/fuwafuwa-land/backgrounds/village-bg.png",
    backgroundVariant: `${selected.id}: generated from Shorts Studio UI`,
    topTitle: title,
    titleStyle: selectedTitleStyle.id,
    layout: {
      titleX: 0.5,
      titleY: titleY / 100,
      titleFontSize: 0.082,
      topIllustX: 0.08,
      topIllustY: 0.18,
      topIllustHeight: 0.08,
      leftCharacterX: 0.32,
      rightCharacterX: 0.68,
      characterHeight: 0.32,
      characterBaselineY: characterY / 100 + 0.22,
      subtitleY: subtitleY / 100,
      ctaY: Math.max(0.5, subtitleY / 100 - 0.08),
      subtitleFontSize: 0.05,
      ctaFontSize: 0.072,
    },
    targetAudience: {
      primary: selected.audience,
      secondary: selected.audience,
    },
    viewerState: "YourTIME向けのショート動画を確認している",
    theme: selected.theme,
    behaviorGoal: selected.action,
    cognitiveHook: selected.hook,
    marketingPhilosophy: "YourTIMEは、知識を聞くだけでなく親子で体験して次のケアへつながる場",
    weather: selected.weather,
    topIllust: assetPathForRender(leftCharacter.image),
    characters: {
      left: {
        img: assetPathForRender(leftCharacter.image),
        side: "left",
        pitch: inferPitch(leftCharacter),
        color: colorForCharacter(leftCharacter),
      },
      right: {
        img: assetPathForRender(rightCharacter.image),
        side: "right",
        pitch: inferPitch(rightCharacter),
        color: colorForCharacter(rightCharacter),
      },
    },
    cta: {
      color: [214, 158, 44],
    },
    audio: {
      bgm: true,
      animalese: true,
    },
    debugSafezone: false,
    eventAnimation: [selectedEffect],
    emotion: {
      left: leftCharacter.tone,
      right: rightCharacter.tone,
    },
    lines: renderLines,
  }), [
    characterY,
    leftCharacter,
    renderLines,
    rightCharacter,
    selected.action,
    selected.audience,
    selected.hook,
    selected.id,
    selected.theme,
    selected.weather,
    selectedEffect,
    selectedTitleStyle.id,
    subtitleY,
    title,
    titleY,
  ]);
  const currentVideoSpec = useMemo<VideoSpecPreview>(() => ({
    schemaVersion: "shorts.video.v1",
    episodeId: selected.id,
    version: 1,
    title: selected.id,
    topTitle: title,
    titleStyle: {
      id: selectedTitleStyle.id,
      name: selectedTitleStyle.name,
    },
    targetAudience: selected.audience,
    theme: selected.theme,
    weather: selected.weather,
    layout: {
      titleY,
      characterY,
      subtitleY,
    },
    stage: {
      leftCharacterId: previewStageCharacters[0],
      rightCharacterId: previewStageCharacters[1],
      swapped: isSwapped,
      mode: previewStageCharacters.length === 1 ? "solo" : "duo",
    },
    eventAnimation: selectedEffect,
    lines: renderLines.map((line) => line.text),
    manualPostDraft: {
      caption: postCaption,
      hashtags: postHashtags,
    },
  }), [
    characterY,
    isSwapped,
    previewStageCharacters,
    leftCharacter.id,
    postCaption,
    postHashtags,
    rightCharacter.id,
    renderLines,
    selected.action,
    selected.audience,
    selected.id,
    selected.theme,
    selected.weather,
    selectedEffect,
    selectedTitleStyle.id,
    selectedTitleStyle.name,
    subtitleY,
    title,
    titleY,
  ]);
  const currentVideoSpecJson = JSON.stringify(currentVideoSpec, null, 2);
  const currentRenderSpecJson = JSON.stringify(currentRenderSpec, null, 2);
  const isLocalRenderAvailable = import.meta.env.DEV;
  const isRenderRunning = renderJobStatus === "checking" || renderJobStatus === "rendering";
  const renderCommand = `python3 shorts/render.py public/content/shorts-studio/scripts/${currentRenderSpec.title}.json`;
  const expectedMp4Path = `shorts/out/${currentRenderSpec.title}.mp4`;

  function selectCandidate(candidate: Candidate) {
    setSelectedId(candidate.id);
    setTitle(candidate.title);
    setScript(candidate.lines.join("\n"));
    setIsSwapped(false);
    setSelectedEffect(candidate.eventAnimations[0]);
    setSelectedTitleStyleName(candidate.titleStyle);
    setRenderJobStatus("idle");
    setRenderJobResult(null);
    setRenderJobError(null);
  }

  function copyText(label: string, text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(null), 1600);
    });
  }

  function downloadRenderJson() {
    const blob = new Blob([currentRenderSpecJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${currentRenderSpec.title}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function generateMp4() {
    if (hasBlockingQualityError || isRenderRunning || !isLocalRenderAvailable) {
      return;
    }
    setRenderJobStatus("checking");
    setRenderJobResult(null);
    setRenderJobError(null);
    try {
      setRenderJobStatus("rendering");
      const response = await fetch("/api/shorts-studio/render", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ spec: currentRenderSpec }),
      });
      const payload = await response.json() as unknown;
      if (!response.ok || !isRenderJobResult(payload)) {
        setRenderJobStatus("error");
        setRenderJobError(errorMessageFromResponse(payload));
        return;
      }
      setRenderJobStatus("success");
      setRenderJobResult(payload);
    } catch (error) {
      setRenderJobStatus("error");
      setRenderJobError(error instanceof Error ? error.message : "MP4生成に失敗しました");
    }
  }

  return (
    <main className="studio-shell">
      <aside className="studio-rail" aria-label="Shorts Studio navigation">
        <div className="studio-brand">
          <span className="studio-brand-mark">Y</span>
          <div>
            <strong>YourTIME</strong>
            <small>Shorts Studio</small>
          </div>
        </div>
        <nav className="studio-nav">
          {(Object.keys(viewLabels) as View[]).map((view) => (
            <button
              className={activeView === view ? "is-active" : ""}
              key={view}
              onClick={() => setActiveView(view)}
              type="button"
            >
              {viewLabels[view]}
            </button>
          ))}
        </nav>
        <div className="studio-rail-note">
          <span>{activeView === "today" ? "2/3" : "5"}</span>
          <p>{activeView === "today" ? "今日の投稿候補" : "制作ステップ"}</p>
        </div>
      </aside>

      <section className="studio-candidates" aria-label="Generated candidates">
        {activeView === "today" && (
          <>
            <div className="studio-section-head">
              <div>
                <p>2026.06.26</p>
                <h1>今日の運用</h1>
              </div>
              <button className="primary-button" type="button">自動生成</button>
            </div>

            <div className="daily-dashboard" aria-label="Daily production status">
              <article>
                <span>今日の必要本数</span>
                <strong>3</strong>
                <p>親子 / 健康不安 / 医療従事者</p>
              </article>
              <article>
                <span>レビュー待ち</span>
                <strong>1</strong>
                <p>まずは朝枠を確定</p>
              </article>
              <article>
                <span>MP4出力</span>
                <strong>0</strong>
                <p>承認後に生成</p>
              </article>
            </div>

            <div className="workflow-strip" aria-label="Production workflow">
              {renderSteps.map((step) => (
                <article className={`is-${step.status}`} key={step.id}>
                  <span>{step.status === "done" ? "OK" : step.status === "active" ? "NOW" : "NEXT"}</span>
                  <strong>{step.label}</strong>
                </article>
              ))}
            </div>

            <div className="theme-strip" aria-label="Generation variables">
              {themes.map((theme) => (
                <button key={theme} type="button">{theme}</button>
              ))}
            </div>

            <div className="candidate-list">
              {candidates.map((candidate) => (
                <button
                  className={candidate.id === selected.id ? "candidate-card is-selected" : "candidate-card"}
                  key={candidate.id}
                  onClick={() => selectCandidate(candidate)}
                  type="button"
                >
                  <span className="candidate-status">{candidate.status}</span>
                  <strong>{candidate.title}</strong>
                  <small>{candidate.postSlot} / {candidate.audience} / {candidate.duration}</small>
                  <p>{candidate.theme}</p>
                  <em>{candidate.productionStatus}</em>
                  <span className="score-pill">伸び予測 {candidate.score}</span>
                </button>
              ))}
            </div>

            <div className="character-bible">
              <div className="panel-title">
                <span>キャラ相性</span>
                <strong>{leftCharacter.name} × {rightCharacter.name}</strong>
              </div>
              <div className="mini-character-row">
                {[leftCharacter, rightCharacter].map((character) => (
                  <article key={character.id}>
                    <img alt={character.name} src={character.image} />
                    <div>
                      <strong>{character.name}</strong>
                      <p>{character.tone}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </>
        )}

        {activeView === "characters" && (
          <div className="studio-page">
            <div className="studio-section-head">
              <div>
                <p>Character Casting</p>
                <h1>キャラ選択</h1>
              </div>
              <button className="primary-button" type="button">この2人で生成</button>
            </div>
            <div className="character-grid">
              {characters.map((character) => (
                <button
                  className={character.id === selectedCharacter.id ? "character-select-card is-selected" : "character-select-card"}
                  key={character.id}
                  onClick={() => setSelectedCharacterId(character.id)}
                  type="button"
                >
                  <img alt={character.name} src={character.image} />
                  <strong>{character.name}</strong>
                  <span>{character.hasDetailedProfile ? character.role : `${character.role} / 詳細未設定`}</span>
                </button>
              ))}
            </div>
            <article className="character-profile">
              <img alt={selectedCharacter.name} src={selectedCharacter.image} />
              <div>
                <span>{selectedCharacter.role}</span>
                <h2>{selectedCharacter.name}</h2>
                {!selectedCharacter.hasDetailedProfile && <mark className="profile-status">詳細未設定</mark>}
                <p>{selectedCharacter.tone}</p>
                <dl>
                  <div>
                    <dt>相性がいいネタ</dt>
                    <dd>{selectedCharacter.fit}</dd>
                  </div>
                  <div>
                    <dt>声・テンポ</dt>
                    <dd>{selectedCharacter.frequency}</dd>
                  </div>
                </dl>
              </div>
            </article>
          </div>
        )}

        {activeView === "rules" && (
          <div className="studio-page">
            <div className="studio-section-head">
              <div>
                <p>Production Rules</p>
                <h1>最初から最後まで</h1>
              </div>
              <button className="primary-button" type="button">ルールで再生成</button>
            </div>
            <div className="workflow-map">
              {workflowSteps.map((step) => (
                <article key={step.number}>
                  <span>{step.number}</span>
                  <h2>{step.title}</h2>
                  <p>{step.body}</p>
                  <code>{step.output}</code>
                </article>
              ))}
            </div>
            <div className="rule-board">
              {qualityRules.map((rule) => (
                <article key={rule}>
                  <span>必須</span>
                  <p>{rule}</p>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeView === "learning" && (
          <div className="studio-page">
            <div className="studio-section-head">
              <div>
                <p>Learning Loop</p>
                <h1>修正を資産にする</h1>
              </div>
              <button className="primary-button" type="button">次回へ反映</button>
            </div>
            <div className="learning-summary">
              <article>
                <strong>12</strong>
                <span>反映済みルール</span>
              </article>
              <article>
                <strong>4</strong>
                <span>今週の改善</span>
              </article>
              <article>
                <strong>91</strong>
                <span>平均伸び予測</span>
              </article>
            </div>
            <div className="learning-list">
              {learningSignals.map((signal) => (
                <article key={signal.label}>
                  <div>
                    <strong>{signal.label}</strong>
                    <p>{signal.value}</p>
                  </div>
                  <span>{signal.confidence}</span>
                </article>
              ))}
            </div>
            <div className="learning-note">
              <strong>このアプリが覚えること</strong>
              <p>人が直した文章そのものではなく、「なぜ直したか」をルール化する。だから次回は、タイトル位置、語尾、天気、キャラらしさの同じ失敗を先回りして避ける。</p>
            </div>
          </div>
        )}
      </section>

      <section className="studio-preview-zone" aria-label="Shorts preview">
        <div className="preview-toolbar">
          <div>
            <p>Preview</p>
            <strong>{selected.weather} / {effect.name} / {selected.productionStatus}</strong>
          </div>
          <div className="toolbar-actions">
            <button type="button">下書き</button>
            <button disabled={hasBlockingQualityError || isRenderRunning || !isLocalRenderAvailable} onClick={generateMp4} type="button">
              {isRenderRunning ? "生成中" : "MP4生成"}
            </button>
            <button className="primary-button" type="button">承認</button>
          </div>
        </div>

        <div className="phone-frame">
          <div className="safe-square" />
          <div className={`effect-layer effect-${selectedEffect}`} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="phone-sky">
            <span>今日のふわふわランド</span>
          </div>
          <h2
            className={`preview-title ${selectedTitleStyle.previewClass}`}
            style={{ top: `${titleY}%` }}
          >
            {title}
          </h2>
          <div className="preview-characters" style={{ top: `${characterY}%` }}>
            <img alt={leftCharacter.name} className="faces-right" src={leftCharacter.image} />
            <img alt={rightCharacter.name} className="faces-left" src={rightCharacter.image} />
          </div>
          <div className="subtitle-bubble" style={{ top: `${subtitleY}%` }}>
            {script.split("\n").find((line) => line.trim().length > 0) ?? "おはようございます！"}
          </div>
          <div className="phone-footer">YourTIMEで、遊びを持ち帰る</div>
        </div>
      </section>

      <aside className="studio-editor" aria-label="Review editor">
        <div className="editor-card">
          <div className="panel-title">
            <span>微調整</span>
            <strong>タイトルとセリフ</strong>
          </div>
          <label>
            タイトル
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            セリフ
            <textarea value={script} onChange={(event) => setScript(event.target.value)} rows={8} />
          </label>
        </div>

        <div className="editor-card">
          <div className="panel-title">
            <span>1:1安全域</span>
            <strong>位置調整</strong>
          </div>
          <label>
            タイトル上下
            <input max="38" min="24" type="range" value={titleY} onChange={(event) => setTitleY(Number(event.target.value))} />
          </label>
          <label>
            キャラ上下
            <input max="52" min="36" type="range" value={characterY} onChange={(event) => setCharacterY(Number(event.target.value))} />
          </label>
          <label>
            セリフ上下
            <input max="76" min="56" type="range" value={subtitleY} onChange={(event) => setSubtitleY(Number(event.target.value))} />
          </label>
        </div>

        <div className="editor-card compact">
          <div className="panel-title">
            <span>立ち位置</span>
            <strong>{leftCharacter.name} 左 / {rightCharacter.name} 右</strong>
          </div>
          <div className="stage-control">
            <article>
              <img alt={leftCharacter.name} src={leftCharacter.image} />
              <span>左</span>
            </article>
            <button type="button" onClick={() => setIsSwapped((current) => !current)}>
              入れ替え
            </button>
            <article>
              <img alt={rightCharacter.name} src={rightCharacter.image} />
              <span>右</span>
            </article>
          </div>
          <p>左はボケ・導入、右は受け止め・解説にすると会話が見やすいです。</p>
        </div>

        <div className="editor-card compact">
          <div className="panel-title">
            <span>演出指示</span>
            <strong>{effect.name}</strong>
          </div>
          <div className="effect-grid">
            {effectPresets.map((preset) => (
              <button
                className={preset.id === selectedEffect ? "is-active" : ""}
                key={preset.id}
                onClick={() => setSelectedEffect(preset.id)}
                type="button"
              >
                <span>{preset.label}</span>
                {preset.name}
              </button>
            ))}
          </div>
          <p>{effect.description}</p>
          <code className="json-chip">eventAnimation: "{selectedEffect}"</code>
        </div>

        <div className="editor-card compact">
          <div className="panel-title">
            <span>タイトル雰囲気</span>
            <strong>{selectedTitleStyle.name}</strong>
          </div>
          <div className="style-grid">
            {titleStyles.map((style) => (
              <button
                aria-pressed={style.id === selectedTitleStyle.id}
                className={style.id === selectedTitleStyle.id ? "style-option is-active" : "style-option"}
                key={style.id}
                onClick={() => setSelectedTitleStyleName(style.id)}
                type="button"
              >
                <span className={`style-swatch ${style.previewClass}`}>{style.sample}</span>
                <span>{style.name}</span>
              </button>
            ))}
          </div>
          <p>{selectedTitleStyle.description}</p>
          <code className="json-chip">titleStyle: "{selectedTitleStyle.id}"</code>
        </div>

        <div className="editor-card compact">
          <div className="panel-title">
            <span>MP4出力</span>
            <strong>{renderJobStatus === "success" ? "生成完了" : renderJobStatus === "error" ? "要確認" : isLocalRenderAvailable ? "直接生成" : "半自動MVP"}</strong>
          </div>
          <div className="render-status-list">
            {renderSteps.map((step) => (
              <article className={`is-${step.status}`} key={step.id}>
                <span />
                <strong>{step.label}</strong>
              </article>
            ))}
          </div>
          <button
            className="wide-action-button"
            disabled={hasBlockingQualityError || isRenderRunning || !isLocalRenderAvailable}
            onClick={generateMp4}
            type="button"
          >
            {isRenderRunning ? "MP4生成中..." : hasBlockingQualityError ? "修正後にMP4生成" : isLocalRenderAvailable ? "MP4を生成" : "JSONでMP4生成"}
          </button>
          <div className={`render-job-panel is-${renderJobStatus}`}>
            <strong>
              {renderJobStatus === "idle" && (isLocalRenderAvailable ? "ローカル生成待ち" : "CLI生成待ち")}
              {renderJobStatus === "checking" && "検証中"}
              {renderJobStatus === "rendering" && "フレーム書き出し中"}
              {renderJobStatus === "success" && "MP4出力済み"}
              {renderJobStatus === "error" && "生成停止"}
            </strong>
            {renderJobStatus === "idle" && (
              <p>{isLocalRenderAvailable ? "押すと --check 後にMP4を生成します。" : "本番/previewではCLI手順を使います。"}</p>
            )}
            {renderJobStatus === "rendering" && <p>レイアウト固定、音声生成、MP4結合まで進めています。</p>}
            {renderJobStatus === "success" && renderJobResult && (
              <>
                <p>{renderJobResult.outputPath}</p>
                <dl>
                  <div>
                    <dt>尺</dt>
                    <dd>{renderJobResult.duration.toFixed(1)}秒</dd>
                  </div>
                  <div>
                    <dt>サイズ</dt>
                    <dd>{formatBytes(renderJobResult.size)}</dd>
                  </div>
                </dl>
                <a className="download-link" href={renderJobResult.downloadUrl}>
                  MP4をダウンロード
                </a>
              </>
            )}
            {renderJobStatus === "error" && <p>{renderJobError ?? "MP4生成に失敗しました"}</p>}
          </div>
          <div className="manual-post-list">
            {semiAutoMp4Steps.map((item, index) => (
              <label key={item}>
                <input defaultChecked={index < 2} type="checkbox" />
                {item}
              </label>
            ))}
          </div>
          <code className="json-chip">{expectedMp4Path}</code>
          <p>{isLocalRenderAvailable ? "開発サーバではNodeブリッジ経由でPython/ffmpegを実行します。" : "本番/previewではブラウザからPythonを直接実行しないため、JSONとCLI手順を使います。"}</p>
        </div>

        <div className="editor-card compact">
          <div className="panel-title">
            <span>高速確認</span>
            <strong>{hasBlockingQualityError ? "修正が必要" : "MP4準備OK"}</strong>
          </div>
          <div className="quality-check-list">
            {qualityChecks.map((check) => (
              <article className={`is-${check.status}`} key={check.id}>
                <span>{check.status === "ok" ? "OK" : check.status === "warn" ? "注意" : "停止"}</span>
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.message}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="editor-card compact">
          <div className="panel-title">
            <span>JSON</span>
            <strong>render.py入力</strong>
          </div>
          <code className="json-chip">{renderCommand}</code>
          <button className="wide-action-button secondary" onClick={() => copyText("CLI", renderCommand)} type="button">
            CLIコマンドをコピー
          </button>
          <button className="wide-action-button secondary" onClick={downloadRenderJson} type="button">
            JSONをダウンロード
          </button>
          {copiedLabel === "CLI" && <p className="copy-note">CLIコマンドをコピーしました</p>}
          <pre className="spec-preview">{currentRenderSpecJson}</pre>
        </div>

        <div className="editor-card compact">
          <div className="panel-title">
            <span>JSON</span>
            <strong>UI状態</strong>
          </div>
          <pre className="spec-preview">{currentVideoSpecJson}</pre>
        </div>

        <div className="editor-card compact">
          <div className="panel-title">
            <span>投稿補助</span>
            <strong>チェックリスト</strong>
          </div>
          <div className="manual-post-list">
            {manualPostItems.map((item, index) => (
              <label key={item}>
                <input defaultChecked={index < 1} type="checkbox" />
                {item}
              </label>
            ))}
          </div>
          <div className="post-draft-box">
            <strong>投稿文</strong>
            <p>{postCaption}</p>
            <button className="wide-action-button secondary" onClick={() => copyText("caption", postCaption)} type="button">
              投稿文をコピー
            </button>
            {copiedLabel === "caption" && <span>コピーしました</span>}
          </div>
          <div className="post-draft-box">
            <strong>ハッシュタグ</strong>
            <p>{postHashtags.join(" ")}</p>
            <button className="wide-action-button secondary" onClick={() => copyText("hashtags", postHashtags.join(" "))} type="button">
              ハッシュタグをコピー
            </button>
            {copiedLabel === "hashtags" && <span>コピーしました</span>}
          </div>
        </div>

        <div className="editor-card compact">
          <div className="panel-title">
            <span>生成判断</span>
            <strong>なぜ採用？</strong>
          </div>
          <p>{selected.hook}</p>
          <p>{selected.action}</p>
        </div>

        <div className="editor-card compact learning-card">
          <div className="panel-title">
            <span>次回に反映</span>
            <strong>学習メモ</strong>
          </div>
          <p>タイトルは上げすぎない。説明口調を減らす。天気は普通に言う。</p>
        </div>
      </aside>
    </main>
  );
}
