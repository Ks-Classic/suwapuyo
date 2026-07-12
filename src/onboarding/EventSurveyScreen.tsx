import { useState } from "react";
import { grantConsent, hasConsent, saveEventSurvey, SURVEY_CONSENT_VERSION } from "../shared/localMvpRepository";
import type { EventSurveyPhase } from "../shared/mvpTypes";
import styles from "../app/mvp.module.css";

const COUNT_OPTIONS = [["0人", "0"], ["1人", "1"], ["2人", "2"], ["3人以上", "3_plus"], ["答えない", "unanswered"]] as const;

export function EventSurveyScreen({ phase, onDone, onSkip }: { phase: EventSurveyPhase; onDone: () => void; onSkip: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  function submit(next: Record<string, string>) {
    if (!hasConsent("survey")) grantConsent("survey", SURVEY_CONSENT_VERSION);
    saveEventSurvey({ phase, surveyVersion: "event-2026-01", answers: next, completedAt: new Date().toISOString() });
    setSaved(true);
  }
  if (saved) return <main className={styles.storyScreen}><img className={styles.storyCharacter} src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="わーわー"/><h1>ありがとう！</h1><p>イベントをもっと遊びやすくするために使います。</p><button className={styles.primaryButton} onClick={onDone}>遊びにもどる</button></main>;
  return <main className={styles.storyScreen}>
    <p className={styles.eyebrow}>任意・イベントについて</p>
    {phase === "before" && <><h1>YourTIMEに行く予定はある？</h1><p className={styles.privacyNote}>当日の案内をわかりやすくするために使います。</p><div className={styles.optionGrid}>{[["行く予定", "yes"], ["まだわからない", "undecided"], ["行かない", "no"], ["答えない", "unanswered"]].map(([label, value]) => <button key={value} onClick={() => submit({ attendance_plan: value })}>{label}</button>)}</div></>}
    {phase === "during" && <><h1>今日は何人で来た？</h1><p className={styles.privacyNote}>会場の混み方や、親子で遊べる場所を改善するために、大人と子どもを分けて集計します。</p>{[["adult_count", "大人"], ["child_count", "子ども"]].map(([key, label]) => <section className={styles.countQuestion} key={key}><h2>{label}</h2><div className={styles.chipGrid}>{COUNT_OPTIONS.map(([text, value]) => <button aria-pressed={answers[key] === value} key={value} onClick={() => setAnswers((current) => ({ ...current, [key]: value }))}>{text}</button>)}</div></section>)}<button className={styles.primaryButton} disabled={answers.adult_count === undefined || answers.child_count === undefined} onClick={() => submit(answers)}>回答する</button></>}
    {phase === "after" && <><h1>YourTIMEには行った？</h1><p className={styles.privacyNote}>イベント後の遊びや案内を改善するために使います。</p><div className={styles.optionGrid}>{[["行った", "yes"], ["行っていない", "no"], ["答えない", "unanswered"]].map(([label, value]) => <button key={value} onClick={() => submit({ attended: value })}>{label}</button>)}</div></>}
    <button className={styles.textButton} onClick={onSkip}>回答せず遊ぶ</button>
  </main>;
}
