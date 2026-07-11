import { motion, useReducedMotion } from "framer-motion";
import styles from "./report.module.css";
import { formatAggregateCount, isSuppressedAggregate } from "./reportData";

interface StatCardProps {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  hint?: string;
  accent?: string;
  suppressed?: boolean;
}

export function StatCard({ label, value, decimals = 0, suffix, delta, hint, accent, suppressed = false }: StatCardProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={styles.statCard}
      style={accent !== undefined ? ({ "--stat-accent": accent } as React.CSSProperties) : undefined}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 22 }}
    >
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>
        {suppressed ? "—" : value.toFixed(decimals)}
        {!suppressed && suffix !== undefined ? <small className={styles.statSuffix}>{suffix}</small> : null}
      </span>
      {!suppressed && delta !== undefined ? (
        <span className={`${styles.statDelta} ${styles[`delta_${delta.direction}`]}`}>
          {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "＝"} {delta.value}
        </span>
      ) : null}
      {hint !== undefined ? <span className={styles.statHint}>{hint}</span> : null}
    </motion.div>
  );
}

interface FunnelStage {
  label: string;
  short: string;
  count: number;
  color: string;
  marker: string;
}

export function DepthFunnel({ stages }: { stages: FunnelStage[] }) {
  const reduced = useReducedMotion();
  const max = Math.max(1, ...stages.map((stage) => stage.count));
  return (
    <div className={styles.funnel}>
      {stages.map((stage, index) => {
        const width = 40 + (stage.count / max) * 60;
        const prev = index > 0 ? stages[index - 1].count : stage.count;
        const conv = prev === 0 ? 0 : Math.round((stage.count / prev) * 100);
        const suppressed = isSuppressedAggregate(stage.count);
        const conversionSuppressed = index > 0 && (suppressed || isSuppressedAggregate(prev));
        return (
          <motion.div
            key={stage.label}
            className={styles.funnelRow}
            initial={reduced ? false : { opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 24, delay: index * 0.08 }}
          >
            <div className={styles.funnelHead}>
              <span className={styles.funnelIcon} aria-hidden="true">
                {stage.marker}
              </span>
              <span className={styles.funnelLabel}>{stage.label}</span>
              {index > 0 ? <span className={styles.funnelConv}>{conversionSuppressed ? "少数のため非表示" : `前段の${conv}%`}</span> : null}
            </div>
            <div className={styles.funnelTrack}>
              <motion.div
                className={styles.funnelBar}
                style={{ background: stage.color }}
                initial={reduced ? false : { width: 0 }}
                whileInView={{ width: `${suppressed ? 0 : width}%` }}
                viewport={{ once: true, amount: 0.5 }}
                transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 22, delay: 0.1 + index * 0.08 }}
              >
                <span className={styles.funnelCount}>{formatAggregateCount(stage.count)}</span>
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function Donut({ slices, centerTop, centerBottom }: { slices: DonutSlice[]; centerTop: string; centerBottom: string }) {
  const reduced = useReducedMotion();
  const visibleSlices = slices.map((slice) => ({ ...slice, value: isSuppressedAggregate(slice.value) ? 0 : slice.value }));
  const total = Math.max(1, visibleSlices.reduce((sum, slice) => sum + slice.value, 0));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const segments = visibleSlices.map((slice, index) => {
    const offset = visibleSlices.slice(0, index).reduce((sum, preceding) => sum + (preceding.value / total) * circumference, 0);
    const dash = (slice.value / total) * circumference;
    return { ...slice, dash, offset };
  });
  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 140 140" className={styles.donutSvg} role="img" aria-label="来場者の家族構成の割合">
        <circle cx="70" cy="70" r={radius} className={styles.donutTrack} />
        {segments.map((slice) => (
            <motion.circle
              key={slice.label}
              cx="70"
              cy="70"
              r={radius}
              className={styles.donutSlice}
              style={{ stroke: slice.color }}
              strokeDasharray={`${slice.dash} ${circumference - slice.dash}`}
              strokeDashoffset={-slice.offset}
              initial={reduced ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: reduced ? 0 : 0.5 }}
            />
        ))}
      </svg>
      <div className={styles.donutCenter}>
        <strong>{centerTop}</strong>
        <span>{centerBottom}</span>
      </div>
    </div>
  );
}

interface BarDatum {
  label: string;
  value: number;
  color?: string;
  highlight?: boolean;
}

export function BarList({ data, unit = "人" }: { data: BarDatum[]; unit?: string }) {
  const reduced = useReducedMotion();
  const max = Math.max(1, ...data.filter((datum) => !isSuppressedAggregate(datum.value)).map((datum) => datum.value));
  return (
    <div className={styles.barList}>
      {data.map((datum, index) => (
        <div key={datum.label} className={`${styles.barRow} ${datum.highlight ? styles.barRowHot : ""}`}>
          <span className={styles.barLabel}>{datum.label}</span>
          <div className={styles.barTrack}>
            <motion.div
              className={styles.barFill}
              style={{ background: datum.color ?? "var(--color-accent)" }}
              initial={reduced ? false : { width: 0 }}
              whileInView={{ width: `${isSuppressedAggregate(datum.value) ? 0 : (datum.value / max) * 100}%` }}
              viewport={{ once: true, amount: 0.4 }}
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 130, damping: 22, delay: index * 0.04 }}
            />
          </div>
          <span className={styles.barValue}>
            {formatAggregateCount(datum.value)}
            <small>{unit}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

export function HourBars({ data, peakHour }: { data: Array<{ hour: number; count: number }>; peakHour: number }) {
  const reduced = useReducedMotion();
  const max = Math.max(1, ...data.filter((datum) => !isSuppressedAggregate(datum.count)).map((datum) => datum.count));
  return (
    <div className={styles.hourBars}>
      {data.map((datum, index) => (
        <div key={datum.hour} className={styles.hourCol}>
          <div className={styles.hourTrack}>
            <motion.div
              className={`${styles.hourFill} ${datum.hour === peakHour ? styles.hourFillPeak : ""}`}
              initial={reduced ? false : { height: 0 }}
              whileInView={{ height: `${isSuppressedAggregate(datum.count) ? 0 : (datum.count / max) * 100}%` }}
              viewport={{ once: true, amount: 0.3 }}
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 20, delay: index * 0.05 }}
            >
              <span className={styles.hourCount}>{formatAggregateCount(datum.count)}</span>
            </motion.div>
          </div>
          <span className={styles.hourLabel}>{datum.hour}時</span>
        </div>
      ))}
    </div>
  );
}

interface CohortCell {
  visited: number;
  explained: number;
  experienced: number;
}

export function CohortMatrix({
  rows,
  columns,
}: {
  rows: Array<{ label: string; cells: CohortCell }>;
  columns: Array<{ key: keyof CohortCell; label: string; color: string }>;
}) {
  const hasSuppressedCell = (cells: CohortCell) => Object.values(cells).some(isSuppressedAggregate);
  return (
    <div className={styles.cohort}>
      <div className={styles.cohortHead}>
        <span />
        {columns.map((column) => (
          <span key={column.key} className={styles.cohortColHead} style={{ color: column.color }}>
            {column.label}
          </span>
        ))}
        <span className={styles.cohortColHead}>体験率</span>
      </div>
      {rows.map((row) => {
        const total = row.cells.visited + row.cells.explained + row.cells.experienced;
        const suppressedRow = hasSuppressedCell(row.cells);
        const rate = total === 0 || suppressedRow ? 0 : row.cells.experienced / total;
        return (
          <div key={row.label} className={styles.cohortRow}>
            <span className={styles.cohortRowLabel}>{row.label}</span>
            {columns.map((column) => {
              const cellValue = row.cells[column.key];
              const suppressed = isSuppressedAggregate(cellValue);
              const cellFraction = total === 0 || suppressed ? 0 : cellValue / total;
              return (
                <span
                  key={column.key}
                  className={styles.cohortCell}
                  style={{ background: suppressed ? "var(--color-surface-muted, #eee8df)" : column.color, opacity: suppressed ? 1 : 0.18 + cellFraction * 0.82 }}
                  aria-label={`${row.label} ${column.label}: ${suppressed ? "5人未満のため非表示" : `${cellValue}人`}`}
                >
                  {suppressed ? "—" : cellValue}
                </span>
              );
            })}
            <span className={styles.cohortRate}>{suppressedRow ? "—" : `${Math.round(rate * 100)}%`}</span>
          </div>
        );
      })}
    </div>
  );
}
