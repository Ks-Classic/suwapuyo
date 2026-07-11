import { motion, useReducedMotion } from "framer-motion";
import styles from "./report.module.css";
import { BarList, CohortMatrix, DepthFunnel, Donut, HourBars, StatCard } from "./charts";
import {
  ACQUISITION_META,
  DEMO_REPORT,
  DEPTH_DETAIL,
  DEPTH_META,
  VISITOR_TYPE_META,
  engagementAvg,
  experiencedRate,
  type DepthBreakdown,
  type ExhibitorReport as ExhibitorReportModel,
  type ReportInsight,
} from "./reportData";

const DEPTH_ORDER: Array<keyof DepthBreakdown> = ["visited", "explained", "experienced"];

const INSIGHT_META: Record<ReportInsight["kind"], { badge: string; icon: string }> = {
  win: { badge: "刺さった", icon: "🎯" },
  lead: { badge: "商談リード", icon: "🤝" },
  timing: { badge: "運営ヒント", icon: "⏰" },
  watch: { badge: "次への種", icon: "🌱" },
};

function Section({ eyebrow, title, note, children }: { eyebrow: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <motion.section
      className={styles.section}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ type: "spring", stiffness: 200, damping: 26 }}
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

export function ExhibitorReport({ report = DEMO_REPORT }: { report?: ExhibitorReportModel }) {
  const reduced = useReducedMotion();
  const { totals, benchmark, audience } = report;
  const totalDepth = totals.depth.visited + totals.depth.explained + totals.depth.experienced;
  const expRate = experiencedRate(totals.depth);
  const engAvg = engagementAvg(totals.depth);
  const expDeltaPt = Math.round((benchmark.boothExperiencedRate - benchmark.venueExperiencedRate) * 1000) / 10;
  const engDelta = Math.round((benchmark.boothEngagementAvg - benchmark.venueEngagementAvg) * 100) / 100;
  const peakHour = report.timeline.reduce((peak, bucket) => (bucket.count > peak.count ? bucket : peak), report.timeline[0]).hour;

  const visitorTotal = (Object.values(audience.visitorType) as number[]).reduce((sum, value) => sum + value, 0);
  const topVisitorType = (Object.entries(audience.visitorType) as Array<[keyof typeof VISITOR_TYPE_META, number]>).sort(
    (left, right) => right[1] - left[1],
  )[0];

  return (
    <main className={styles.root}>
      <div className={styles.canvas}>
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
          <StatCard label="総来訪者数" value={totals.uniqueVisitors} suffix="人" hint={`スタンプ${totals.stampScans}回`} accent="var(--color-accent)" />
          <StatCard
            label="体験到達率"
            value={expRate * 100}
            decimals={1}
            suffix="%"
            delta={{ value: `会場平均+${expDeltaPt}pt`, direction: expDeltaPt >= 0 ? "up" : "down" }}
            accent="var(--color-green)"
          />
          <StatCard
            label="エンゲージ平均"
            value={engAvg}
            decimals={2}
            suffix="/3"
            delta={{ value: `平均比+${engDelta}`, direction: engDelta >= 0 ? "up" : "down" }}
            hint={benchmark.rankLabel}
            accent="var(--color-blue)"
          />
          <StatCard label="健康関係者リード" value={audience.healthProCount} suffix="人" hint="BtoB商談の母集団" accent="var(--color-pink)" />
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
            来訪 {totalDepth} 人のうち <strong>{totals.depth.experienced} 人</strong>（{Math.round(expRate * 100)}%）が体験まで到達。
            会場平均の体験率 {Math.round(benchmark.venueExperiencedRate * 100)}% を上回っています。
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
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ type: "spring", stiffness: 230, damping: 22, delay: index * 0.08 }}
                >
                  <div className={styles.depthCardHead}>
                    <span className={styles.depthIcon} aria-hidden="true">
                      {meta.icon}
                    </span>
                    <div className={styles.depthLabelWrap}>
                      <span className={styles.depthName}>{meta.label}</span>
                      <span className={styles.depthShort}>{meta.short}</span>
                    </div>
                  </div>
                  <div className={styles.depthShareRow}>
                    <span className={styles.depthCount}>
                      {count}
                      <small>人</small>
                    </span>
                    <span className={styles.depthShare}>全体の{share}%</span>
                  </div>
                  <div className={styles.depthBar}>
                    <motion.div
                      className={styles.depthBarFill}
                      style={{ background: meta.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${share}%` }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.15 + index * 0.08 }}
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
                  centerTop={`${Math.round((topVisitorType[1] / Math.max(1, visitorTotal)) * 100)}%`}
                  centerBottom={VISITOR_TYPE_META[topVisitorType[0]].label}
                />
                <ul className={styles.legend}>
                  {(Object.entries(audience.visitorType) as Array<[keyof typeof VISITOR_TYPE_META, number]>).map(([key, value]) => (
                    <li key={key}>
                      <span className={styles.legendDot} style={{ background: VISITOR_TYPE_META[key].color }} />
                      {VISITOR_TYPE_META[key].label}
                      <strong>{value}</strong>
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
              <p className={styles.panelFoot}>ピークは <strong>3〜5歳</strong>。この年齢が体験まで最も進んでいます（下のコホート参照）。</p>
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
          title="どの層に刺さった？"
          note="子どもの年齢帯 × 関与の深さ。★ = 体験到達率が最も高い＝いちばん刺さったセグメント。"
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
        <Section eyebrow="INSIGHTS" title="次につながる示唆" note="集計から自動で立つ、来場後アクションの手がかり。">
          <div className={styles.insightGrid}>
            {report.insights.map((insight, index) => (
              <motion.article
                key={insight.id}
                className={`${styles.insightCard} ${styles[`insight_${insight.kind}`]}`}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ type: "spring", stiffness: 230, damping: 22, delay: index * 0.07 }}
              >
                <span className={styles.insightBadge}>
                  <span aria-hidden="true">{INSIGHT_META[insight.kind].icon}</span>
                  {INSIGHT_META[insight.kind].badge}
                </span>
                <h3 className={styles.insightHeadline}>{insight.headline}</h3>
                <p className={styles.insightDetail}>{insight.detail}</p>
              </motion.article>
            ))}
          </div>
        </Section>

        <footer className={styles.footer}>
          <p>{report.event.generatedLabel}</p>
          <p className={styles.footerNote}>
            ※ 本ページはデモです。数値はサンプル。個人が特定される情報は出展者に共有せず、集計値のみをレポート化します（子どもの要配慮データは明示ポリシー下でのみ扱います）。
          </p>
        </footer>
      </div>
    </main>
  );
}
