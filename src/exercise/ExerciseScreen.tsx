import { useMemo, useState } from "react";
import { newEvent, recordEvent } from "../shared/localMvpRepository";
import type { ExerciseType } from "../shared/mvpTypes";
import styles from "../app/mvp.module.css";

const EXERCISES: Record<ExerciseType, { title: string; line: string; help: string; image: string }> = {
  mouth: { title: "おくちタイム", line: "あー・いー・うー", help: "ゆっくり、できるところまで", image: "/content/fuwafuwa-land/characters/display/mogupiyo.png" },
  breath: { title: "いきタイム", line: "すーーー、ふーーー", help: "苦しくない長さで大丈夫", image: "/content/fuwafuwa-land/characters/display/suusuu.png" },
  neck: { title: "くびタイム", line: "ゆっくり みぎ・ひだり", help: "痛くない範囲でやってみよう", image: "/content/fuwafuwa-land/characters/display/tanupei.png" },
};

export function ExerciseScreen({ type, onLater, onComplete }: { type: ExerciseType; onLater: () => void; onComplete: (queued: boolean) => void }) {
  const exercise = EXERCISES[type];
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const cue = useMemo(() => paused ? "ひと休み中" : exercise.line, [exercise.line, paused]);
  async function complete() {
    setSaving(true);
    const result = await recordEvent(newEvent("exercise_completed", { exerciseType: type }));
    onComplete(result === "queued");
  }
  return <main className={styles.exerciseScreen}>
    <header><button onClick={onLater}>閉じる</button><h1>{exercise.title}</h1><button aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? "再開" : "一時停止"}</button></header>
    <img src={exercise.image} alt="お手本のキャラクター"/>
    <p className={styles.exerciseCue}>{cue}</p><p>{exercise.help}</p>
    <div className={styles.exerciseMeter} role="progressbar" aria-label="自分のペースで進める体操" aria-valuemin={0} aria-valuemax={1} aria-valuenow={paused ? 0 : 1}><span /></div>
    <div className={styles.splitActions}><button className={styles.secondaryButton} onClick={onLater}>あとで</button><button className={styles.primaryButton} disabled={saving} onClick={() => void complete()}>{saving ? "記録中" : "できた"}</button></div>
  </main>;
}
