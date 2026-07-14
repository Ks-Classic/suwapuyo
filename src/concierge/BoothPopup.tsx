import { motion, useReducedMotion } from "framer-motion";
import type { BoothExhibitor } from "../fuwafuwa-land/map/boothMapData";
import styles from "./boothPopup.module.css";

const GUIDE_CHARACTER_IMAGE = "/content/01_すわぷよ/01_キャラクター/02_表示用/02_わーわー.png";
const YT_LETTERS: Array<{ ch: string; color: string }> = [
  { ch: "Y", color: "#5BC0EB" },
  { ch: "o", color: "#F5A623" },
  { ch: "u", color: "#6BBF4E" },
  { ch: "r", color: "#FF8FAB" },
  { ch: "T", color: "#5BC0EB" },
  { ch: "I", color: "#F5A623" },
  { ch: "M", color: "#6BBF4E" },
  { ch: "E", color: "#FF8FAB" },
  { ch: ".", color: "#5BC0EB" },
];

/**
 * ブース紹介ポップアップ。
 * モデル = YourTIME公式のインスタ投稿カード(docs素材 yourtime-popup-step-1/2.png)。
 * 青空地・カラフルなYourTIMEワードマーク・お祭り装飾・大きな遊び心のタイトル・フッター日時。
 */
export function BoothPopup({
  booth,
  onStamp,
  onClose,
}: {
  booth: BoothExhibitor;
  /** スタンプ対象ブースのみ渡す。エリア等の情報POIでは省略しCTAを出さない。 */
  onStamp?: () => void;
  onClose: () => void;
}) {
  const reduced = !!useReducedMotion();
  const color = booth.themeColor ?? "#F5A623";

  return (
    <motion.div
      className={styles.backdrop}
      role="presentation"
      onClick={onClose}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.article
        className={styles.card}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${booth.name} ブース紹介`}
        initial={reduced ? false : { scale: 0.7, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={reduced ? { opacity: 0 } : { scale: 0.8, y: 30, opacity: 0 }}
        transition={reduced ? { duration: 0.12 } : { type: "spring", stiffness: 260, damping: 22 }}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="閉じる">
          ×
        </button>

        <div className={styles.wordmark} aria-label="YourTIME 8th">
          {YT_LETTERS.map((letter, index) => (
            <span key={index} style={{ color: letter.color }}>
              {letter.ch}
            </span>
          ))}
          <span className={styles.eighth}>8th</span>
        </div>

        <span className={styles.ribbon}>ブース紹介</span>

        <h2 className={styles.title} style={{ color }}>
          {booth.name}
        </h2>

        <div className={styles.hero} style={{ "--hero-color": color } as React.CSSProperties}>
          <span className={styles.spark} data-pos="tl" aria-hidden="true">
            🎆
          </span>
          <span className={styles.spark} data-pos="tr" aria-hidden="true">
            ✨
          </span>
          <span className={styles.lantern} aria-hidden="true">
            🏮
          </span>
          <span className={styles.heroGlyph} aria-hidden="true">
            {booth.stampEmoji ?? "✨"}
          </span>
          <motion.img
            src={GUIDE_CHARACTER_IMAGE}
            alt=""
            className={styles.heroChar}
            animate={reduced ? undefined : { y: [0, -6, 0] }}
            transition={reduced ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className={styles.tagBand}>
          <span className={styles.tag} style={{ background: color }}>
            {booth.category}
          </span>
          {booth.boothNo !== "" ? <span className={styles.boothNo}>ブース {booth.boothNo}</span> : null}
        </div>

        <p className={styles.summary}>{booth.summary}</p>
        <p className={styles.activity}>{booth.activity}</p>

        <div className={styles.meta}>
          <span>📅 2026.08.02 Sun 10:30〜16:30</span>
          <span>📍 東京流通センター</span>
        </div>

        <div className={styles.actions}>
          {onStamp !== undefined ? (
            <>
              <button type="button" className={styles.primary} onClick={onStamp}>
                このブースでスタンプ
              </button>
              <button type="button" className={styles.secondary} onClick={onClose}>
                とじる
              </button>
            </>
          ) : (
            <button type="button" className={styles.primary} onClick={onClose} style={{ gridColumn: "1 / -1" }}>
              とじる
            </button>
          )}
        </div>
      </motion.article>
    </motion.div>
  );
}
