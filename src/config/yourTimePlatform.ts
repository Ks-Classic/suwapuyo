import type { PuyoType } from "./puyoTypes";

export type YourTimeThemeId = "rest" | "oral" | "mibyo" | "continuity";

export interface YourTimeQuestion {
  id: string;
  label: string;
  options: Array<{
    label: string;
    theme: YourTimeThemeId;
  }>;
}

export interface YourTimeRecommendation {
  title: string;
  kind: "learn" | "meet" | "try";
  description: string;
  reason: string;
}

export interface YourTimeTheme {
  id: YourTimeThemeId;
  puyoType: PuyoType;
  characterName: string;
  themeTitle: string;
  resultCopy: string;
  weeklyAction: string;
  recommendations: YourTimeRecommendation[];
}

export interface YourTimeEventLink {
  title: string;
  href: string;
  description: string;
}

export const YOUR_TIME_QUESTIONS: YourTimeQuestion[] = [
  {
    id: "curiosity",
    label: "今日、親子で一番気になったことは？",
    options: [
      { label: "よく眠る・休むこと", theme: "rest" },
      { label: "歯や口から健康を考えること", theme: "oral" },
      { label: "小さな身体のサインに気づくこと", theme: "mibyo" },
      { label: "健康を無理なく続けること", theme: "continuity" },
    ],
  },
  {
    id: "home-action",
    label: "今週、家で一番やってみやすそうなのは？",
    options: [
      { label: "寝る前に親子で深呼吸する", theme: "rest" },
      { label: "歯みがき中に口の中を観察する", theme: "oral" },
      { label: "疲れやすさや姿勢を少し見る", theme: "mibyo" },
      { label: "家族で健康の約束を1つ決める", theme: "continuity" },
    ],
  },
  {
    id: "next-entrance",
    label: "イベント後に知れたら嬉しい入口は？",
    options: [
      { label: "睡眠・呼吸・リラックスの動画", theme: "rest" },
      { label: "口腔ケアや笑顔の専門家", theme: "oral" },
      { label: "未病や予防のやさしい解説", theme: "mibyo" },
      { label: "続けるコツや地域のつながり", theme: "continuity" },
    ],
  },
];

export const YOUR_TIME_THEMES: Record<YourTimeThemeId, YourTimeTheme> = {
  rest: {
    id: "rest",
    puyoType: "blob",
    characterName: "すーすー",
    themeTitle: "休む力を育てる親子",
    resultCopy:
      "今日の親子テーマは、眠る・休む・ゆるむこと。身体をがんばらせる前に、回復する力に気づけると毎日が少し軽くなります。",
    weeklyAction: "寝る前に30秒だけ、親子で一緒にゆっくり息を吐く。",
    recommendations: [
      {
        title: "すーすーの夜じかん動画",
        kind: "learn",
        description: "寝る前に親子で見られる短い呼吸・休息コンテンツ。",
        reason: "休息への関心が高い親子の入口になるため。",
      },
      {
        title: "からだをゆるめる体験ブース",
        kind: "meet",
        description: "姿勢・呼吸・リラックスを扱う出展者とつながる。",
        reason: "会場で回れなかった体験をイベント後に思い出せるため。",
      },
      {
        title: "おやすみ前の親子クエスト",
        kind: "try",
        description: "1週間だけ、寝る前の小さな習慣に挑戦する。",
        reason: "知識を家庭の行動に変えやすいため。",
      },
    ],
  },
  oral: {
    id: "oral",
    puyoType: "tooth",
    characterName: "わーわー",
    themeTitle: "口から元気を広げる親子",
    resultCopy:
      "今日の親子テーマは、歯・口・笑顔・会話。口の中は、健康を親子で観察しやすい身近な入口です。",
    weeklyAction: "歯みがきのあと、親子で今日の口の中を10秒だけ見る。",
    recommendations: [
      {
        title: "わーわーの口育ミニ講座",
        kind: "learn",
        description: "歯や口を楽しく学べるショート動画・投稿。",
        reason: "口腔テーマへの関心を家庭で続けやすいため。",
      },
      {
        title: "歯科・口腔ケアの相談入口",
        kind: "meet",
        description: "YOUR TIME出展者の中から口腔ケアの案内人を紹介。",
        reason: "専門家との接点が自然に生まれるため。",
      },
      {
        title: "親子スマイル観察",
        kind: "try",
        description: "笑顔・噛む・話すを親子で観察する小さな遊び。",
        reason: "医療を怖くせず、会話から始められるため。",
      },
    ],
  },
  mibyo: {
    id: "mibyo",
    puyoType: "ghost",
    characterName: "わのの",
    themeTitle: "小さなサインに気づく親子",
    resultCopy:
      "今日の親子テーマは、未病と予防。まだ病気ではない小さな違和感に気づくことが、未来の健康を守る第一歩です。",
    weeklyAction: "今日の元気度を、親子で1から5の数字にして話す。",
    recommendations: [
      {
        title: "わののの未病ものがたり",
        kind: "learn",
        description: "未病を親子で理解できるやさしい発信コンテンツ。",
        reason: "難しい概念をキャラクターで受け取りやすくするため。",
      },
      {
        title: "身体のサインを見つけるブース",
        kind: "meet",
        description: "測定・姿勢・食・予防に関わる出展者への入口。",
        reason: "気づきを具体的な相談先につなげられるため。",
      },
      {
        title: "親子げんきメモ",
        kind: "try",
        description: "1週間だけ、寝起き・食欲・気分を軽く記録する。",
        reason: "無意識だった変化を見える化できるため。",
      },
    ],
  },
  continuity: {
    id: "continuity",
    puyoType: "tanuki",
    characterName: "たぬぺい",
    themeTitle: "健康を続ける親子",
    resultCopy:
      "今日の親子テーマは、続ける仕組み。健康は正しさだけでは続きません。楽しいこと、家族の会話、地域のつながりが力になります。",
    weeklyAction: "家族で今週の健康コインを1つ決めて、できたら丸をつける。",
    recommendations: [
      {
        title: "たぬぺいの続けるコツ",
        kind: "learn",
        description: "親子の習慣化を助ける短い投稿・動画。",
        reason: "イベント後の行動を無理なく続けるため。",
      },
      {
        title: "地域で続く健康の案内人",
        kind: "meet",
        description: "継続支援やコミュニティに関わる出展者への入口。",
        reason: "一度きりの体験を関係性に変えられるため。",
      },
      {
        title: "親子ヘルスコイン",
        kind: "try",
        description: "できた行動を小さく貯める家庭向けミッション。",
        reason: "達成感を使って健康行動を続けやすくするため。",
      },
    ],
  },
};

export const YOUR_TIME_EVENT_LINKS: YourTimeEventLink[] = [
  {
    title: "YOUR TIME公式Instagram",
    href: "https://www.instagram.com/your_time.niw/",
    description:
      "イベント後に親子で見返せる公式発信。次回開催や出展者紹介への入口。",
  },
  {
    title: "鹿児島回サンプル投稿 1",
    href: "https://www.instagram.com/p/DT93hpylDDr/",
    description:
      "参加した回の空気をあとで思い出すための入口。内容は諏訪さん確認後に差し替える。",
  },
  {
    title: "鹿児島回サンプル投稿 2",
    href: "https://www.instagram.com/p/DVSDWXlktkA/?img_index=2",
    description:
      "出展ブースや当日の雰囲気をあとで見返すためのサンプル導線。",
  },
  {
    title: "鹿児島回サンプル投稿 3",
    href: "https://www.instagram.com/p/DVMtfeekpIO/?img_index=2",
    description:
      "親子が回りきれなかった出展者に自然に再接続するためのサンプル導線。",
  },
  {
    title: "鹿児島回サンプル投稿 4",
    href: "https://www.instagram.com/p/DVJcD00Ep59/?img_index=4",
    description:
      "会場後の振り返りから公式発信・出展者紹介へつなげるサンプル導線。",
  },
  {
    title: "Oral Village / YOUR TIME公式導線",
    href: "https://linktr.ee/oral_village",
    description:
      "公式SNS、チケット、諏訪さん発信などへ迷わず戻れるための入口。",
  },
];
