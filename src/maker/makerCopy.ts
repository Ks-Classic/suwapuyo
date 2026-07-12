import type { MakerCtaType, MakerProblemId } from "./makerTypes";

export const MAKER_COPY = {
  hero: {
    eyebrow: "すわぷよの作り手",
    title: "いい活動が、ちゃんと届く仕組みをつくる",
    lead: "すわぷよは、キャラクターとAI・Webの仕組みを組み合わせてつくった、届く仕組みの制作実例です。",
  },
  origin: {
    title: "すわぷよが生まれた背景",
    body: "「いい活動をしているのに、なかなか届かない」という声から、すわぷよは生まれました。キャラクターの力で覚えてもらうことと、AIの力で運営の負担を減らすことを、両方とも実際に動くかたちにしています。",
    caseTitle: "制作実例：すわぷよ",
    caseBody: "YourTIME.向けに、キャラクターと遊びの体験、LINE連携、当日の会場案内までを一つの仕組みとして設計・実装しました。今あなたが見ているこのページも、その一部です。",
  },
  roles: {
    title: "つくっているのは2人",
    tsunamayo: {
      name: "ツナマヨ（プロフィール確定前の仮表示）",
      role: "キャラクター・世界観づくり",
      body: "「かわいい」で終わらせず、覚えてもらう・伝わる・広まる・続けられるところまでをつなげるキャラクター設計を担当します。",
      items: ["キャラクターデザイン", "世界観づくり", "チラシ・紙面展開", "キャラクターマーケティング"],
    },
    yasu: {
      name: "やす（プロフィール確定前の仮表示）",
      role: "AI・仕組みづくり",
      body: "「何でもできます」ではなく、活動や日々の業務の課題を理解したうえで、必要な仕組みを設計・実装・定着させるところまで担当します。",
      items: ["AI効率化", "AI秘書", "AI勉強会", "AI・Webアプリ開発", "Webサイト制作"],
    },
    note: "アイコン・プロフィール写真・実績は、公開許諾が取れ次第、正式なものに差し替える予定です（現在は仮表示です）。",
  },
  problems: {
    title: "あなたの活動、こんな困りごとはありませんか？",
    help: "気になるものを選ぶと、相談文の下書きをつくれます",
    options: [
      ["recognition", "もっと覚えてもらいたい"],
      ["efficiency", "発信や仕事をラクにしたい"],
      ["experience", "新しい体験をつくりたい"],
    ] as Array<[MakerProblemId, string]>,
  },
} as const;

export const PROBLEM_DRAFT_INTRO: Record<MakerProblemId, string> = {
  recognition: "自分の活動を、もっとお客さんや地域の人に覚えてもらいたいと思っています。",
  efficiency: "発信や日々の業務にかかる時間や手間を、もう少しラクにしたいと思っています。",
  experience: "お客さんに、これまでにない新しい体験を届けたいと思っています。",
};

export const CTA_OPTIONS: Array<[MakerCtaType, string]> = [
  ["ask_general", "自分の活動でできることを聞く"],
  ["talk_after_event", "イベント後に少し話したい"],
  ["see_cases", "まず事例を見たい"],
];

export const CTA_DRAFT_CLOSING: Record<MakerCtaType, string> = {
  ask_general: "すわぷよの事例を見て、自分の活動でどんなことができそうか聞いてみたいです。",
  talk_after_event: "今すぐでなくてよいので、イベントが終わったあとに少しお話できたら嬉しいです。",
  see_cases: "まずはすわぷよ以外の制作実例も、簡単に見せてもらえますか。",
};
