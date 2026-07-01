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
  const complete = caughtCount >= total;
  const completeRef = useRef(false);

  useEffect(() => {
    if (complete && !completeRef.current) {
      completeRef.current = true;
      unlockCharacter(HIDDEN_REWARD_CHARACTER_ID);
      track("unlock_hidden", { surface: "concierge", id: HIDDEN_REWARD_CHARACTER_ID });
    }
  }, [complete]);

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

      <div className={styles.progressTrack}>
        <motion.div
          className={styles.progressFill}
          initial={false}
          animate={{ width: `${(caughtCount / total) * 100}%` }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>

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

      <div className={`${styles.reward} ${complete ? styles.rewardDone : ""}`}>
        <span className={styles.rewardIcon} aria-hidden="true">
          {complete ? "👑" : "🎁"}
        </span>
        <div>
          <strong>{complete ? "コンプリート！隠しキャラ解放" : "ぜんぶ集めて 隠しキャラGET"}</strong>
          <small>{complete ? "むらの なかまが ひとり ふえた！" : `あと ${total - caughtCount} マス`}</small>
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
