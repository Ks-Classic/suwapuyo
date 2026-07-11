import { motion, useReducedMotion } from "framer-motion";
import styles from "./report.module.css";
import { BarList, CohortMatrix, DepthFunnel, Donut, HourBars, StatCard } from "./charts";
import {
  ACQUISITION_META,
  DEMO_REPORT,
  DEPTH_DETAIL,
  DEPTH_META,
  VISITOR_TYPE_META,
  experiencedRate,
  formatAggregateCount,
  isSuppressedAggregate,
  type DepthBreakdown,
  type ExhibitorReport as ExhibitorReportModel,
  type ReportInsight,
} from "./reportData";

const DEPTH_ORDER: Array<keyof DepthBreakdown> = ["visited", "explained", "experienced"];

const INSIGHT_META: Record<ReportInsight["kind"], { badge: string }> = {
  win: { badge: "集計で確認" },
  lead: { badge: "導線の記録" },
  timing: { badge: "運営のヒント" },
  watch: { badge: "次に試すこと" },
};

export interface BizContactClickedEvent {
  name: "biz_contact_clicked";
  boothNo: string;
  exhibitorName: string;
  dataMode: ExhibitorReportModel["dataMode"];
}

interface ExhibitorReportProps {
  report?: ExhibitorReportModel;
  onBizContactClick?: (event: BizContactClickedEvent) => void;
  /** アプリシェル側の命名との互換。新規コードは onBizContactClick を優先する。 */
  onBusinessContact?: (event: BizContactClickedEvent) => void;
}

function Section({ eyebrow, title, note, children }: { eyebrow: string; title: string; note?: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      className={styles.section}
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 26 }}
    >
      <header className={styles.sectionHead}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {note !== undefined ? <p className={styles.sectionNote}>{note}</p> : null}
      </header>
      {children}
    </motion.section>
  );
}

export function ExhibitorReport({ report = DEMO_REPORT, onBizContactClick, onBusinessContact }: ExhibitorReportProps) {
  const reduced = useReducedMotion();
  const { totals, benchmark, audience } = report;
  const totalDepth = totals.depth.visited + totals.depth.explained + totals.depth.experienced;
  const depthHasSuppressedCell = Object.values(totals.depth).some(isSuppressedAggregate);
  const expRate = experiencedRate(totals.depth);
  const expDeltaPt = Math.round((benchmark.boothExperiencedRate - benchmark.venueExperiencedRate) * 1000) / 10;
  const peakHour = report.timeline.reduce((peak, bucket) => (bucket.count > peak.count ? bucket : peak), report.timeline[0]).hour;

  const visitorTotal = (Object.values(audience.visitorType) as number[]).reduce((sum, value) => sum + value, 0);
  const topVisitorType = (Object.entries(audience.visitorType) as Array<[keyof typeof VISITOR_TYPE_META, number]>).sort(
    (left, right) => right[1] - left[1],
  )[0];
  const dataModeLabel = report.dataMode === "demo" ? "デモデータ" : report.dataMode === "test" ? "テストデータ" : "集計データ";
  const dataModeDescription = report.dataMode === "demo" ? "数値は画面確認用のサンプルです" : "データ種別を表示しています";

  return (
    <main className={styles.root}>
      <div className={styles.canvas}>
        <div className={styles.dataModeBanner} role="status" aria-label={`このレポートのデータ種別は${dataModeLabel}です`}>
          <span className={styles.dataModeBadge}>{dataModeLabel}</span>
          <span>{dataModeDescription}</span>
        </div>
        {/* ── ヘッダー：ブランド＋会期＋キャラ ── */}
        <motion.header
          className={styles.hero}
          initial={reduced ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
        >
          <div className={styles.heroText}>
            <span className={styles.heroKicker}>出展者レポート ｜ {report.event.title}</span>
            <h1 className={styles.heroTitle}>
              <span className={styles.titleAccent}>{report.exhibitor.name}</span>
            </h1>
            <div className={styles.heroMeta}>
              <span className={styles.metaPill}>No.{report.exhibitor.boothNo}</span>
              <span className={styles.metaPill}>{report.exhibitor.category}</span>
              <span className={styles.metaPill}>{report.event.dateLabel}</span>
            </div>
          </div>
          <img className={styles.heroMascot} src={report.exhibitor.mascotImage} alt="" />
        </motion.header>

        {/* ── サマリーKPI ── */}
        <div className={styles.kpiGrid}>
          <StatCard label="接点" value={totals.uniqueVisitors} suffix="件" suppressed={isSuppressedAggregate(totals.uniqueVisitors)} hint={isSuppressedAggregate(totals.stampScans) ? "少数のため非表示" : `スタンプ ${totals.stampScans}回`} accent="var(--color-accent)" />
          <StatCard label="詳細表示" value={totals.detailViews} suffix="件" suppressed={isSuppressedAggregate(totals.detailViews)} hint="ブース詳細を開いた回数" accent="var(--color-blue)" />
          <StatCard label="CTA" value={totals.ctaClicks} suffix="件" suppressed={isSuppressedAggregate(totals.ctaClicks)} hint="外部案内へ進んだ回数" accent="var(--color-pink)" />
          <StatCard
            label="体験到達率"
            value={expRate * 100}
            decimals={1}
            suffix="%"
            suppressed={depthHasSuppressedCell}
            delta={{ value: `会場平均+${expDeltaPt}pt`, direction: expDeltaPt >= 0 ? "up" : "down" }}
            accent="var(--color-green)"
          />
        </div>

        {/* ── 関与ファネル ── */}
        <Section
          eyebrow="ENGAGEMENT FUNNEL"
          title="どこまで関わってくれた？"
          note="ブースQRのスタンプで記録した「深さ」タップ。寄っただけ→説明きいた→体験した、の到達を段階で見ます。"
        >
          <DepthFunnel
            stages={[
              { ...DEPTH_META.visited, count: totals.depth.visited },
              { ...DEPTH_META.explained, count: totals.depth.explained },
              { ...DEPTH_META.experienced, count: totals.depth.experienced },
            ]}
          />
          <p className={styles.funnelSummary}>
            {depthHasSuppressedCell ? (
              <>少数セルを含むため、体験到達率は表示していません。</>
            ) : (
              <>来訪 {totalDepth} 人のうち <strong>{totals.depth.experienced} 人</strong>（{Math.round(expRate * 100)}%）が体験まで到達。会場平均は {Math.round(benchmark.venueExperiencedRate * 100)}% です。</>
            )}
          </p>
        </Section>

        {/* ── 深さ3段の中身 ── */}
        <Section
          eyebrow="DEPTH BREAKDOWN"
          title="寄っただけ・説明きいた・体験した の中身"
          note="3段それぞれが「何を意味するか」と「次の打ち手」。人数だけでなく、層の解釈まで出します。"
        >
          <div className={styles.depthCards}>
            {DEPTH_ORDER.map((key, index) => {
              const meta = DEPTH_META[key];
              const detail = DEPTH_DETAIL[key];
              const count = totals.depth[key];
              const share = totalDepth === 0 ? 0 : Math.round((count / totalDepth) * 100);
              return (
                <motion.article
                  key={key}
                  className={styles.depthCard}
                  style={{ "--depth-accent": meta.color } as React.CSSProperties}
                  initial={reduced ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 230, damping: 22, delay: index * 0.08 }}
                >
                  <div className={styles.depthCardHead}>
                    <span className={styles.depthIcon} aria-hidden="true">
                      {meta.marker}
                    </span>
                    <div className={styles.depthLabelWrap}>
                      <span className={styles.depthName}>{meta.label}</span>
                      <span className={styles.depthShort}>{meta.short}</span>
                    </div>
                  </div>
                  <div className={styles.depthShareRow}>
                    <span className={styles.depthCount}>
                      {formatAggregateCount(count)}
                      <small>人</small>
                    </span>
                    <span className={styles.depthShare}>{isSuppressedAggregate(count) ? "少数のため非表示" : `全体の${share}%`}</span>
                  </div>
                  <div className={styles.depthBar}>
                    <motion.div
                      className={styles.depthBarFill}
                      style={{ background: meta.color }}
                      initial={reduced ? false : { width: 0 }}
                      whileInView={{ width: `${isSuppressedAggregate(count) ? 0 : share}%` }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 22, delay: 0.15 + index * 0.08 }}
                    />
                  </div>
                  <p className={styles.depthDef}>{detail.definition}</p>
                  <div className={styles.depthMetaRow}>
                    <span className={styles.depthMetaTag}>この層＝</span>
                    <span className={styles.depthMetaValue}>{detail.meaning}</span>
                  </div>
                  <div className={styles.depthMetaRow}>
                    <span className={styles.depthMetaTag}>代表セグメント</span>
                    <span className={styles.depthMetaValue}>{detail.topSegment}</span>
                  </div>
                  <p className={styles.depthAction}>
                    <span aria-hidden="true">→ </span>
                    {detail.action}
                  </p>
                </motion.article>
              );
            })}
          </div>
        </Section>

        {/* ── 来場者プロフィール ── */}
        <Section eyebrow="AUDIENCE" title="だれが来てくれた？" note="来場前アンケート（家族構成・子どもの年齢・認知経路）から。">
          <div className={styles.audienceGrid}>
            <div className={styles.glassPanel}>
              <h3 className={styles.panelTitle}>家族構成</h3>
              <div className={styles.donutRow}>
                <Donut
                  slices={(Object.entries(audience.visitorType) as Array<[keyof typeof VISITOR_TYPE_META, number]>).map(
                    ([key, value]) => ({ label: VISITOR_TYPE_META[key].label, value, color: VISITOR_TYPE_META[key].color }),
                  )}
                  centerTop={isSuppressedAggregate(topVisitorType[1]) ? "—" : `${Math.round((topVisitorType[1] / Math.max(1, visitorTotal)) * 100)}%`}
                  centerBottom={VISITOR_TYPE_META[topVisitorType[0]].label}
                />
                <ul className={styles.legend}>
                  {(Object.entries(audience.visitorType) as Array<[keyof typeof VISITOR_TYPE_META, number]>).map(([key, value]) => (
                    <li key={key}>
                      <span className={styles.legendDot} style={{ background: VISITOR_TYPE_META[key].color }} />
                      {VISITOR_TYPE_META[key].label}
                      <strong>{formatAggregateCount(value)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={styles.glassPanel}>
              <h3 className={styles.panelTitle}>子どもの年齢分布</h3>
              <BarList
                data={audience.childAge.map((datum) => ({
                  label: `${datum.ageBand}才`,
                  value: datum.count,
                  color: "var(--color-accent)",
                  highlight: datum.count >= 22,
                }))}
              />
              <p className={styles.panelFoot}>年齢は単年齢ではなく帯で集計し、少数セルを表示しません。</p>
            </div>

            <div className={styles.glassPanel}>
              <h3 className={styles.panelTitle}>どこで知って来た？</h3>
              <BarList
                data={audience.acquisition.map((datum) => ({
                  label: ACQUISITION_META[datum.source],
                  value: datum.count,
                  color: "var(--color-blue)",
                }))}
              />
              <p className={styles.panelFoot}>SNS・知人が母集団の過半。次回告知はこの2経路を主戦場に。</p>
            </div>
          </div>
        </Section>

        {/* ── 時間帯 ── */}
        <Section eyebrow="TIMELINE" title="いつ人が来た？" note="スタンプのタイムスタンプを時間帯で集計。運営の人員配置に効きます。">
          <div className={styles.glassPanel}>
            <HourBars data={report.timeline} peakHour={peakHour} />
            <p className={styles.panelFoot}>
              ピークは <strong>{peakHour}:00 台</strong>。この時間に説明スタッフを厚くすると、待ちによる「寄っただけ止まり」を減らせます。
            </p>
          </div>
        </Section>

        {/* ── コホート ── */}
        <Section
          eyebrow="COHORT"
          title="年齢帯ごとの関わり方"
          note="子どもの年齢帯 × 関与の深さを集計しています。5人未満のセルと、そこから推測できる率は表示しません。"
        >
          <div className={styles.glassPanel}>
            <CohortMatrix
              rows={report.cohort.map((row) => ({ label: row.ageLabel, cells: row.depth }))}
              columns={[
                { key: "visited", label: "寄った", color: "var(--color-blue)" },
                { key: "explained", label: "説明", color: "var(--color-accent)" },
                { key: "experienced", label: "体験", color: "var(--color-green)" },
              ]}
            />
          </div>
        </Section>

        {/* ── 自動インサイト ── */}
        <Section eyebrow="INSIGHTS" title="今回わかったこと・次に試すこと" note="集計から考えられる仮説です。効果や個人の状態を判定するものではありません。">
          <div className={styles.insightGrid}>
            {report.insights.map((insight, index) => (
              <motion.article
                key={insight.id}
                className={`${styles.insightCard} ${styles[`insight_${insight.kind}`]}`}
                initial={reduced ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 230, damping: 22, delay: index * 0.07 }}
              >
                <span className={styles.insightBadge}>
                  {INSIGHT_META[insight.kind].badge}
                </span>
                <h3 className={styles.insightHeadline}>{insight.headline}</h3>
                <p className={styles.insightDetail}>{insight.detail}</p>
              </motion.article>
            ))}
          </div>
        </Section>

        <section className={styles.consultation} aria-labelledby="report-consultation-title">
          <span className={styles.eyebrow}>FOR EXHIBITORS</span>
          <h2 id="report-consultation-title" className={styles.consultationTitle}>この計測と発信の仕組みを、自社でも使いたい方へ</h2>
          <p>イベントでの接点を集計し、次の施策につなげる仕組みについてご相談いただけます。</p>
          <button
            type="button"
            className={styles.consultationButton}
            onClick={() =>
              (onBizContactClick ?? onBusinessContact)?.({
                name: "biz_contact_clicked",
                boothNo: report.exhibitor.boothNo,
                exhibitorName: report.exhibitor.name,
                dataMode: report.dataMode,
              })
            }
          >
            相談してみる
          </button>
        </section>

        <footer className={styles.footer}>
          <p>{report.event.generatedLabel}</p>
          <p className={styles.footerNote}>
            {report.dataMode === "demo" ? "本ページはデモです。数値はサンプルです。" : null} 個人を特定できる情報は表示せず、集計値のみをレポート化しています。5人未満の集計セルは非表示です。
          </p>
        </footer>
      </div>
    </main>
  );
}
