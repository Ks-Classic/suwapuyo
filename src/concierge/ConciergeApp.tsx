import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SoundFX } from "../audio/SoundFX";
import type {
  AcquisitionSource,
  BoothExhibitor,
  ChildAgeBand,
  ChildGender,
  ChildInfo,
  VisitDepth,
  VisitorType,
} from "../fuwafuwa-land/map/boothMapData";
import { track } from "../shared/analytics";
import { sendAnnouncement, subscribeAnnouncements, type Announcement } from "./announcementStore";
import styles from "./concierge.module.css";
import { DEMO_BOOTHS } from "./demoData";
import { MapScreen } from "./MapScreen";
import { StampBook } from "./StampBook";
import {
  getOrCreateVisitor,
  listStamps,
  saveVisitor,
  upsertStamp,
  type ConciergeStamp,
  type ConciergeVisitor,
} from "./visitorStore";
import { getBoothIdFromLiffUrl, initializeLiff, loginLiff, type LiffSession } from "./liffClient";

/**
 * 村の案内所（当日マップ＋スタンプラリー）デモの器。
 *
 * これは Codex 実装のための足場（scaffold）です。実装の正は
 * `docs/40_yourtime-platform/03_village-concierge-design.md`（§12 明日デモ詳細）
 * ＋ `04_codex-handoff.md`。各 Scaffold を実画面へ差し替えていく。
 *
 * ルーティング:
 *   /concierge        → 来場者フロー（オンボ→マップ→QRスタンプ→スタンプ帳）
 *   /concierge/staff  → スタッフ（会場アナウンス送信）
 *   ?booth=demo-01    → ブースQRからの着地（QRスタンプ画面）
 */

type ConciergeRoute = "visitor" | "staff";
type VisitorStep = "welcome" | "party" | "children-count" | "children" | "adults" | "source" | "health" | "tutorial" | "map" | "stamp-book";

function resolveRoute(): ConciergeRoute {
  if (typeof window === "undefined") {
    return "visitor";
  }
  return window.location.pathname.startsWith("/concierge/staff") ? "staff" : "visitor";
}

function getBoothParam(): string | null {
  return getBoothIdFromLiffUrl();
}

// LIFF ID は env から（ハードコード禁止）。Codex が liff.init に使う。
const liffId: string | undefined = import.meta.env.VITE_LIFF_ID;

const CHILD_AGE_BANDS: ChildAgeBand[] = ["0", "1", "2", "3", "4", "5", "6", "7-9", "10-12", "13+"];
const DEPTH_LABELS: Record<VisitDepth, string> = {
  visited: "寄っただけ",
  explained: "説明きいた",
  experienced: "体験した",
};
const DEPTH_ICONS: Record<VisitDepth, string> = {
  visited: "🚶",
  explained: "👂",
  experienced: "✨",
};

// AudioContextはユーザー操作後にしか鳴らせないため、初回利用時まで生成を遅らせる。
let sharedSfx: SoundFX | null = null;
function getSfx(): SoundFX {
  if (sharedSfx === null) {
    sharedSfx = new SoundFX();
  }
  return sharedSfx;
}

const CONFETTI_COLORS = ["#F5A623", "#FFD93D", "#FF8FAB", "#6BBF4E", "#5BC0EB"];
const CONFETTI_PIECES = Array.from({ length: 7 }, (_, index) => ({
  angle: (360 / 7) * index - 90,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
}));

function StampCelebration({ color, reduced }: { color: string; reduced: boolean }) {
  if (reduced) {
    return null;
  }
  return (
    <>
      <motion.div
        className={styles.inkSplash}
        style={{ background: color }}
        initial={{ scale: 0.3, opacity: 0.32 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <motion.div
        className={styles.stampRing}
        style={{ borderColor: color }}
        initial={{ scale: 0.6, opacity: 0.7 }}
        animate={{ scale: 1.8, opacity: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      />
      {CONFETTI_PIECES.map((piece, index) => {
        const radians = (piece.angle * Math.PI) / 180;
        return (
          <motion.span
            key={index}
            className={styles.confettiPiece}
            style={{ background: piece.color }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
            animate={{
              x: Math.cos(radians) * 54,
              y: Math.sin(radians) * 54 - 12,
              opacity: 0,
              scale: 0.4,
              rotate: piece.angle,
            }}
            transition={{ duration: 0.55, delay: 0.05 + index * 0.02, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

interface AnnouncementBannerProps {
  announcement: Announcement | null;
  onClose: () => void;
}

function AnnouncementBanner({ announcement, onClose }: AnnouncementBannerProps) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {announcement !== null ? (
        <motion.div
          className={styles.announcement}
          initial={reduced ? false : { y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: -80, opacity: 0 }}
          transition={reduced ? { duration: 0.12 } : { type: "spring", stiffness: 360, damping: 28 }}
          onClick={onClose}
          role="status"
        >
          <span className={styles.announcementIcon}>i</span>
          <span>{announcement.text}</span>
          <button type="button" aria-label="閉じる">×</button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function useAnnouncements() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAnnouncements((next) => {
      setAnnouncement(next);
      track("announce_recv", { surface: "concierge", id: next.id });
      try {
        getSfx().select();
      } catch {
        // 音が出せない環境でもバナー表示自体は成立させる。
      }
      window.setTimeout(() => setAnnouncement((current) => (current?.id === next.id ? null : current)), 7000);
    });
    return unsubscribe;
  }, []);

  return { announcement, clearAnnouncement: () => setAnnouncement(null) };
}

const PARTY_ICONS: Record<VisitorType, string> = {
  family: "👨‍👩‍👧",
  with_kids: "🧑‍🤝‍🧑",
  solo: "🧍",
  other: "❔",
};

const CHILD_GENDER_ICONS: Record<ChildGender, string> = {
  boy: "👦",
  girl: "👧",
  other: "🧒",
};

function VisitorPreview({
  visitor,
  kids,
  reduced,
}: {
  visitor: Partial<ConciergeVisitor>;
  kids: ChildInfo[];
  reduced: boolean;
}) {
  const partyIcon = visitor.visitor_type !== undefined ? PARTY_ICONS[visitor.visitor_type] : "❔";
  return (
    <div className={styles.preview} aria-hidden="true">
      <span className={styles.previewIcon}>
        <span>{partyIcon}</span>
      </span>
      <AnimatePresence>
        {kids.map((child, index) => (
          <motion.span
            key={index}
            layout={!reduced}
            className={styles.previewIcon}
            initial={reduced ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 360, damping: 18 }}
          >
            <span>{CHILD_GENDER_ICONS[child.gender]}</span>
            <small>{child.age_band}才</small>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

function requiresChildren(type: VisitorType | undefined): boolean {
  return type === "family" || type === "with_kids";
}

function findBooth(boothId: string | null): BoothExhibitor {
  return DEMO_BOOTHS.find((booth) => booth.id === boothId) ?? DEMO_BOOTHS[0];
}

function useConciergeData() {
  const [visitor, setVisitor] = useState<ConciergeVisitor | null>(null);
  const [stamps, setStamps] = useState<ConciergeStamp[]>([]);
  const [liffSession, setLiffSession] = useState<LiffSession>({ status: "loading", inClient: false });

  async function refresh() {
    const [nextVisitor, nextStamps] = await Promise.all([getOrCreateVisitor(), listStamps()]);
    setVisitor(nextVisitor);
    setStamps(nextStamps);
  }

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, []);

  useEffect(() => {
    void initializeLiff(liffId).then(async (session) => {
      setLiffSession(session);
      if (session.lineUserId !== undefined) {
        await saveVisitor({ line_user_id: session.lineUserId });
        await refresh();
      }
    });
  }, []);

  return { visitor, stamps, liffSession, refresh };
}

interface OptionButtonProps {
  selected?: boolean;
  label: string;
  detail?: string;
  onClick: () => void;
}

const GUIDE_CHARACTER_IMAGE = "/content/01_すわぷよ/01_キャラクター/02_表示用/02_わーわー.png";

const STEP_GUIDE_LINES: Partial<Record<VisitorStep, string>> = {
  party: "だれと来たか教えて！",
  "children-count": "何人で来たのかな？",
  children: "ひとりずつ教えてね",
  adults: "大人は何人いっしょ？",
  source: "村のこと、どこで知った？",
  health: "さいごの質問！",
  tutorial: "準備ばっちり、村に入ろう！",
};

const SURVEY_STEPS: VisitorStep[] = ["party", "children-count", "children", "adults", "source", "health"];

function StepDots({ step }: { step: VisitorStep }) {
  const index = SURVEY_STEPS.indexOf(step);
  if (index < 0) {
    return null;
  }
  return (
    <div className={styles.stepDots} aria-hidden="true">
      {SURVEY_STEPS.map((surveyStep, dotIndex) => (
        <span
          key={surveyStep}
          className={`${styles.stepDot} ${
            dotIndex === index ? styles.stepDotActive : dotIndex < index ? styles.stepDotDone : ""
          }`}
        />
      ))}
    </div>
  );
}

function CharacterHost({ step }: { step: VisitorStep }) {
  const reduced = useReducedMotion();
  const line = STEP_GUIDE_LINES[step];
  return (
    <div className={styles.guideRow}>
      <motion.img
        key={step}
        src={GUIDE_CHARACTER_IMAGE}
        alt=""
        className={styles.guideCharacter}
        initial={reduced ? false : { scale: 0.6, rotate: -8, opacity: 0 }}
        animate={reduced ? { y: 0 } : { scale: 1, rotate: 0, opacity: 1, y: [0, -6, 0] }}
        transition={
          reduced
            ? { duration: 0 }
            : {
                scale: { type: "spring", stiffness: 300, damping: 14 },
                rotate: { type: "spring", stiffness: 300, damping: 14 },
                opacity: { duration: 0.2 },
                y: { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
              }
        }
      />
      {line !== undefined ? (
        <div className={styles.guideBubble}>
          <p>{line}</p>
        </div>
      ) : null}
    </div>
  );
}

function OptionButton({ selected = false, label, detail, onClick }: OptionButtonProps) {
  return (
    <button type="button" className={`${styles.optionButton} ${selected ? styles.selectedOption : ""}`} onClick={onClick}>
      <span>{label}</span>
      {detail !== undefined ? <small>{detail}</small> : null}
    </button>
  );
}

function WelcomeStep({ liffSession, onStart }: { liffSession: LiffSession; onStart: () => void }) {
  const reduced = useReducedMotion();
  const liffLabel =
    liffSession.status === "ready"
      ? `LINE連携済み${liffSession.displayName !== undefined ? ` / ${liffSession.displayName}` : ""}`
      : liffSession.status === "loading"
        ? "LINE連携を確認中"
        : liffSession.status === "login_required"
          ? "LINEと連携するとマイページが引き継げます"
          : liffSession.status === "disabled"
            ? "通常Web fallbackで動作"
            : "LINE連携はfallbackで継続";
  return (
    <section className={styles.panel}>
      <motion.img
        src={GUIDE_CHARACTER_IMAGE}
        alt=""
        className={styles.mascot}
        initial={reduced ? false : { scale: 0.72, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 18 }}
      />
      <p className={styles.kicker}>YourTIME 村の案内所</p>
      <h1>今日は、親子の時間を集めにいこう</h1>
      <p className={styles.lead}>家族構成をタップで入れると、マップとスタンプ帳がすぐ使えます。</p>
      <button type="button" className={styles.primaryButton} onClick={onStart}>
        はじめる
      </button>
      <p className={styles.liffState}>{liffLabel}</p>
      {liffSession.status === "login_required" ? (
        <button type="button" className={styles.textButton} onClick={loginLiff}>
          LINEと連携する
        </button>
      ) : null}
    </section>
  );
}

interface OnboardingProps {
  step: VisitorStep;
  visitor: ConciergeVisitor | null;
  draftChildren: ChildInfo[];
  activeChild: number;
  setStep: (step: VisitorStep) => void;
  setDraftChildren: (children: ChildInfo[]) => void;
  setActiveChild: (index: number) => void;
  onSave: (input: Partial<ConciergeVisitor>, next: VisitorStep) => void;
  onSkipAll: () => void;
}

function SkipAllLink({ onSkipAll }: { onSkipAll: () => void }) {
  return (
    <button type="button" className={styles.textButton} onClick={onSkipAll}>
      あとで答える（村に入る）
    </button>
  );
}

function Onboarding({
  step,
  visitor,
  draftChildren,
  activeChild,
  setStep,
  setDraftChildren,
  setActiveChild,
  onSave,
  onSkipAll,
}: OnboardingProps) {
  const visitorType = visitor?.visitor_type;
  const reduced = useReducedMotion();

  if (step === "party") {
    return (
      <section className={styles.panel}>
        <StepDots step={step} />
        <CharacterHost step={step} />
        <p className={styles.kicker}>STEP 1 / 6</p>
        <h1>だれと来た？</h1>
        <VisitorPreview visitor={visitor ?? {}} kids={draftChildren} reduced={!!reduced} />
        <div className={styles.optionGrid}>
          <OptionButton label="家族" detail="親子で来場" onClick={() => onSave({ visitor_type: "family" }, "children-count")} />
          <OptionButton label="子ども連れ" detail="親戚・友人など" onClick={() => onSave({ visitor_type: "with_kids" }, "children-count")} />
          <OptionButton label="ひとり" detail="大人のみ" onClick={() => onSave({ visitor_type: "solo", children: [] }, "adults")} />
          <OptionButton label="その他" detail="あとで調整" onClick={() => onSave({ visitor_type: "other", children: [] }, "adults")} />
        </div>
        <SkipAllLink onSkipAll={onSkipAll} />
      </section>
    );
  }

  if (step === "children-count") {
    return (
      <section className={styles.panel}>
        <StepDots step={step} />
        <CharacterHost step={step} />
        <p className={styles.kicker}>STEP 2 / 6</p>
        <h1>お子さんは何人？</h1>
        <VisitorPreview visitor={visitor ?? {}} kids={draftChildren} reduced={!!reduced} />
        <div className={styles.countGrid}>
          {[1, 2, 3, 4].map((count) => (
            <button
              key={count}
              type="button"
              className={styles.countButton}
              onClick={() => {
                setDraftChildren(
                  Array.from({ length: count }, (_, index) => draftChildren[index] ?? { age_band: "5", gender: "other" }),
                );
                setActiveChild(0);
                setStep("children");
              }}
            >
              {count === 4 ? "4+" : count}
            </button>
          ))}
        </div>
        <SkipAllLink onSkipAll={onSkipAll} />
      </section>
    );
  }

  if (step === "children") {
    return (
      <section className={styles.panel}>
        <StepDots step={step} />
        <CharacterHost step={step} />
        <p className={styles.kicker}>STEP 3 / 6</p>
        <h1>お子さんのこと</h1>
        <VisitorPreview visitor={visitor ?? {}} kids={draftChildren} reduced={!!reduced} />
        <div className={styles.childList}>
          {draftChildren.map((child, index) => (
            <motion.div key={index} className={`${styles.childRow} ${activeChild === index ? styles.childRowOpen : ""}`} layout={!reduced}>
              <button type="button" className={styles.childHeader} onClick={() => setActiveChild(index)}>
                <span>{index + 1}人目</span>
                <small>{child.age_band}才 / {child.gender === "boy" ? "おとこのこ" : child.gender === "girl" ? "おんなのこ" : "どちらでも"}</small>
              </button>
              {activeChild === index ? (
                <div className={styles.childBody}>
                  <div className={styles.chipRow}>
                    {CHILD_AGE_BANDS.map((ageBand) => (
                      <button
                        key={ageBand}
                        type="button"
                        className={`${styles.chip} ${child.age_band === ageBand ? styles.chipSelected : ""}`}
                        onClick={() => {
                          const next = draftChildren.map((item, childIndex) =>
                            childIndex === index ? { ...item, age_band: ageBand } : item,
                          );
                          setDraftChildren(next);
                        }}
                      >
                        {ageBand}
                      </button>
                    ))}
                  </div>
                  <div className={styles.segmented}>
                    {(["boy", "girl", "other"] satisfies ChildGender[]).map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        className={child.gender === gender ? styles.segmentSelected : ""}
                        onClick={() => {
                          const next = draftChildren.map((item, childIndex) =>
                            childIndex === index ? { ...item, gender } : item,
                          );
                          setDraftChildren(next);
                          if (index + 1 < draftChildren.length) {
                            setActiveChild(index + 1);
                          }
                        }}
                      >
                        {gender === "boy" ? "おとこのこ" : gender === "girl" ? "おんなのこ" : "どちらでも"}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </motion.div>
          ))}
        </div>
        <button type="button" className={styles.primaryButton} onClick={() => onSave({ children: draftChildren }, "adults")}>
          これでOK
        </button>
        <SkipAllLink onSkipAll={onSkipAll} />
      </section>
    );
  }

  if (step === "adults") {
    return (
      <section className={styles.panel}>
        <StepDots step={step} />
        <CharacterHost step={step} />
        <p className={styles.kicker}>STEP 4 / 6</p>
        <h1>大人は何人？</h1>
        <div className={styles.countGrid}>
          {[1, 2, 3].map((count) => (
            <button key={count} type="button" className={styles.countButton} onClick={() => onSave({ adults_count: count }, "source")}>
              {count === 3 ? "3+" : count}
            </button>
          ))}
        </div>
        <SkipAllLink onSkipAll={onSkipAll} />
      </section>
    );
  }

  if (step === "source") {
    const sources: Array<{ id: AcquisitionSource; label: string }> = [
      { id: "instagram", label: "Instagram/SNS" },
      { id: "friend", label: "知人・友人" },
      { id: "exhibitor", label: "出展者から" },
      { id: "official", label: "YourTIME公式" },
      { id: "walk_in", label: "通りがかり" },
      { id: "other", label: "その他" },
    ];
    return (
      <section className={styles.panel}>
        <StepDots step={step} />
        <CharacterHost step={step} />
        <p className={styles.kicker}>STEP 5 / 6</p>
        <h1>来場のきっかけは？</h1>
        <div className={styles.chipWrap}>
          {sources.map((source) => (
            <button key={source.id} type="button" className={styles.chipLarge} onClick={() => onSave({ acquisition_source: source.id }, "health")}>
              {source.label}
            </button>
          ))}
        </div>
        <SkipAllLink onSkipAll={onSkipAll} />
      </section>
    );
  }

  if (step === "health") {
    return (
      <section className={styles.panel}>
        <StepDots step={step} />
        <CharacterHost step={step} />
        <p className={styles.kicker}>STEP 6 / 6</p>
        <h1>お仕事は健康・医療系？</h1>
        <p className={styles.lead}>出展者の説明をその場でちょうどいい専門度に合わせるために聞いています。</p>
        <div className={styles.optionGrid}>
          <OptionButton label="はい" detail="関係者" onClick={() => onSave({ is_health_pro: true, onboarded_at: new Date().toISOString() }, "tutorial")} />
          <OptionButton label="いいえ" detail="一般" onClick={() => onSave({ is_health_pro: false, onboarded_at: new Date().toISOString() }, "tutorial")} />
        </div>
        <SkipAllLink onSkipAll={onSkipAll} />
      </section>
    );
  }

  if (step === "tutorial") {
    return (
      <section className={styles.panel}>
        <StepDots step={step} />
        <CharacterHost step={step} />
        <p className={styles.kicker}>つかい方</p>
        <h1>マップで探して、ブースで時計スタンプ</h1>
        <div className={styles.tutorialGrid}>
          <div>地図は指で動かせます</div>
          <div>ブースQRでスタンプが入ります</div>
        </div>
        <button type="button" className={styles.primaryButton} onClick={() => setStep("map")}>
          村に入る
        </button>
      </section>
    );
  }

  if (!requiresChildren(visitorType)) {
    return null;
  }
  return null;
}

interface StampScreenProps {
  booth: BoothExhibitor;
  stamps: ConciergeStamp[];
  onStamped: () => void;
  onBack: () => void;
}

function StampScreen({ booth, stamps, onStamped, onBack }: StampScreenProps) {
  const reduced = useReducedMotion();
  const [doneDepth, setDoneDepth] = useState<VisitDepth | null>(null);
  const stamped = stamps.find((stamp) => stamp.exhibitor_id === booth.id);

  async function stamp(depth: VisitDepth) {
    await upsertStamp(booth.id, depth);
    setDoneDepth(depth);
    track("stamp_get", { surface: "concierge", id: booth.id, depth });
    try {
      getSfx().refill();
    } catch {
      // 音が出せない環境(自動再生制限など)でもスタンプ自体は成立させる。
    }
    window.setTimeout(onStamped, 850);
  }

  return (
    <main className={styles.root}>
      <section className={styles.panel}>
        <button type="button" className={styles.backButton} onClick={onBack}>マップへ</button>
        <p className={styles.kicker}>ブースQR</p>
        <h1>{booth.name}</h1>
        <div className={styles.stampStage}>
          <div
            className={styles.stampClock}
            style={{ "--ink": booth.themeColor ?? "#F5A623" } as React.CSSProperties}
          >
            {/* 押される前の下地=時計文字盤(むらずかんの未取得マスと同じ表現) */}
            <span className={styles.clockFace} aria-hidden="true">
              {Array.from({ length: 12 }, (_, index) => (
                <span key={index} className={styles.clockTick} style={{ transform: `rotate(${index * 30}deg)` }} />
              ))}
              <span className={styles.clockHandH} />
              <span className={styles.clockHandM} />
            </span>
            <span className={styles.stampNo}>{booth.boothNo}</span>
            {/* 獲得=時計にインクが"押される" */}
            <AnimatePresence>
              {doneDepth !== null ? (
                <motion.span
                  key="ink"
                  className={styles.inkStamp}
                  initial={reduced ? false : { scale: 1.7, rotate: -16, opacity: 0 }}
                  animate={{ scale: 1, rotate: -4, opacity: 1 }}
                  transition={reduced ? { duration: 0.12 } : { type: "spring", stiffness: 520, damping: 14 }}
                >
                  <span className={styles.inkRing} aria-hidden="true" />
                  <span className={styles.inkGlyph} aria-hidden="true">
                    {booth.stampEmoji ?? "OK"}
                  </span>
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {doneDepth !== null ? (
              <StampCelebration key="celebration" color={booth.themeColor ?? "#F5A623"} reduced={!!reduced} />
            ) : null}
          </AnimatePresence>
        </div>
        {doneDepth === null ? (
          <div className={styles.depthGrid}>
            {(["visited", "explained", "experienced"] satisfies VisitDepth[]).map((depth) => (
              <button key={depth} type="button" className={styles.depthButton} onClick={() => void stamp(depth)}>
                <span>{DEPTH_ICONS[depth]}</span>
                {DEPTH_LABELS[depth]}
              </button>
            ))}
          </div>
        ) : (
          <motion.div className={styles.stampDone} initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <strong>スタンプGET</strong>
            <span>{DEPTH_LABELS[doneDepth]}</span>
          </motion.div>
        )}
        {stamped !== undefined ? <p className={styles.liffState}>前回: {DEPTH_LABELS[stamped.depth]}。深さは上書きできます。</p> : null}
      </section>
    </main>
  );
}

function VisitorApp({ boothParam }: { boothParam: string | null }) {
  const { visitor, stamps, liffSession, refresh } = useConciergeData();
  const initialStep: VisitorStep = boothParam !== null ? "map" : visitor?.onboarded_at !== undefined ? "map" : "welcome";
  const [step, setStep] = useState<VisitorStep>(initialStep);
  const [stampBoothId, setStampBoothId] = useState<string | null>(boothParam);
  const [justStampedId, setJustStampedId] = useState<string | null>(null);
  const [draftChildren, setDraftChildren] = useState<ChildInfo[]>(visitor?.children ?? []);
  const [activeChild, setActiveChild] = useState(0);
  const { announcement, clearAnnouncement } = useAnnouncements();

  async function handleSave(input: Partial<ConciergeVisitor>, next: VisitorStep) {
    await saveVisitor(input);
    await refresh();
    if (next === "tutorial") {
      track("onboard_done", { surface: "concierge" });
    }
    setStep(next);
  }

  async function handleSkipAll() {
    // 「あとで」は質問への回答ではなく離脱。onboarded_at を打って
    // 再訪時に同じ質問を繰り返さないようにする(完了扱いと区別はしない=再度の入力導線は今後の課題)。
    await saveVisitor({ children: draftChildren, onboarded_at: new Date().toISOString() });
    await refresh();
    track("onboard_skip", { surface: "concierge", step });
    setStep("map");
  }

  if (stampBoothId !== null) {
    return (
      <>
        <AnnouncementBanner announcement={announcement} onClose={clearAnnouncement} />
        <StampScreen
          booth={findBooth(stampBoothId)}
          stamps={stamps}
          onBack={() => setStampBoothId(null)}
          onStamped={() => {
            void refresh();
            setJustStampedId(stampBoothId);
            setStep("stamp-book");
            setStampBoothId(null);
          }}
        />
      </>
    );
  }

  return (
    <>
      <AnnouncementBanner announcement={announcement} onClose={clearAnnouncement} />
      {step === "welcome" ? (
        <main className={styles.root}>
          <WelcomeStep liffSession={liffSession} onStart={() => setStep("party")} />
        </main>
      ) : step === "map" ? (
        <MapScreen stamps={stamps} onOpenStamp={setStampBoothId} onStampBook={() => setStep("stamp-book")} />
      ) : step === "stamp-book" ? (
        <StampBook stamps={stamps} justStampedId={justStampedId} onMap={() => setStep("map")} />
      ) : (
        <main className={styles.root}>
          <Onboarding
            step={step}
            visitor={visitor}
            draftChildren={draftChildren}
            activeChild={activeChild}
            setStep={setStep}
            setDraftChildren={setDraftChildren}
            setActiveChild={setActiveChild}
            onSave={(input, next) => void handleSave(input, next)}
            onSkipAll={() => void handleSkipAll()}
          />
        </main>
      )}
    </>
  );
}

function StaffApp() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("Supabase未設定時は送信せず、画面内で動作確認します。");
  const { announcement, clearAnnouncement } = useAnnouncements();

  async function submit() {
    try {
      const sent = await sendAnnouncement(text);
      if (sent === null) {
        setStatus("Supabaseが未設定です。ローカルfallbackとして送信文を確認しました。");
      } else {
        setStatus("送信しました。来場者タブにバナーが出ます。");
      }
      setText("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "announcement_send_failed");
    }
  }

  return (
    <>
      <AnnouncementBanner announcement={announcement} onClose={clearAnnouncement} />
      <main className={styles.root}>
        <section className={styles.panel}>
          <p className={styles.kicker}>スタッフ</p>
          <h1>会場アナウンス</h1>
          <textarea
            className={styles.textarea}
            value={text}
            maxLength={160}
            onChange={(event) => setText(event.target.value)}
            placeholder="例: 14時からステージ前で体験が始まります"
          />
          <button type="button" className={styles.primaryButton} disabled={text.trim().length === 0} onClick={() => void submit()}>
            送信
          </button>
          <p className={styles.liffState}>{status}</p>
        </section>
      </main>
    </>
  );
}

export function ConciergeApp() {
  const route = resolveRoute();
  if (route === "staff") {
    return <StaffApp />;
  }
  return <VisitorApp boothParam={getBoothParam()} />;
}
