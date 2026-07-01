import type { BoothExhibitor } from "../fuwafuwa-land/map/boothMapData";

export const CONCIERGE_MAP_IMAGE_URL = "/content/yourtime-platform/map/map_sample.jpg";
export const CONCIERGE_RICH_MENU_IMAGE_URL = "/content/yourtime-platform/menu/rich-menu-concierge.png";
export const CONCIERGE_QR_IMAGE_URL = "/content/yourtime-platform/map/qr-demo-01.png";
export const HIDDEN_REWARD_CHARACTER_ID = "sample-kamumu";

// 出展者ごとの正式な対応表がまだ無いため、当面は「どこをタップしても同じサンプル内容が
// 出る」形にしている。位置(mapX/mapY)とthemeColorだけランドごとに変え、地図上の見た目に
// 変化を持たせつつ、内容(name/category/summary/activity/stampEmoji)は統一する。
// 正式データが来たら、この4件の内容だけ差し替えればよい。
const SAMPLE_CONTENT: Pick<BoothExhibitor, "name" | "category" | "summary" | "activity" | "stampEmoji" | "childFriendly" | "ageBands"> = {
  name: "サンプル出展ブース",
  category: "出展者紹介（仮）",
  summary: "実際の出展者情報が決まり次第、ここに差し替わります。",
  activity: "ブースをタップすると、このように紹介カードが開きます。",
  stampEmoji: "✨",
  childFriendly: true,
  ageBands: ["preschool", "elementary", "teen", "adult"],
};

export const DEMO_BOOTHS: BoothExhibitor[] = [
  {
    id: "demo-01",
    boothNo: "01",
    landId: "dental",
    mapX: 59,
    mapY: 41,
    themeColor: "#0f766e",
    ...SAMPLE_CONTENT,
  },
  {
    id: "demo-02",
    boothNo: "02",
    landId: "kids",
    mapX: 36,
    mapY: 57,
    themeColor: "#d7bc3f",
    ...SAMPLE_CONTENT,
  },
  {
    id: "demo-03",
    boothNo: "03",
    landId: "food",
    mapX: 70,
    mapY: 66,
    themeColor: "#d96f5f",
    ...SAMPLE_CONTENT,
  },
  {
    id: "demo-04",
    boothNo: "04",
    landId: "adult",
    mapX: 25,
    mapY: 42,
    themeColor: "#79bd66",
    ...SAMPLE_CONTENT,
  },
];

export const LAND_CAMERA_TARGETS: Record<BoothExhibitor["landId"], { x: number; y: number; scale: number }> = {
  food: { x: 68, y: 64, scale: 2.1 },
  kids: { x: 36, y: 57, scale: 2.2 },
  adult: { x: 25, y: 42, scale: 2.2 },
  dental: { x: 59, y: 41, scale: 2.2 },
};

/**
 * 会場の主要スポット(エリア/ステージ/TIME等)。Googleマップ型に、地図上へラベルで置く。
 * タップすると情報カード(BoothPopup・スタンプCTAなし)が開く。座標は会場図の%。
 * 実データが来たら name/summary を差し替える。
 */
export interface VenuePoi {
  id: string;
  label: string;
  icon: string;
  mapX: number;
  mapY: number;
  themeColor: string;
  category: string;
  summary: string;
  activity: string;
}

export const VENUE_POIS: VenuePoi[] = [
  { id: "poi-reception", label: "受付", icon: "🎫", mapX: 63, mapY: 18, themeColor: "#c0483f", category: "会場入口", summary: "村の入口。ここで受付をして村に入ります。", activity: "まずはここから。地図で気になるブースを探しましょう。" },
  { id: "poi-food", label: "フードエリア", icon: "🍙", mapX: 84, mapY: 18, themeColor: "#f5a623", category: "フード", summary: "会場でひと休みできる食のエリアです。", activity: "親子で立ち寄れるメニューがそろいます。" },
  { id: "poi-coralup", label: "cOral up", icon: "🦷", mapX: 15, mapY: 20, themeColor: "#5bc0eb", category: "出展", summary: "cOral up のエリアです。", activity: "お口の健康について楽しく知れます。" },
  { id: "poi-stage", label: "ステージ", icon: "🎤", mapX: 93, mapY: 55, themeColor: "#f2c94c", category: "ステージ", summary: "催しが行われるステージです。", activity: "タイムテーブルは当日の掲示で。" },
  { id: "poi-engichi", label: "こども縁日", icon: "🎯", mapX: 57, mapY: 37, themeColor: "#fbbf24", category: "縁日・総選挙", summary: "こども縁日・総選挙のエリアです。", activity: "遊びながら楽しめる催しがあります。" },
  { id: "poi-tanupei", label: "たぬぺいTIME.", icon: "⏰", mapX: 57, mapY: 48, themeColor: "#f5d36a", category: "ステージ企画", summary: "たぬぺいTIME. のエリアです。", activity: "村の仲間と楽しむ時間です。" },
  { id: "poi-yagura", label: "やぐら", icon: "🥁", mapX: 57, mapY: 57, themeColor: "#e2685a", category: "中央やぐら", summary: "村の中心のやぐらです。", activity: "みんなが集まる場所です。" },
  { id: "poi-shujinko", label: "こども主人公", icon: "⭐️", mapX: 57, mapY: 70, themeColor: "#f2c94c", category: "こども体験", summary: "こどもが主人公になれるエリアです。", activity: "参加型の体験が待っています。" },
  { id: "poi-rumi-l", label: "RUMI TIME.", icon: "🎪", mapX: 20, mapY: 86, themeColor: "#f2d36f", category: "ステージ企画", summary: "RUMI TIME. のエリアです。", activity: "村のにぎわいスポットです。" },
  { id: "poi-rapiko", label: "ラピ子TIME.", icon: "🎈", mapX: 43, mapY: 86, themeColor: "#f2d36f", category: "ステージ企画", summary: "ラピ子TIME. のエリアです。", activity: "村のにぎわいスポットです。" },
  { id: "poi-rumi-r", label: "RUMI TIME.", icon: "🎪", mapX: 69, mapY: 86, themeColor: "#f2d36f", category: "ステージ企画", summary: "RUMI TIME. のエリアです。", activity: "村のにぎわいスポットです。" },
];
