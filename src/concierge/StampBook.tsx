import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { BoothExhibitor, VisitDepth } from "../fuwafuwa-land/map/boothMapData";
import { track } from "../shared/analytics";
import { unlockCharacter } from "../shared/progressStore";
import { DEMO_BOOTHS, HIDDEN_REWARD_CHARACTER_ID } from "./demoData";
import type { ConciergeStamp } from "./visitorStore";
import styles from "./stampBook.module.css";

/**
 * むらずかん = スタンプ台紙(絵本の見開き)。デザインの正: docs/40_yourtime-platform/06_design-guideline.md §6.5。
 * モデルは「スタンプラリー」であって「トレカ」ではない。
 * 未取得マス = うすい時計の文字盤 / 獲得マス = 時計→ロゴに"押された"インク印(ハンコ)。
 * 関与の深さ(寄った/聞いた/体験した)は レアリティでなく「印の格」(リング数・金)で控えめに表す。
 */

interface StampTier {
  rings: number;
  label: string;
  gold: boolean;
}

const TIER: Record<VisitDepth, StampTier> = {
  visited: { rings: 1, label: "であった", gold: false },
  explained: { rings: 2, label: "はなした", gold: false },
  experienced: { rings: 3, label: "たいけん", gold: true },
};

function slotNo(booth: BoothExhibitor): string {
  return booth.boothNo.padStart(2, "0");
}

/** boothNo から決まる僅かな傾き(押印のゆらぎ)。乱数を使わず再現性を保つ。 */
function pressAngle(booth: BoothExhibitor): number {
  const n = Number.parseInt(booth.boothNo, 10) || 0;
  return ((n * 37) % 9) - 4; // -4〜+4度
}

/** うすい時計の文字盤(未取得マスの下地) */
function ClockFace() {
  return (
    <span className={styles.clock} aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <span key={index} className={styles.tick} style={{ transform: `rotate(${index * 30}deg)` }} />
      ))}
      <span className={styles.handHour} />
      <span className={styles.handMin} />
    </span>
  );
}

/** 印そのもの(グリッド/詳細で共用) */
function StampMark({
  booth,
  depth,
  size,
}: {
  booth: BoothExhibitor;
  depth: VisitDepth | null;
  size: "grid" | "detail";
}) {
  const tier = depth !== null ? TIER[depth] : null;
  const ink = booth.themeColor ?? "#F5A623";
  const angle = pressAngle(booth);

  if (tier === null) {
    return (
      <span className={`${styles.mark} ${styles.markEmpty}`}>
        <ClockFace />
        <span className={styles.slotNo}>{slotNo(booth)}</span>
        <span className={styles.mada}>まだ</span>
      </span>
    );
  }

  return (
    <span
      className={`${styles.mark} ${styles.markInked} ${tier.gold ? styles.markGold : ""}`}
      style={{ "--ink": ink, "--press": `${angle}deg` } as React.CSSProperties}
    >
      <span className={styles.ringOuter} aria-hidden="true" />
      {tier.rings >= 2 ? <span className={styles.ringInner} aria-hidden="true" /> : null}
      <span className={styles.slotNo}>{slotNo(booth)}</span>
      <span className={styles.glyph} aria-hidden="true">
        {booth.stampEmoji ?? "✨"}
      </span>
      <span className={styles.arc}>{booth.name}</span>
      {tier.gold ? (
        <span className={styles.goldStar} aria-hidden="true">
          ★
        </span>
      ) : null}
      {size === "detail" ? <span className={styles.grain} aria-hidden="true" /> : null}
    </span>
  );
}

function StampSlot({
  booth,
  depth,
  isNew,
  reduced,
  onOpen,
}: {
  booth: BoothExhibitor;
  depth: VisitDepth | null;
  isNew: boolean;
  reduced: boolean;
  onOpen: () => void;
}) {
  const caught = depth !== null;
  return (
    <motion.button
      type="button"
      className={styles.slot}
      onClick={caught ? onOpen : undefined}
      disabled={!caught}
      aria-label={caught ? `${booth.name} のスタンプを見る` : "まだ押していないマス"}
      initial={reduced || !isNew ? false : { scale: 1.5, rotate: -14, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={
        reduced
          ? { duration: 0 }
          : isNew
            ? { type: "spring", stiffness: 520, damping: 15, delay: 0.05 }
            : { duration: 0.2 }
      }
      whileTap={caught && !reduced ? { scale: 0.94 } : undefined}
    >
      <StampMark booth={booth} depth={depth} size="grid" />
      {isNew ? <span className={styles.newBadge}>NEW!</span> : null}
    </motion.button>
  );
}

/** 詳細: 紙に押された印のクローズアップ(3Dチルトはしない=トレカ回避) */
function StampDetail({
  booth,
  depth,
  reduced,
  onClose,
}: {
  booth: BoothExhibitor;
  depth: VisitDepth;
  reduced: boolean;
  onClose: () => void;
}) {
  const tier = TIER[depth];
  return (
    <motion.div
      className={styles.detailBackdrop}
      role="presentation"
      onClick={onClose}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={styles.detailPaper}
        onClick={(event) => event.stopPropagation()}
        initial={reduced ? false : { scale: 1.35, rotate: -10, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        exit={reduced ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
        transition={reduced ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 18 }}
      >
        <span className={styles.detailStage}>
          <StampMark booth={booth} depth={depth} size="detail" />
        </span>
        <div className={styles.detailInfo}>
          <strong>{booth.name}</strong>
          <small>
            {booth.category}・{tier.label}
          </small>
        </div>
      </motion.div>
      <button type="button" className={styles.detailClose} onClick={onClose}>
        とじる
      </button>
    </motion.div>
  );
}

/**
 * ミッション = 小分けの達成可能な目標。100枠は絶対に埋まらないので、
 * 「全部あつめる」を唯一のゴールにせず、いくつかの手の届く目標に分ける。
 * 各目標は demo(4件)でも本番(〜100件)でも成立するよう、件数/エリア数/深さで測る。
 */
interface MissionState {
  id: string;
  icon: string;
  title: string;
  desc: string;
  target: number;
  progress: number;
  reward?: string;
  unlocksHidden?: boolean;
}

function computeMissions(stamps: ConciergeStamp[]): MissionState[] {
  const caught = new Set(stamps.map((stamp) => stamp.exhibitor_id)).size;
  const areas = new Set<string>();
  for (const stamp of stamps) {
    const booth = DEMO_BOOTHS.find((entry) => entry.id === stamp.exhibitor_id);
    if (booth !== undefined) {
      areas.add(booth.landId);
    }
  }
  const experienced = stamps.filter((stamp) => stamp.depth === "experienced").length;
  return [
    { id: "first", icon: "🌱", title: "はじめの一歩", desc: "スタンプを1つ集めよう", target: 1, progress: caught },
    { id: "explorer", icon: "🧭", title: "たんけん家", desc: "3つのブースを回ろう", target: 3, progress: caught },
    { id: "variety", icon: "🌈", title: "いろどりの村", desc: "ちがうエリアを3種", target: 3, progress: areas.size },
    {
      id: "deep",
      icon: "✨",
      title: "じっくり体験",
      desc: "どれか1つを「たいけん」しよう",
      target: 1,
      progress: experienced,
      reward: "すわぷよ かくしキャラ",
      unlocksHidden: true,
    },
  ];
}

function MissionBoard({ missions, reduced }: { missions: MissionState[]; reduced: boolean }) {
  return (
    <section className={styles.missions} aria-label="ミッション">
      <p className={styles.missionsTitle}>ミッション</p>
      <div className={styles.missionList}>
        {missions.map((mission) => {
          const done = mission.progress >= mission.target;
          const pct = Math.min(100, (mission.progress / mission.target) * 100);
          return (
            <div key={mission.id} className={`${styles.missionCard} ${done ? styles.missionDone : ""}`}>
              <span className={styles.missionIcon} aria-hidden="true">
                {done ? "✓" : mission.icon}
              </span>
              <div className={styles.missionBody}>
                <strong>{mission.title}</strong>
                <small>
                  {mission.desc}
                  {mission.reward !== undefined ? ` ・ごほうび: ${mission.reward}` : ""}
                </small>
                <div className={styles.missionBar}>
                  <motion.div
                    className={styles.missionFill}
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 20 }}
                  />
                </div>
              </div>
              <span className={styles.missionCount}>
                {Math.min(mission.progress, mission.target)}/{mission.target}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function StampBook({
  stamps,
  justStampedId,
  onMap,
}: {
  stamps: ConciergeStamp[];
  justStampedId: string | null;
  onMap: () => void;
}) {
  const reduced = !!useReducedMotion();
  const [openBoothId, setOpenBoothId] = useState<string | null>(null);
  const depthByBooth = useMemo(() => {
    const map = new Map<string, VisitDepth>();
    for (const stamp of stamps) {
      map.set(stamp.exhibitor_id, stamp.depth);
    }
    return map;
  }, [stamps]);

  const caughtCount = depthByBooth.size;
  const total = DEMO_BOOTHS.length;
  const missions = computeMissions(stamps);
  const allMissionsDone = missions.every((mission) => mission.progress >= mission.target);

  // 隠しキャラは「全集め」でなく「1つをじっくり体験する」で解放する。
  // 100枠は埋まらないので、達成可能な深い体験に結びつける(体験設計 07 と一致)。
  const hiddenDone = missions.some((mission) => mission.unlocksHidden === true && mission.progress >= mission.target);
  const unlockedRef = useRef(false);
  useEffect(() => {
    if (hiddenDone && !unlockedRef.current) {
      unlockedRef.current = true;
      unlockCharacter(HIDDEN_REWARD_CHARACTER_ID);
      track("unlock_hidden", { surface: "concierge", id: HIDDEN_REWARD_CHARACTER_ID });
    }
  }, [hiddenDone]);

  const openBooth = openBoothId !== null ? DEMO_BOOTHS.find((booth) => booth.id === openBoothId) ?? null : null;
  const openDepth = openBooth !== null ? depthByBooth.get(openBooth.id) ?? null : null;

  return (
    <main className={styles.root}>
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={onMap}>
          ← マップ
        </button>
        <div className={styles.headTitle}>
          <p className={styles.kicker}>むらずかん</p>
          <h1>スタンプ台紙</h1>
        </div>
        <span className={styles.counter}>
          {caughtCount}
          <small>/{total}</small>
        </span>
      </div>

      <MissionBoard missions={missions} reduced={reduced} />

      {allMissionsDone ? (
        <div className={`${styles.reward} ${styles.rewardDone}`}>
          <span className={styles.rewardIcon} aria-hidden="true">
            👑
          </span>
          <div>
            <strong>ぜんぶのミッション達成！</strong>
            <small>むらの なかまが ふえた！</small>
          </div>
        </div>
      ) : null}

      <p className={styles.sheetLead}>あつめたスタンプ</p>
      <div className={styles.sheet}>
        <div className={styles.grid}>
          {DEMO_BOOTHS.map((booth) => (
            <StampSlot
              key={booth.id}
              booth={booth}
              depth={depthByBooth.get(booth.id) ?? null}
              isNew={booth.id === justStampedId}
              reduced={reduced}
              onOpen={() => {
                setOpenBoothId(booth.id);
                track("item_view", { surface: "concierge", id: booth.id, kind: "zukan_stamp" });
              }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {openBooth !== null && openDepth !== null ? (
          <StampDetail booth={openBooth} depth={openDepth} reduced={reduced} onClose={() => setOpenBoothId(null)} />
        ) : null}
      </AnimatePresence>
    </main>
  );
}
