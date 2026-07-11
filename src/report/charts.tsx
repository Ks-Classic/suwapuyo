import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import styles from "./report.module.css";

/** rAFで0→targetにカウントアップ。reduced-motion時は即確定。ビューに入ってから開始。 */
export function useCountUp(target: number, decimals = 0): { value: number; ref: (node: Element | null) => void } {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const nodeRef = useRef<Element | null>(null);
  const inView = useInView(nodeRef, { once: true, amount: 0.4 });

  useEffect(() => {
    if (reduced || !inView) {
      setValue(reduced ? target : 0);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const duration = 900;
    const factor = 10 ** decimals;
    const step = (timestamp: number) => {
      if (start === null) {
        start = timestamp;
      }
      const progress = Math.min(1, (timestamp - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased * factor) / factor);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, decimals, reduced, inView]);

  return { value, ref: (node) => (nodeRef.current = node) };
}

interface StatCardProps {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  hint?: string;
  accent?: string;
}

export function StatCard({ label, value, decimals = 0, suffix, delta, hint, accent }: StatCardProps) {
  const { value: shown, ref } = useCountUp(value, decimals);
  return (
    <motion.div
      ref={ref}
      className={styles.statCard}
      style={accent !== undefined ? ({ "--stat-accent": accent } as React.CSSProperties) : undefined}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>
        {shown.toFixed(decimals)}
        {suffix !== undefined ? <small className={styles.statSuffix}>{suffix}</small> : null}
      </span>
      {delta !== undefined ? (
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
  icon: string;
}

export function DepthFunnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((stage) => stage.count));
  return (
    <div className={styles.funnel}>
      {stages.map((stage, index) => {
        const width = 40 + (stage.count / max) * 60;
        const prev = index > 0 ? stages[index - 1].count : stage.count;
        const conv = prev === 0 ? 0 : Math.round((stage.count / prev) * 100);
        return (
          <motion.div
            key={stage.label}
            className={styles.funnelRow}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ type: "spring", stiffness: 220, damping: 24, delay: index * 0.08 }}
          >
            <div className={styles.funnelHead}>
              <span className={styles.funnelIcon} aria-hidden="true">
                {stage.icon}
              </span>
              <span className={styles.funnelLabel}>{stage.label}</span>
              {index > 0 ? <span className={styles.funnelConv}>前段の{conv}%</span> : null}
            </div>
            <div className={styles.funnelTrack}>
              <motion.div
                className={styles.funnelBar}
                style={{ background: stage.color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${width}%` }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.1 + index * 0.08 }}
              >
                <span className={styles.funnelCount}>{stage.count}</span>
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
  const total = Math.max(1, slices.reduce((sum, slice) => sum + slice.value, 0));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 140 140" className={styles.donutSvg} role="img" aria-label="来場者の家族構成の割合">
        <circle cx="70" cy="70" r={radius} className={styles.donutTrack} />
        {slices.map((slice) => {
          const fraction = slice.value / total;
          const dash = fraction * circumference;
          const circle = (
            <motion.circle
              key={slice.label}
              cx="70"
              cy="70"
              r={radius}
              className={styles.donutSlice}
              style={{ stroke: slice.color }}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            />
          );
          offset += dash;
          return circle;
        })}
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
  const max = Math.max(1, ...data.map((datum) => datum.value));
  return (
    <div className={styles.barList}>
      {data.map((datum, index) => (
        <div key={datum.label} className={`${styles.barRow} ${datum.highlight ? styles.barRowHot : ""}`}>
          <span className={styles.barLabel}>{datum.label}</span>
          <div className={styles.barTrack}>
            <motion.div
              className={styles.barFill}
              style={{ background: datum.color ?? "var(--color-accent)" }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(datum.value / max) * 100}%` }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ type: "spring", stiffness: 130, damping: 22, delay: index * 0.04 }}
            />
          </div>
          <span className={styles.barValue}>
            {datum.value}
            <small>{unit}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

export function HourBars({ data, peakHour }: { data: Array<{ hour: number; count: number }>; peakHour: number }) {
  const max = Math.max(1, ...data.map((datum) => datum.count));
  return (
    <div className={styles.hourBars}>
      {data.map((datum, index) => (
        <div key={datum.hour} className={styles.hourCol}>
          <div className={styles.hourTrack}>
            <motion.div
              className={`${styles.hourFill} ${datum.hour === peakHour ? styles.hourFillPeak : ""}`}
              initial={{ height: 0 }}
              whileInView={{ height: `${(datum.count / max) * 100}%` }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ type: "spring", stiffness: 140, damping: 20, delay: index * 0.05 }}
            >
              <span className={styles.hourCount}>{datum.count}</span>
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
  // 各行のうち最も濃い（体験率が高い）行を強調するため、行内の experienced 率でヒートを作る。
  const maxRate = Math.max(
    ...rows.map((row) => {
      const total = row.cells.visited + row.cells.explained + row.cells.experienced;
      return total === 0 ? 0 : row.cells.experienced / total;
    }),
  );
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
        const rate = total === 0 ? 0 : row.cells.experienced / total;
        const isTop = maxRate > 0 && rate === maxRate;
        return (
          <div key={row.label} className={`${styles.cohortRow} ${isTop ? styles.cohortRowTop : ""}`}>
            <span className={styles.cohortRowLabel}>
              {row.label}
              {isTop ? <span className={styles.cohortStar} aria-label="最も刺さった層">★</span> : null}
            </span>
            {columns.map((column) => {
              const cellValue = row.cells[column.key];
              const cellFraction = total === 0 ? 0 : cellValue / total;
              return (
                <span
                  key={column.key}
                  className={styles.cohortCell}
                  style={{ background: column.color, opacity: 0.18 + cellFraction * 0.82 }}
                >
                  {cellValue}
                </span>
              );
            })}
            <span className={styles.cohortRate}>{Math.round(rate * 100)}%</span>
          </div>
        );
      })}
    </div>
  );
}
