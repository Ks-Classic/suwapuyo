/**
 * 出展者向けレポートのデータモデル。
 *
 * 元データは現行イベント導線で集める3種：
 *   1. 来場者アンケート（家族構成・子ども年齢/性別・大人数・認知経路・健康関係者か）
 *   2. ブース来訪のタイムスタンプ（`ConciergeStamp.created_at`）
 *   3. 関与の深さタップ（寄っただけ / 説明きいた / 体験した = VisitDepth）
 *
 * このファイルは「集計済みモデル」。実データ接続時は Supabase 集計クエリの結果を
 * この型に流し込めば、UIはそのまま使える（表示は集計値にしか依存しない）。
 * 現状はデモ用に1ブース分のリアルな集計を手置きしている。
 */

import type { AcquisitionSource, VisitorType } from "../fuwafuwa-land/map/boothMapData";

export const MIN_REPORT_CELL_SIZE = 5;

export function isSuppressedAggregate(value: number): boolean {
  return value > 0 && value < MIN_REPORT_CELL_SIZE;
}

export function formatAggregateCount(value: number): string {
  return isSuppressedAggregate(value) ? `${MIN_REPORT_CELL_SIZE}未満` : String(value);
}

export interface DepthBreakdown {
  visited: number; // 寄っただけ
  explained: number; // 説明きいた
  experienced: number; // 体験した
}

export interface HourBucket {
  hour: number; // 10..17
  count: number;
}

/** 年齢帯 × 深さ のコホート（どの層が体験まで到達したか）。ageLabel はグループ化した表示帯 */
export interface AgeCohortRow {
  ageLabel: string;
  depth: DepthBreakdown;
}

export interface ReportInsight {
  id: string;
  kind: "win" | "lead" | "timing" | "watch";
  headline: string;
  detail: string;
}

/**
 * チェックイン・ブーススタンプ（`07_初回登録・チェックイン・ブーススタンプ設計.md`）の仮集計。
 * `uniqueVisitors` はブースQR読取＋確定操作で記録した「訪問した」実人数（証跡＝QR読取）。
 * `selfReported` は来場者のワンタップ申告（複数選択可・自己申告）で、事実認定や確定売上ではない。
 * この2つは仕様上つねに別集計として扱い、UIでも混同しない。
 */
export interface CheckinEngagementTotals {
  heardExplanation: number;
  participated: number;
  purchased: number;
  browsing: number;
}

export interface CheckinRatingTotals {
  great: number;
  good: number;
  neutral: number;
  notSure: number;
}

export interface CheckinReportSection {
  uniqueVisitors: number;
  selfReported: CheckinEngagementTotals;
  ratingRespondents: number;
  rating: CheckinRatingTotals;
}

export const CHECKIN_ENGAGEMENT_META: Record<keyof CheckinEngagementTotals, { label: string; color: string }> = {
  heardExplanation: { label: "説明を聞いた", color: "var(--color-blue)" },
  participated: { label: "体験した", color: "var(--color-accent)" },
  purchased: { label: "購入した", color: "var(--color-pink)" },
  browsing: { label: "まだ見学中", color: "var(--color-text-muted)" },
};

export const CHECKIN_RATING_META: Record<keyof CheckinRatingTotals, { label: string }> = {
  great: { label: "とても良かった" },
  good: { label: "良かった" },
  neutral: { label: "ふつう" },
  notSure: { label: "まだわからない" },
};

export function selfReportRate(count: number, uniqueVisitors: number): number {
  return uniqueVisitors === 0 ? 0 : count / uniqueVisitors;
}

export interface ExhibitorReport {
  /** UI上でも必ず区別する。Phase 1 fixture は demo 固定。 */
  dataMode: "demo" | "test" | "live";
  exhibitor: {
    name: string;
    boothNo: string;
    category: string;
    themeColor: string;
    mascotImage: string;
  };
  event: {
    title: string;
    dateLabel: string;
    generatedLabel: string;
  };
  totals: {
    uniqueVisitors: number; // このブースにスタンプした実人数
    stampScans: number; // スタンプ総数（再訪含む）
    detailViews: number; // ブース詳細を開いた集計回数
    ctaClicks: number; // 外部CTAを押した集計回数
    depth: DepthBreakdown;
  };
  benchmark: {
    // 会場全ブース平均との比較（pt = パーセンテージポイント）
    venueExperiencedRate: number; // 会場平均の体験率
    boothExperiencedRate: number; // このブースの体験率
  };
  audience: {
    visitorType: Record<VisitorType, number>;
    childAge: Array<{ ageBand: string; count: number }>;
    acquisition: Array<{ source: AcquisitionSource; count: number }>;
  };
  timeline: HourBucket[];
  cohort: AgeCohortRow[];
  insights: ReportInsight[];
  checkin: CheckinReportSection;
}

export const DEPTH_META: Record<keyof DepthBreakdown, { label: string; short: string; color: string; marker: string }> = {
  visited: { label: "寄っただけ", short: "であった", color: "var(--color-blue)", marker: "1" },
  explained: { label: "説明きいた", short: "はなした", color: "var(--color-accent)", marker: "2" },
  experienced: { label: "体験した", short: "たいけん", color: "var(--color-green)", marker: "3" },
};

/**
 * 深さ3段の「中身」＝各タップが何を意味し、出展者が次に何をすべきか。
 * これがレポートの核（単なる人数でなく、寄った/聞いた/体験した の解釈と打ち手）。
 */
export const DEPTH_DETAIL: Record<
  keyof DepthBreakdown,
  { definition: string; meaning: string; action: string; topSegment: string }
> = {
  visited: {
    definition: "ブースのQRは押したが、説明・体験までは進まなかった。",
    meaning: "QR接点はあり、説明・体験の記録はない層。理由まではこの集計から判断できません。",
    action: "入口の一言POP・15秒の即体験で「説明きいた」へ引き上げる。",
    topSegment: "通りがかり／6歳以上が多め",
  },
  explained: {
    definition: "スタッフの説明を受けた。あと一歩で体験まで届く関心層。",
    meaning: "説明の記録があり、体験の記録はない層。導線変更を試す候補です。",
    action: "説明の締めに必ず体験へ誘導。待ち時間を作らない配置に。",
    topSegment: "3〜5歳連れの家族",
  },
  experienced: {
    definition: "実際に体験したことが記録された接点。",
    meaning: "案内から体験まで導線がつながった層。満足度や将来行動を断定する値ではありません。",
    action: "体験直後に、希望する方が次の案内へ進める導線を用意する。",
    topSegment: "3〜5歳連れ",
  },
};

export const VISITOR_TYPE_META: Record<VisitorType, { label: string; color: string }> = {
  family: { label: "家族", color: "var(--color-accent)" },
  with_kids: { label: "子ども連れ", color: "var(--color-pink)" },
  solo: { label: "ひとり", color: "var(--color-blue)" },
  other: { label: "その他", color: "var(--color-text-muted)" },
};

export const ACQUISITION_META: Record<AcquisitionSource, string> = {
  instagram: "Instagram / SNS",
  friend: "知人・友人",
  exhibitor: "出展者から",
  official: "YourTIME公式",
  walk_in: "通りがかり",
  other: "その他",
};

export function experiencedRate(depth: DepthBreakdown): number {
  const total = depth.visited + depth.explained + depth.experienced;
  return total === 0 ? 0 : depth.experienced / total;
}

/**
 * デモ用の1ブース分レポート。歯科（お口の健康）ブースを想定＝子ども年齢の分布と
 * 「体験まで到達したか」が出展者にとって最重要、という物語が立つ題材。
 * 色は世界観ガイドライン（`06`）のパレット内から（ティール禁止）。
 */
export const DEMO_REPORT: ExhibitorReport = {
  dataMode: "demo",
  exhibitor: {
    name: "cOral up ｜ お口の健康ブース",
    boothNo: "01",
    category: "歯・お口の健康",
    themeColor: "var(--color-accent)",
    mascotImage: "/content/01_すわぷよ/01_キャラクター/02_表示用/22_歯医者のごりさん.png",
  },
  event: {
    title: "YourTIME 2026",
    dateLabel: "2026.08.02（土）",
    generatedLabel: "2026.08.03 09:12 自動生成",
  },
  totals: {
    uniqueVisitors: 137,
    stampScans: 152,
    detailViews: 94,
    ctaClicks: 18,
    depth: { visited: 58, explained: 47, experienced: 32 },
  },
  benchmark: {
    venueExperiencedRate: 0.18,
    boothExperiencedRate: 32 / 137,
  },
  audience: {
    visitorType: { family: 71, with_kids: 39, solo: 21, other: 6 },
    childAge: [
      { ageBand: "0〜2", count: 29 },
      { ageBand: "3〜6", count: 78 },
      { ageBand: "7〜9", count: 15 },
      { ageBand: "10以上", count: 10 },
    ],
    acquisition: [
      { source: "instagram", count: 44 },
      { source: "friend", count: 33 },
      { source: "official", count: 26 },
      { source: "exhibitor", count: 18 },
      { source: "walk_in", count: 12 },
      { source: "other", count: 4 },
    ],
  },
  timeline: [
    { hour: 10, count: 11 },
    { hour: 11, count: 18 },
    { hour: 12, count: 14 },
    { hour: 13, count: 21 },
    { hour: 14, count: 29 },
    { hour: 15, count: 24 },
    { hour: 16, count: 20 },
    { hour: 17, count: 15 },
  ],
  cohort: [
    { ageLabel: "0〜2歳", depth: { visited: 12, explained: 9, experienced: 4 } },
    { ageLabel: "3〜5歳", depth: { visited: 18, explained: 21, experienced: 19 } },
    { ageLabel: "6〜9歳", depth: { visited: 14, explained: 11, experienced: 7 } },
    { ageLabel: "10歳〜", depth: { visited: 9, explained: 4, experienced: 2 } },
  ],
  checkin: {
    uniqueVisitors: 137,
    selfReported: { heardExplanation: 51, participated: 34, purchased: 9, browsing: 21 },
    ratingRespondents: 44,
    rating: { great: 19, good: 16, neutral: 7, notSure: 2 },
  },
  insights: [
    {
      id: "ins-win",
      kind: "win",
      headline: "3〜5歳帯で体験記録の割合が高い",
      detail:
        "このデモ集計では、3〜5歳帯の体験記録割合が他の年齢帯より高くなっています。次回はこの層向けの導線を試し、同じ条件で差を確認します。",
    },
    {
      id: "ins-action",
      kind: "lead",
      headline: "詳細94件からCTA18件へ進みました",
      detail:
        "ブース詳細から外部CTAへ進んだ集計結果です。次回はCTA文言と設置位置を変え、同じ計測条件で差を確認します。",
    },
    {
      id: "ins-timing",
      kind: "timing",
      headline: "ピークは14:00–15:00",
      detail:
        "来訪と体験が14時台に最も集中。次回はこの時間帯に説明スタッフを厚く配置し、待ち時間による離脱（＝寄っただけ止まり）を防ぐと体験率がさらに伸びます。",
    },
  ],
};
