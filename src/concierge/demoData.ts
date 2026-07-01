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
