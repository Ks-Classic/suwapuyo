import type { AcquisitionSource, ChildAgeBand, ChildCountBand, ChildGender, CountBand, HealthWorkAnswer } from "../shared/mvpTypes";

export const SURVEY_COPY = {
  intro: {
    title: "村のなかまを教えて",
    body: "答えは、村のなかまを増やし、イベントをもっとよくするための集計に使います。答えなくても遊べます。",
    accept: "教えてあげる",
    skip: "あとで",
  },
  party: {
    speaker: "わーわー",
    question: "きょうは だれといっしょ？",
    help: "きょうの なかまを おしえてね",
    options: ["かぞく", "おやこ", "ひとり"],
  },
  adults: {
    question: "おとなは なんにん？",
    help: "だいたいで だいじょうぶ",
    options: [
      ["1人", "1"], ["2人", "2"], ["3人以上", "3_plus"], ["答えない", "unanswered"],
    ] as Array<[string, CountBand]>,
  },
  children: {
    question: "こどもは なんにん？",
    help: "だいたいで だいじょうぶ",
    options: [
      ["いない", "0"], ["1人", "1"], ["2人", "2"], ["3人以上", "3_plus"], ["答えない", "unanswered"],
    ] as Array<[string, ChildCountBand]>,
  },
  age: {
    question: "こどもは いくつくらい？",
    options: [
      ["0〜2才", "0_2"], ["3〜6才", "3_6"], ["7〜9才", "7_9"], ["10〜12才", "10_12"], ["13才以上", "13_plus"], ["答えない", "unanswered"],
    ] as Array<[string, ChildAgeBand]>,
  },
  gender: {
    help: "こたえられたら おしえてね",
    options: [["おとこのこ", "male"], ["おんなのこ", "female"], ["答えない", "unanswered"]] as Array<[string, ChildGender]>,
  },
  source: {
    question: "すわぷよを なにで知った？",
    options: [
      ["Instagram", "instagram"], ["家族・友だちの紹介", "friend"], ["出展者から", "exhibitor"], ["YourTIME公式", "official"], ["会場で見つけた", "walk_in"], ["その他", "other"], ["答えない", "unanswered"],
    ] as Array<[string, AcquisitionSource]>,
  },
  health: {
    lead: "おうちの方に しつもんです",
    question: "医療・健康にかかわる お仕事をしていますか？",
    options: [["はい", "yes"], ["いいえ", "no"], ["答えない", "unanswered"]] as Array<[string, HealthWorkAnswer]>,
  },
  complete: {
    title: "おしえてくれて ありがとう！",
    body: "村のなかまたちが やってきたよ",
    action: "なかまに会いにいく",
  },
} as const;

export const DEMO_INTERESTS = ["お口", "からだ", "親子", "食事", "遊び", "その他"] as const;
