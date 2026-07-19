// お口体操ミッションv2。唯一の出口を「できた！」に限定し、スキップを構造的に持たない。
import { useEffect, useRef, useState } from "react";
import { getTaisouMusic } from "../audio/TaisouMusic";
import { VillageNarrator } from "../components/VillageNarrator";
import { track } from "../shared/analytics";
import { incrementTaisouCount } from "../shared/progressStore";
import styles from "../styles/demo.module.css";
import { PICT_EMOJI, TAISOU_TIMING, pickMissionHost, pickMouthMission } from "./mouthMissions";

type TaisouMissionPhase = "yokoku" | "tame" | "kakegoe" | "honpen" | "matsu";

export interface TaisouMissionProps {
  /** できた後のスタンプ演出完了時だけ呼ばれる。 */
  onComplete: () => void;
}

export function TaisouMission({ onComplete }: TaisouMissionProps) {
  const [host] = useState(() => pickMissionHost());
  const [mission] = useState(() => pickMouthMission());
  const [phase, setPhase] = useState<TaisouMissionPhase>("yokoku");
  const [beat, setBeat] = useState(0);
  const [stamped, setStamped] = useState(false);
  const musicRef = useRef(getTaisouMusic());
  const completionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const music = musicRef.current;
    if (phase === "yokoku") {
      music.playDrumroll(TAISOU_TIMING.YOKOKU_MS);
      const timer = window.setTimeout(() => setPhase("tame"), TAISOU_TIMING.YOKOKU_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === "tame") {
      const timer = window.setTimeout(() => setPhase("kakegoe"), TAISOU_TIMING.TAME_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === "kakegoe") {
      music.playIntro(mission.musicId);
      const timer = window.setTimeout(() => setPhase("honpen"), TAISOU_TIMING.KAKEGOE_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === "honpen") music.startLoop(mission.musicId);
    return undefined;
  }, [mission.musicId, phase]);

  useEffect(() => {
    if (phase !== "honpen") return undefined;
    const timer = window.setTimeout(() => {
      const next = beat + 1;
      if (next >= mission.steps.length) {
        musicRef.current.stopLoop();
        setPhase("matsu");
      } else {
        setBeat(next);
      }
    }, TAISOU_TIMING.BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [beat, mission.steps.length, phase]);

  useEffect(() => () => {
    musicRef.current.stopLoop();
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
  }, []);

  const handleComplete = (): void => {
    if (stamped) return;
    setStamped(true);
    musicRef.current.playFanfare();
    incrementTaisouCount("mouth");
    track("item_view", { kind: "taisou_mouth_complete", id: mission.id, surface: "taisou_mission" });
    completionTimerRef.current = window.setTimeout(onComplete, TAISOU_TIMING.STAMP_MS);
  };

  const currentStep = mission.steps[Math.min(beat, mission.steps.length - 1)];
  const narratorLine = phase === "matsu" ? (stamped ? "じょうずっ！はなまるだ〜！" : "できたら おして！") : phase === "kakegoe" ? mission.kakegoe : "ここで…お口体操タイム！";

  return (
    <div className={styles.taisouOverlay} role="dialog" aria-modal="true" aria-label="お口体操ミッション">
      <div className={styles.taisouPanel}>
        <VillageNarrator line={narratorLine} compact />
        <div className={styles.taisouStage}>
          <img src={host.image} alt={host.name} className={`${styles.taisouHost} ${phase === "yokoku" ? styles.taisouHostPopIn : ""}`} />
          <div className={styles.taisouMain}>
            {phase === "yokoku" ? <div className={styles.taisouYokokuIcon}>♪</div> : null}
            {phase === "tame" ? <div className={styles.taisouTame}>すー…</div> : null}
            {phase === "kakegoe" ? <p className={styles.taisouKakegoe}>{mission.kakegoe}</p> : null}
            {phase === "honpen" ? <>
              <div className={styles.kanaBeat}>{currentStep.kana}</div>
              <div className={styles.mouthPict} aria-label={currentStep.pictLabel}><span>{PICT_EMOJI[currentStep.pict] ?? currentStep.pict}</span></div>
              <p className={styles.beatLine}>{currentStep.pictLabel}</p>
            </> : null}
            {phase === "matsu" ? stamped ? <div className={styles.taisouDone}>できたね！</div> : <>
              <p className={styles.taisouLine}>できたら おして！</p>
              <button type="button" className={styles.taisouCompleteButton} onClick={handleComplete}>できた！</button>
            </> : null}
          </div>
        </div>
        <p className={styles.taisouLine}>{mission.name}（{mission.aim}）</p>
      </div>
    </div>
  );
}
