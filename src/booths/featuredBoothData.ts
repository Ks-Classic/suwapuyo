export interface FeaturedBooth {
  id: string;
  name: string;
  organizer: string;
  handle: string;
  category: string;
  summary: string;
  description: string;
  highlights: readonly string[];
  images: readonly string[];
  sourceUrl?: string;
  confirmationNote: string;
}

const COMMON_BOOTH_SLIDES = [
  "/content/02_ユアタイム/03_出展ブース/01_共通案内/01_子どもの困りごと_共通.jpg",
  "/content/02_ユアタイム/03_出展ブース/01_共通案内/02_発達の説明_共通.jpg",
  "/content/02_ユアタイム/03_出展ブース/01_共通案内/03_体験案内_共通.jpg",
  "/content/02_ユアタイム/03_出展ブース/01_共通案内/04_開催情報_共通.jpg",
  "/content/02_ユアタイム/03_出展ブース/01_共通案内/05_予約QR_共通.jpg",
] as const;

export const FEATURED_BOOTHS: readonly FeaturedBooth[] = [
  {
    id: "patakarush",
    name: "PaTaKaRUSH",
    organizer: "Teesmile",
    handle: "@patakarush_official",
    category: "お口・体験",
    summary: "声とお口の動きで挑戦する、世代を超えて楽しめるシューティングゲームです。",
    description: "画面に向かって声を出し、お口を動かしながら高得点を目指す体験です。投稿では子どもから高齢者まで、3世代で楽しむ企画として紹介されています。",
    highlights: ["音声で遊ぶシューティングゲーム", "3世代で挑戦", "イベント開催中の体験内容・予約は要確認"],
    images: ["/content/02_ユアタイム/03_出展ブース/02_パタカラッシュ/01_紹介.jpg", "/content/02_ユアタイム/03_出展ブース/02_パタカラッシュ/02_体験内容.jpg"],
    sourceUrl: "https://www.instagram.com/your_time.niw/p/Dajs5ghie5J/",
    confirmationNote: "デモ表示。画像・ロゴ・紹介文は公開前にTeesmile／YourTIME.運営の許諾と最終確認が必要です。",
  },
  {
    id: "kids-yoga-mami",
    name: "キッズヨガ まみ先生",
    organizer: "キッズヨガ まみ先生",
    handle: "@sumile_kids_yoga",
    category: "親子・からだ",
    summary: "キッズヨガと発達講座を通して、子どもの今を知るヒントに触れられます。",
    description: "投稿では、キッズヨガを3枠、子どもの姿を根っこから理解する発達講座を2枠実施すると紹介されています。具体的な参加年齢、予約、定員、服装などは主催者への確認が必要です。",
    highlights: ["キッズヨガ 10:45／13:30／15:00", "発達講座 12:00／16:00", "料金・予約・持ち物は要確認"],
    images: [
      "/content/02_ユアタイム/03_出展ブース/03_キッズヨガ_まみ先生/01_紹介スライド.jpg",
      "/content/02_ユアタイム/03_出展ブース/03_キッズヨガ_まみ先生/02_紹介スライド.jpg",
      "/content/02_ユアタイム/03_出展ブース/03_キッズヨガ_まみ先生/03_紹介スライド.jpg",
      "/content/02_ユアタイム/03_出展ブース/03_キッズヨガ_まみ先生/04_紹介スライド.jpg",
      ...COMMON_BOOTH_SLIDES,
    ],
    sourceUrl: "https://www.instagram.com/your_time.niw/p/DaWfvQiieTK/",
    confirmationNote: "デモ表示。画像・人物・紹介文、発達や健康に関する表現は公開前に出展者／YourTIME.運営／専門家の確認が必要です。",
  },
  {
    id: "shozankan-mct-keto",
    name: "勝山館 MCT&KETO専門店",
    organizer: "MCT&KETO専門店 勝山館",
    handle: "@shozankancocoil・@asato.s_keto_life",
    category: "食・相談／販売",
    summary: "MCTオイル関連商品を見ながら、使い方などを商品開発者へ質問できます。",
    description: "投稿ではMCTオイル関連商品のYourTIME.限定販売と、商品開発者による質問対応が紹介されています。相談料、予約、具体的な商品価格、在庫、購入制限は記載されていません。",
    highlights: ["MCTオイル関連商品の販売", "商品開発者への質問", "会場価格・在庫・決済方法は要確認"],
    images: [
      "/content/02_ユアタイム/03_出展ブース/04_勝山商店/01_紹介スライド.jpg",
      "/content/02_ユアタイム/03_出展ブース/04_勝山商店/02_紹介スライド.jpg",
      "/content/02_ユアタイム/03_出展ブース/04_勝山商店/03_紹介スライド.jpg",
      "/content/02_ユアタイム/03_出展ブース/04_勝山商店/04_紹介スライド.jpg",
      ...COMMON_BOOTH_SLIDES,
    ],
    sourceUrl: "https://www.instagram.com/your_time.niw/p/DaUy7DhiYXk/",
    confirmationNote: "デモ表示。商品・価格・健康表現・画像・人物・ロゴは公開前に出展者／YourTIME.運営の許諾と確認が必要です。",
  },
];

export function boothHasSnsLink(booth: FeaturedBooth): boolean {
  return typeof booth.sourceUrl === "string" && booth.sourceUrl.trim().length > 0;
}

export function boothThumbnailSrc(booth: FeaturedBooth): string | null {
  return booth.images[0] ?? null;
}

export function matchesBoothSearch(booth: FeaturedBooth, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized === "") return true;
  return booth.name.toLowerCase().includes(normalized) || booth.category.toLowerCase().includes(normalized);
}
