import type { BoothEngagementAction, FeedbackRating } from "./checkinTypes";

export const ENGAGEMENT_OPTIONS: Array<[string, BoothEngagementAction]> = [
  ["説明を聞いた", "heard_explanation"],
  ["体験した", "participated"],
  ["購入した", "purchased"],
  ["まだ見学中", "browsing"],
];

export const RATING_OPTIONS: Array<[string, FeedbackRating]> = [
  ["とても良かった", "great"],
  ["良かった", "good"],
  ["ふつう", "neutral"],
  ["まだわからない", "not_sure"],
];

export const CHECKIN_COPY = {
  entrance: {
    eyebrow: "会場チェックイン",
    heading: "会場にチェックインしよう",
    action: "会場にチェックイン",
    alreadyTitle: "チェックイン済みだよ",
    successTitle: "へようこそ！",
    revealHeading: "きょう限定のなかまが登場！",
    toPlay: "すわぷよで遊ぶ",
    toBooths: "ブースを見つける",
    unknown: "イベントを確認できません",
    unknownNote: "QRのURLを確認してください。",
  },
  booth: {
    gained: "スタンプをゲットしました",
    alreadyGained: "のスタンプはもう持ってるよ",
    milestoneNote: (count: number) => `${count}こスタンプがたまったよ！`,
    engagementQuestion: "ここで何をした？",
    engagementHelp: "複数選べるよ",
    ratingQuestion: "どうだった？（任意）",
    commentLabel: "ひとことを書く（にんい）",
    submit: "回答を送る",
    later: "あとで",
    thanks: "ありがとう！",
    findNext: "次のブースを探す",
    unknown: "ブースを確認できません",
    unknownNote: "QRのURLを確認してください。",
  },
} as const;
