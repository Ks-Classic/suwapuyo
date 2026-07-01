export type MapLandId = "food" | "kids" | "adult" | "dental";
export type ChildAgeBand = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7-9" | "10-12" | "13+";
export type AgeBand = "preschool" | "elementary" | "teen" | "adult";
export type VisitDepth = "visited" | "explained" | "experienced";
export type VisitorType = "family" | "with_kids" | "solo" | "other";
export type ChildGender = "boy" | "girl" | "other";
export type AcquisitionSource = "instagram" | "friend" | "exhibitor" | "official" | "walk_in" | "other";

export interface ChildInfo {
  age_band: ChildAgeBand;
  gender: ChildGender;
}

export interface BoothMapLand {
  id: MapLandId;
  label: string;
  shortLabel: string;
  themeColor: string;
  description: string;
}

export interface BoothExhibitor {
  id: string;
  boothNo: string;
  landId: MapLandId;
  name: string;
  category: string;
  summary: string;
  activity: string;
  logoUrl?: string;
  mapX: number;
  mapY: number;
  ctaUrl?: string;
  childFriendly?: boolean;
  ageBands?: AgeBand[];
  stampAssetUrl?: string;
  mediaUrl?: string;
  themeColor?: string;
  stampEmoji?: string;
}

export const BOOTH_MAP_LANDS: BoothMapLand[] = [
  {
    id: "food",
    label: "フードランド",
    shortLabel: "フード",
    themeColor: "#d96f5f",
    description: "食の体験や、おいしい出会いをめぐるエリアです。",
  },
  {
    id: "kids",
    label: "キッズランド",
    shortLabel: "キッズ",
    themeColor: "#d7bc3f",
    description: "親子で遊びながら、からだや学びに触れられるエリアです。",
  },
  {
    id: "adult",
    label: "アダルトランド",
    shortLabel: "アダルト",
    themeColor: "#79bd66",
    description: "大人のからだと暮らしを整えるヒントに出会うエリアです。",
  },
  {
    id: "dental",
    label: "デンタルランド",
    shortLabel: "デンタル",
    themeColor: "#69bdb5",
    description: "お口や姿勢、健康チェックを楽しく知るエリアです。",
  },
];

export const BOOTH_EXHIBITORS: BoothExhibitor[] = [
  {
    id: "trim",
    boothNo: "1",
    landId: "food",
    name: "TRIM",
    category: "整水器",
    summary: "カラダに良いことを、水から考えるブースです。",
    activity: "水と暮らしの関わりを、展示でわかりやすく紹介します。",
    mapX: 18,
    mapY: 18,
  },
  {
    id: "kokoku",
    boothNo: "2",
    landId: "food",
    name: "ここく",
    category: "フード",
    summary: "素材のおいしさを楽しめる食のブースです。",
    activity: "親子で気軽に立ち寄れるフード体験を用意しています。",
    mapX: 34,
    mapY: 18,
  },
  {
    id: "yama-shita",
    boothNo: "2",
    landId: "food",
    name: "山下食堂",
    category: "フード",
    summary: "会場でほっとできる食事を届けるブースです。",
    activity: "食べる時間もイベントの楽しみになるメニューを紹介します。",
    mapX: 50,
    mapY: 18,
  },
  {
    id: "ichigo",
    boothNo: "4",
    landId: "food",
    name: "いちその整骨院",
    category: "からだケア",
    summary: "からだの使い方を見直すきっかけになるブースです。",
    activity: "無理なく続けやすいケアの考え方を紹介します。",
    mapX: 72,
    mapY: 22,
  },
  {
    id: "halta",
    boothNo: "5",
    landId: "food",
    name: "スーパーハルタ",
    category: "予防医学",
    summary: "食と健康を楽しく知るためのブースです。",
    activity: "親子で見て、話して、暮らしに持ち帰れるヒントを紹介します。",
    mapX: 26,
    mapY: 40,
  },
  {
    id: "ninniku",
    boothNo: "7",
    landId: "food",
    name: "ガーリックラボ",
    category: "体験",
    summary: "にんにくをテーマにした食の体験ブースです。",
    activity: "香りや味を楽しみながら、食への興味を広げます。",
    mapX: 72,
    mapY: 42,
  },
  {
    id: "swell-up",
    boothNo: "8",
    landId: "kids",
    name: "お口と姿勢チェックブース",
    category: "お口・姿勢",
    summary: "お口と姿勢の気づきを親子で得られるブースです。",
    activity: "見て、試して、日々の姿勢やお口への関心を持つきっかけを作ります。",
    mapX: 18,
    mapY: 24,
  },
  {
    id: "nursery",
    boothNo: "9",
    landId: "kids",
    name: "ぱるーん保育園・ちっちゃな保育園",
    category: "保育",
    summary: "親子に寄り添う保育の情報に触れられるブースです。",
    activity: "子育ての相談先や地域のつながりを紹介します。",
    mapX: 38,
    mapY: 24,
  },
  {
    id: "midwife",
    boothNo: "11",
    landId: "kids",
    name: "ふわり助産院",
    category: "育児相談",
    summary: "親子の不安や疑問に寄り添う相談ブースです。",
    activity: "授乳や育児、親子の暮らしについて話せる場を用意します。",
    mapX: 18,
    mapY: 45,
  },
  {
    id: "cat",
    boothNo: "15",
    landId: "kids",
    name: "くらトレゲーム「バタカラッシュ」",
    category: "ゲーム",
    summary: "遊びながらお口まわりに意識を向けるゲームブースです。",
    activity: "親子でチャレンジしながら、楽しくからだを動かします。",
    mapX: 54,
    mapY: 45,
  },
  {
    id: "kaigo",
    boothNo: "28",
    landId: "kids",
    name: "スポーツと勉強・遊びを企画する！",
    category: "体験",
    summary: "からだを動かす楽しさを広げるブースです。",
    activity: "遊びや学びにつながる体験を紹介します。",
    mapX: 33,
    mapY: 74,
  },
  {
    id: "sanga",
    boothNo: "35",
    landId: "kids",
    name: "ツナマヨの缶詰",
    category: "デザイン",
    summary: "親子で楽しめるデザインや表現に触れるブースです。",
    activity: "見る、選ぶ、話すきっかけになる展示を用意します。",
    mapX: 70,
    mapY: 82,
  },
  {
    id: "maeoya",
    boothNo: "10",
    landId: "adult",
    name: "助産師のおへや",
    category: "離乳食相談",
    summary: "親子の食事や育児の気づきを相談できるブースです。",
    activity: "日々の不安を話しながら、家庭に合う考え方を探します。",
    mapX: 34,
    mapY: 24,
  },
  {
    id: "maat",
    boothNo: "12",
    landId: "adult",
    name: "Maat aroma",
    category: "アロマ",
    summary: "香りを通して暮らしを整えるヒントを紹介するブースです。",
    activity: "香りの楽しみ方や、リラックスの時間づくりに触れられます。",
    mapX: 18,
    mapY: 42,
  },
  {
    id: "matsubara",
    boothNo: "13",
    landId: "adult",
    name: "産後親子の体ケア",
    category: "骨盤ケア",
    summary: "産後のからだを見つめるきっかけになるブースです。",
    activity: "無理のないセルフケアや相談先の情報を紹介します。",
    mapX: 39,
    mapY: 42,
  },
  {
    id: "yasaiya",
    boothNo: "16",
    landId: "adult",
    name: "野菜屋と血流であそぶの会",
    category: "血流",
    summary: "野菜や血流をテーマに、からだを知るブースです。",
    activity: "見て試せる体験で、毎日の選び方を考えるきっかけを作ります。",
    mapX: 64,
    mapY: 43,
  },
  {
    id: "sanki",
    boothNo: "21",
    landId: "adult",
    name: "森の休憩室",
    category: "休憩",
    summary: "会場でひと息つける休憩ブースです。",
    activity: "親子で落ち着ける時間と、暮らしの情報に触れられます。",
    mapX: 24,
    mapY: 61,
  },
  {
    id: "synapse",
    boothNo: "23",
    landId: "adult",
    name: "シナプス療法",
    category: "からだケア",
    summary: "からだの状態に気づくきっかけを届けるブースです。",
    activity: "体験を通して、自分のからだへの関心を深めます。",
    mapX: 51,
    mapY: 63,
  },
  {
    id: "swell-dental",
    boothNo: "8",
    landId: "dental",
    name: "お口と姿勢チェックブース",
    category: "お口・姿勢",
    summary: "お口と姿勢について親子で楽しく知るブースです。",
    activity: "日々の姿勢やお口の使い方への気づきを持ち帰れます。",
    mapX: 18,
    mapY: 24,
  },
  {
    id: "jita",
    boothNo: "17",
    landId: "dental",
    name: "落ちベロチェック",
    category: "お口チェック",
    summary: "お口の状態に楽しく関心を持つためのブースです。",
    activity: "見た目だけでは分かりにくいお口の動きを、やさしく紹介します。",
    mapX: 38,
    mapY: 45,
  },
  {
    id: "oradia",
    boothNo: "18",
    landId: "dental",
    name: "OraDia x アークレイ",
    category: "お口ラボ",
    summary: "つながるお口発見ラボとして、お口の情報を紹介します。",
    activity: "親子で話しながら、お口への関心を広げる展示です。",
    mapX: 56,
    mapY: 45,
  },
  {
    id: "dolomt",
    boothNo: "29",
    landId: "dental",
    name: "ロクローの大ぼうけん",
    category: "体験",
    summary: "お口や健康をテーマにした親子向け体験ブースです。",
    activity: "物語に触れるように、健康への興味を育てます。",
    mapX: 31,
    mapY: 72,
  },
  {
    id: "cerec",
    boothNo: "30",
    landId: "dental",
    name: "機械で歯作り体験コーナー",
    category: "歯科技工",
    summary: "歯づくりの世界を見て知る体験ブースです。",
    activity: "機械や道具に触れながら、歯科の仕事を身近に感じられます。",
    mapX: 50,
    mapY: 72,
  },
  {
    id: "sato-dental",
    boothNo: "33",
    landId: "dental",
    name: "さとう歯科医院",
    category: "歯科",
    summary: "親子のお口の健康について考えるきっかけになるブースです。",
    activity: "子どものお口について、やさしく知れる情報を紹介します。",
    mapX: 69,
    mapY: 77,
  },
  {
    id: "matsukaze",
    boothNo: "34",
    landId: "dental",
    name: "株式会社 松風",
    category: "歯科材料",
    summary: "歯を支える材料や技術に触れられるブースです。",
    activity: "歯科の道具やものづくりを、親子で見て楽しめます。",
    mapX: 83,
    mapY: 77,
  },
];

