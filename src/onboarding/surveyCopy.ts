import type { ChildGender, PreferredActivity, PrimaryPlayer } from "../shared/mvpTypes";

export const SURVEY_COPY = {
  intro: {
    title: "みんなで遊びやすくするために",
    body: "遊ぶお子さんの生まれた年月、性別、遊んだ記録を保存します。年齢に合わせた表示、サービスの改善、利用傾向の集計と分析に使います。",
    note: "登録した情報は、あとから確認・変更・削除できます。",
    accept: "内容を確認してはじめる",
    skip: "今はやめておく",
  },
  player: {
    question: "今日はだれが遊ぶ？",
    help: "遊ぶ人に合わせて、見せ方を整えるよ",
    options: [
      ["子ども", "child"],
      ["子どもと大人", "child_and_adult"],
      ["大人", "adult"],
    ] as Array<[string, PrimaryPlayer]>,
  },
  birth: {
    title: "お子さんについて教えてね",
    help: "ひとりずつ、遊びやすい表示に整えます",
    privacy: "生まれた年月と性別は保存され、あとから変更・削除できます。",
  },
  gender: {
    options: [
      ["女の子", "female"],
      ["男の子", "male"],
      ["その他", "other"],
      ["答えたくない", "prefer_not_to_say"],
    ] as Array<[string, ChildGender]>,
  },
  activity: {
    question: "体操はどれから遊ぶ？",
    options: [
      ["お口あそび", "mouth"],
      ["からだあそび", "body"],
      ["おまかせ", "random"],
      ["あとで選ぶ", "unanswered"],
    ] as Array<[string, PreferredActivity]>,
  },
  complete: {
    title: "遊ぶ準備ができたよ！",
    action: "すわぷよで遊ぶ",
  },
} as const;

export const AGE_BAND_LABELS = {
  "0_2": "0〜2歳",
  "3_6": "3〜6歳",
  "7_9": "7〜9歳",
  "10_12": "10〜12歳",
  "13_plus": "13歳以上",
  unanswered: "年齢を選ばない",
} as const;
