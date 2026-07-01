import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import type { BoothExhibitor, VisitDepth } from "../fuwafuwa-land/map/boothMapData";
import { track } from "../shared/analytics";
import { unlockCharacter } from "../shared/progressStore";
import { DEMO_BOOTHS, HIDDEN_REWARD_CHARACTER_ID } from "./demoData";
import type { ConciergeStamp } from "./visitorStore";
import styles from "./stampBook.module.css";

/**
 * むらずかん = 村の図鑑。
 * モデル: ポケモン図鑑(未取得=グレーのシルエット/取得=フルカラー) × ポケカ Pocket(レア度フレーム/ホロ/傾き)。
 * 関与の深さ(寄った/説明/体験)を そのままレア度(★1/★2/★3・体験はホロ)に対応させる。
 */

interface RarityTier {
  stars: number;
  label: string;
  foil: "none" | "holo" | "full";
}

const RARITY: Record<VisitDepth, RarityTier> = {
  visited: { stars: 1, label: "であった", foil: "none" },
  explained: { stars: 2, label: "はなした", foil: "holo" },
  experienced: { stars: 3, label: "たいけん", foil: "full" },
};

function dexNo(booth: BoothExhibitor): string {
  return `No.${booth.boothNo.padStart(3, "0")}`;
}

function Stars({ count }: { count: number }) {
  return (
    <span className={styles.stars} aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <span key={index} className={index < count ? styles.starOn : styles.starOff}>
          ★
        </span>
      ))}
    </span>
  );
}

function CardFace({
  booth,
  depth,
  variant,
}: {
  booth: BoothExhibitor;
  depth: VisitDepth | null;
  variant: "grid" | "detail";
}) {
  const caught = depth !== null;
  const rarity = depth !== null ? RARITY[depth] : null;
  const color = booth.themeColor ?? "#F5A623";

  if (!caught) {
    return (
      <div className={`${styles.card} ${styles.cardLocked}`}>
        <span className={styles.dexNo}>{dexNo(booth)}</span>
        <span className={styles.lock} aria-hidden="true">
          🔒
        </span>
        <span className={styles.silhouette} aria-hidden="true">
          {booth.stampEmoji ?? "❔"}
        </span>
        <span className={styles.mystery}>？？？</span>
      </div>
    );
  }

  return (
    <div
      className={`${styles.card} ${styles[`foil_${rarity!.foil}`]}`}
      style={{ "--card-color": color } as React.CSSProperties}
    >
      {rarity!.foil !== "none" ? <span className={styles.holo} aria-hidden="true" /> : null}
      <span className={styles.dexNo}>{dexNo(booth)}</span>
      <Stars count={rarity!.stars} />
      <span className={styles.creature} aria-hidden="true">
        {booth.stampEmoji ?? "✨"}
      </span>
      <div className={styles.namePlate}>
        <strong>{booth.name}</strong>
        <small>
          {booth.category}・{rarity!.label}
        </small>
      </div>
      {variant === "detail" ? <span className={styles.shine} aria-hidden="true" /> : null}
    </div>
  );
}

function CollectionCard({
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
  return (
    <motion.button
      type="button"
      className={styles.cardButton}
      onClick={depth !== null ? onOpen : undefined}
      disabled={depth === null}
      aria-label={depth !== null ? `${booth.name} のカードを見る` : "未取得のブース"}
      initial={reduced || !isNew ? false : { scale: 0.3, rotateY: 180, opacity: 0 }}
      animate={{ scale: 1, rotateY: 0, opacity: 1 }}
      transition={
        reduced
          ? { duration: 0 }
          : isNew
            ? { type: "spring", stiffness: 260, damping: 18, delay: 0.1 }
            : { duration: 0.2 }
      }
      whileTap={depth !== null && !reduced ? { scale: 0.95 } : undefined}
    >
      <CardFace booth={booth} depth={depth} variant="grid" />
      {isNew ? <span className={styles.newBadge}>NEW!</span> : null}
    </motion.button>
  );
}

/** カード詳細: 指/傾きでホロが動く(ポケカ Pocket のイマーシブ風) */
function CardDetail({
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
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [12, -12]), { stiffness: 220, damping: 18 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-14, 14]), { stiffness: 220, damping: 18 });
  const glareX = useTransform(px, [-0.5, 0.5], ["12%", "88%"]);
  const glareY = useTransform(py, [-0.5, 0.5], ["12%", "88%"]);

  function handleMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (reduced) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function reset() {
    px.set(0);
    py.set(0);
  }

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
        className={styles.detailStage}
        onClick={(event) => event.stopPropagation()}
        onPointerMove={handleMove}
        onPointerLeave={reset}
        style={reduced ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
        initial={reduced ? false : { scale: 0.6, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={reduced ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
        transition={reduced ? { duration: 0.12 } : { type: "spring", stiffness: 240, damping: 20 }}
      >
        <CardFace booth={booth} depth={depth} variant="detail" />
        {!reduced ? (
          <motion.span
            className={styles.detailGlare}
            style={{ left: glareX, top: glareY }}
            aria-hidden="true"
          />
        ) : null}
      </motion.div>
      <p className={styles.detailHint}>カードを かたむけてみよう</p>
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
          <h1>あつめた ブース</h1>
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

      <div className={styles.grid}>
        {DEMO_BOOTHS.map((booth) => (
          <CollectionCard
            key={booth.id}
            booth={booth}
            depth={depthByBooth.get(booth.id) ?? null}
            isNew={booth.id === justStampedId}
            reduced={reduced}
            onOpen={() => {
              setOpenBoothId(booth.id);
              track("item_view", { surface: "concierge", id: booth.id, kind: "zukan_card" });
            }}
          />
        ))}
      </div>

      <div className={`${styles.reward} ${complete ? styles.rewardDone : ""}`}>
        <span className={styles.rewardIcon} aria-hidden="true">
          {complete ? "👑" : "🎁"}
        </span>
        <div>
          <strong>{complete ? "コンプリート！隠しキャラ解放" : "ぜんぶ集めて 隠しキャラGET"}</strong>
          <small>{complete ? "むらの クラウンレアが なかまに！" : `あと ${total - caughtCount} ブース`}</small>
        </div>
      </div>

      <AnimatePresence>
        {openBooth !== null && openDepth !== null ? (
          <CardDetail booth={openBooth} depth={openDepth} reduced={reduced} onClose={() => setOpenBoothId(null)} />
        ) : null}
      </AnimatePresence>
    </main>
  );
}
