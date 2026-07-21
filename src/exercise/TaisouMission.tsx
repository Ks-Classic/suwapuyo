// お口体操ミッションv2。目安時間はタイプ別で、完了・一時停止・スキップを利用者が選べる。
import { useEffect, useRef, useState } from "react";
import { getTaisouMusic } from "../audio/TaisouMusic";
import { VillageNarrator } from "../components/VillageNarrator";
import { track } from "../shared/analytics";
import { incrementTaisouCount } from "../shared/progressStore";
import styles from "../styles/demo.module.css";
import { pickMissionIntro } from "./missionIntro";
import { PICT_EMOJI, TAISOU_TIMING, pickMissionHost, pickMouthMission } from "./mouthMissions";

type TaisouMissionPhase = "yokoku" | "shoukai" | "cheer" | "countdown" | "launch" | "honpen" | "matsu";

export interface TaisouMissionProps {
  /** できた後のスタンプ演出完了時だけ呼ばれる。 */
  onComplete: () => void;
  /** 記録を増やさずゲームへ戻る。 */
  onSkip: () => void;
}

export function TaisouMission({ onComplete, onSkip }: TaisouMissionProps) {
  const [host] = useState(() => pickMissionHost());
  const [mission] = useState(() => pickMouthMission());
  const [intro] = useState(() => pickMissionIntro(host, mission));
  const [phase, setPhase] = useState<TaisouMissionPhase>("yokoku");
  const [countdown, setCountdown] = useState<3 | 2 | 1>(3);
  const [beat, setBeat] = useState(0);
  const [remainingSec, setRemainingSec] = useState<number>(() => mission.suggestedDurationSec);
  const [paused, setPaused] = useState(false);
  const [stamped, setStamped] = useState(false);
  const musicRef = useRef(getTaisouMusic());
  const completionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const music = musicRef.current;
    if (phase === "yokoku") {
      music.playDrumroll(TAISOU_TIMING.YOKOKU_MS);
      const timer = window.setTimeout(() => setPhase("shoukai"), TAISOU_TIMING.YOKOKU_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === "shoukai") {
      const timer = window.setTimeout(() => setPhase("cheer"), TAISOU_TIMING.SHOUKAI_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === "cheer") {
      const timer = window.setTimeout(() => setPhase("countdown"), TAISOU_TIMING.CHEER_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === "countdown") {
      music.playCountdownTick(countdown);
      const timer = window.setTimeout(() => {
        if (countdown > 1) {
          setCountdown(countdown === 3 ? 2 : 1);
        } else {
          setPhase("launch");
        }
      }, TAISOU_TIMING.COUNTDOWN_STEP_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === "launch") {
      music.playLaunch();
      music.playIntro(mission.musicId);
      const timer = window.setTimeout(() => setPhase("honpen"), TAISOU_TIMING.LAUNCH_MS);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [countdown, mission.musicId, phase]);

  useEffect(() => {
    const music = musicRef.current;
    if (phase !== "honpen" || paused) {
      music.stopLoop();
      return undefined;
    }
    music.startLoop(mission.musicId);
    return () => music.stopLoop();
  }, [mission.musicId, paused, phase]);

  useEffect(() => {
    if (phase !== "honpen" || paused) return undefined;
    const timer = window.setTimeout(() => {
      setBeat((current) => (current + 1) % mission.steps.length);
    }, TAISOU_TIMING.BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [beat, mission.steps.length, paused, phase]);

  useEffect(() => {
    if (phase !== "honpen" || paused) return undefined;
    const timer = window.setTimeout(() => {
      if (remainingSec <= 1) {
        setRemainingSec(0);
        setPhase("matsu");
        return;
      }
      setRemainingSec((current) => current - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [paused, phase, remainingSec]);

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

  const handleSkip = (): void => {
    musicRef.current.stopLoop();
    track("item_view", { kind: "taisou_mouth_skip", id: mission.id, surface: "taisou_mission" });
    onSkip();
  };

  const handlePause = (): void => {
    setPaused((current) => !current);
  };

  const currentStep = mission.steps[Math.min(beat, mission.steps.length - 1)];
  const narratorLine = paused
    ? "ひとやすみ。できるときに つづけよう！"
    : phase === "matsu"
      ? (stamped ? "じょうずっ！はなまるだ〜！" : "できたら おして！")
      : phase === "yokoku"
        ? `${host.name}が とびだしてきた！`
        : phase === "shoukai"
          ? intro.missionLine
          : phase === "cheer"
            ? intro.cheerLine
            : phase === "countdown"
              ? `${countdown}！`
              : phase === "launch"
                ? intro.launchLine
                : `${host.name}と いっしょに！`;

  return (
    <div className={styles.taisouOverlay} role="dialog" aria-modal="true" aria-label="お口体操ミッション">
      <div className={styles.taisouPanel}>
        <VillageNarrator line={narratorLine} compact />
        <div className={styles.taisouStage}>
          <img
            key={phase === "countdown" ? `countdown-${countdown}` : phase}
            src={host.image}
            alt={host.name}
            className={`${styles.taisouHost} ${phase === "yokoku" ? styles.taisouHostPopIn : ""} ${phase === "countdown" || phase === "launch" ? styles.taisouHostCountdown : ""}`}
          />
          <div className={styles.taisouMain} aria-live={phase === "countdown" || phase === "launch" ? "assertive" : "polite"}>
            {phase === "yokoku" ? <div className={styles.taisouYokokuIcon}>♪</div> : null}
            {phase === "shoukai" ? <p className={styles.taisouIntroTitle}>{mission.name}</p> : null}
            {phase === "cheer" ? <div className={styles.taisouTame}>わくわく</div> : null}
            {phase === "countdown" ? <div key={countdown} className={styles.taisouCountdown}>{countdown}</div> : null}
            {phase === "launch" ? <p className={styles.taisouKakegoe}>{intro.launchLine}</p> : null}
            {stamped ? <div className={styles.taisouDone}>できたね！</div> : phase === "honpen" ? <>
              <div className={styles.kanaBeat}>{currentStep.kana}</div>
              <div className={styles.mouthPict} aria-label={currentStep.pictLabel}><span>{PICT_EMOJI[currentStep.pict] ?? currentStep.pict}</span></div>
              <p className={styles.beatLine}>{paused ? "いまは おやすみ中" : currentStep.pictLabel}</p>
              <button type="button" className={styles.taisouCompleteButton} onClick={handleComplete}>できた！</button>
            </> : null}
            {phase === "matsu" && !stamped ? <>
              <p className={styles.taisouLine}>できたら おして！</p>
              <button type="button" className={styles.taisouCompleteButton} onClick={handleComplete}>できた！</button>
            </> : null}
          </div>
          {phase === "honpen" || phase === "matsu" ? <div className={styles.timerRing} aria-label={`目安の残り時間 ${remainingSec}秒`}>
            <span>{remainingSec}秒</span>
          </div> : <div aria-hidden="true" />}
        </div>
        <p className={styles.taisouLine}>{mission.name}（目安 {mission.suggestedDurationSec}秒）</p>
        {!stamped ? <div className={styles.taisouActions}>
          <button type="button" className={styles.taisouSecondaryButton} onClick={handleSkip}>スキップ</button>
          {phase === "honpen" ? <button type="button" className={styles.taisouSecondaryButton} onClick={handlePause}>{paused ? "再開" : "一時停止"}</button> : <span>無理せず、できる範囲でね</span>}
        </div> : null}
      </div>
    </div>
  );
}
