/**
 * 出展者向けレポートのデータモデル。
 *
 * 元データは村の案内所（`/concierge`）で集めた3種：
 *   1. 来場者アンケート（家族構成・子ども年齢/性別・大人数・認知経路・健康関係者か）
 *   2. ブース来訪のタイムスタンプ（`ConciergeStamp.created_at`）
 *   3. 関与の深さタップ（寄っただけ / 説明きいた / 体験した = VisitDepth）
 *
 * このファイルは「集計済みモデル」。実データ接続時は Supabase 集計クエリの結果を
 * この型に流し込めば、UIはそのまま使える（表示は集計値にしか依存しない）。
 * 現状はデモ用に1ブース分のリアルな集計を手置きしている。
 */

import type { AcquisitionSource, ChildAgeBand, VisitDepth, VisitorType } from "../fuwafuwa-land/map/boothMapData";

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

export interface ExhibitorReport {
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
    depth: DepthBreakdown;
  };
  benchmark: {
    // 会場全ブース平均との比較（pt = パーセンテージポイント）
    venueExperiencedRate: number; // 会場平均の体験率
    boothExperiencedRate: number; // このブースの体験率
    venueEngagementAvg: number; // 会場平均エンゲージ（1〜3）
    boothEngagementAvg: number; // このブースのエンゲージ（1〜3）
    rankLabel: string; // 例 "全24ブース中 3位"
  };
  audience: {
    visitorType: Record<VisitorType, number>;
    childAge: Array<{ ageBand: ChildAgeBand; count: number }>;
    acquisition: Array<{ source: AcquisitionSource; count: number }>;
    healthProCount: number; // 医療・健康関係者（BtoBリード見込み）
  };
  timeline: HourBucket[];
  cohort: AgeCohortRow[];
  insights: ReportInsight[];
}

export const DEPTH_META: Record<keyof DepthBreakdown, { label: string; short: string; color: string; icon: string }> = {
  visited: { label: "寄っただけ", short: "であった", color: "var(--color-blue)", icon: "🚶" },
  explained: { label: "説明きいた", short: "はなした", color: "var(--color-accent)", icon: "👂" },
  experienced: { label: "体験した", short: "たいけん", color: "var(--color-green)", icon: "✨" },
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
    meaning: "認知は取れているが接点は浅い層。＝次回の最大の伸びしろ。",
    action: "入口の一言POP・15秒の即体験で「説明きいた」へ引き上げる。",
    topSegment: "通りがかり／6歳以上が多め",
  },
  explained: {
    definition: "スタッフの説明を受けた。あと一歩で体験まで届く関心層。",
    meaning: "関心はあるのに体験で止まった＝導線設計で取りこぼしている可能性。",
    action: "説明の締めに必ず体験へ誘導。待ち時間を作らない配置に。",
    topSegment: "3〜5歳連れの家族",
  },
  experienced: {
    definition: "実際に体験した。最も濃い接点＝ファン化・見込み層。",
    meaning: "満足度・記憶が最も高い。BtoBリードもこの層に厚い。",
    action: "体験直後にLINE継続接続・個別フォロー（good体験の直後に）。",
    topSegment: "3〜5歳連れ／健康関係者",
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

const DEPTH_RANK: Record<VisitDepth, number> = { visited: 1, explained: 2, experienced: 3 };

export function experiencedRate(depth: DepthBreakdown): number {
  const total = depth.visited + depth.explained + depth.experienced;
  return total === 0 ? 0 : depth.experienced / total;
}

export function engagementAvg(depth: DepthBreakdown): number {
  const total = depth.visited + depth.explained + depth.experienced;
  if (total === 0) {
    return 0;
  }
  const weighted =
    depth.visited * DEPTH_RANK.visited + depth.explained * DEPTH_RANK.explained + depth.experienced * DEPTH_RANK.experienced;
  return weighted / total;
}

/**
 * デモ用の1ブース分レポート。歯科（お口の健康）ブースを想定＝子ども年齢の分布と
 * 「体験まで到達したか」が出展者にとって最重要、という物語が立つ題材。
 * 色は世界観ガイドライン（`06`）のパレット内から（ティール禁止）。
 */
export const DEMO_REPORT: ExhibitorReport = {
  exhibitor: {
    name: "cOral up ｜ お口の健康ブース",
    boothNo: "01",
    category: "歯・お口の健康",
    themeColor: "var(--color-accent)",
    mascotImage: "/content/fuwafuwa-land/characters/display/haisha-gorisan.png",
  },
  event: {
    title: "YourTIME 2026",
    dateLabel: "2026.08.02（土）",
    generatedLabel: "2026.08.03 09:12 自動生成",
  },
  totals: {
    uniqueVisitors: 137,
    stampScans: 152,
    depth: { visited: 58, explained: 47, experienced: 32 },
  },
  benchmark: {
    venueExperiencedRate: 0.18,
    boothExperiencedRate: 32 / 137,
    venueEngagementAvg: 1.62,
    boothEngagementAvg: engagementAvg({ visited: 58, explained: 47, experienced: 32 }),
    rankLabel: "全24ブース中 3位",
  },
  audience: {
    visitorType: { family: 71, with_kids: 39, solo: 21, other: 6 },
    childAge: [
      { ageBand: "0", count: 6 },
      { ageBand: "1", count: 9 },
      { ageBand: "2", count: 14 },
      { ageBand: "3", count: 22 },
      { ageBand: "4", count: 25 },
      { ageBand: "5", count: 19 },
      { ageBand: "6", count: 12 },
      { ageBand: "7-9", count: 15 },
      { ageBand: "10-12", count: 7 },
      { ageBand: "13+", count: 3 },
    ],
    acquisition: [
      { source: "instagram", count: 44 },
      { source: "friend", count: 33 },
      { source: "official", count: 26 },
      { source: "exhibitor", count: 18 },
      { source: "walk_in", count: 12 },
      { source: "other", count: 4 },
    ],
    healthProCount: 19,
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
  insights: [
    {
      id: "ins-win",
      kind: "win",
      headline: "3〜5歳連れが「体験」まで最も到達",
      detail:
        "3〜5歳のコホートは体験到達率が突出（会場平均の約1.4倍）。この年齢の親子に最も刺さっています。次回はこの層向けの導線・体験尺を主役に。",
    },
    {
      id: "ins-lead",
      kind: "lead",
      headline: "医療・健康関係者が19名来訪＝BtoB見込み",
      detail:
        "来訪者の約14%が医療・健康の仕事関係者。物販だけでなく、提携・仕入れ・法人商談のリード母集団として個別フォローの価値があります。",
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
