import { useEffect, useState } from "react";
import { claimMission, exerciseSummary, missions } from "../shared/localMvpRepository";
import type { ExerciseSummary, MissionProgress } from "../shared/mvpTypes";
import { DataModeBadge } from "../app/MvpShell";
import styles from "../app/mvp.module.css";

const EMPTY: ExerciseSummary = { today: { mouth: 0, breath: 0, neck: 0 }, total: { mouth: 0, breath: 0, neck: 0 }, totalCount: 0, streakDays: 0, pendingCount: 0 };

export function ProgressScreen({ onMissions, onPlay }: { onMissions: () => void; onPlay: () => void }) {
  const [summary, setSummary] = useState(EMPTY);
  useEffect(() => { void exerciseSummary().then(setSummary); }, []);
  const todayCount = Object.values(summary.today).reduce((sum, value) => sum + value, 0);
  return <main className={styles.contentScreen}><DataModeBadge/><h1>たいそうのきろく</h1>
    {summary.pendingCount > 0 ? <p className={styles.offlineNotice}>端末にあずかりました。接続後に送ります。</p> : null}
    <section className={styles.progressHero}><strong>{todayCount > 0 ? `きょう ${todayCount}かい できたよ` : "きょうできたことを、ここに残せるよ"}</strong><span>{summary.streakDays > 0 ? `${summary.streakDays}日つづいてるよ` : "次の1回から始めよう"}</span></section>
    <h2>きょうできたこと</h2><div className={styles.statRow}><span>おくち <b>{summary.today.mouth}</b></span><span>いき <b>{summary.today.breath}</b></span><span>くび <b>{summary.today.neck}</b></span></div>
    <h2>これまで</h2><div className={styles.statRow}><span>おくち <b>{summary.total.mouth}</b></span><span>いき <b>{summary.total.breath}</b></span><span>くび <b>{summary.total.neck}</b></span></div><p className={styles.totalLine}>合計 {summary.totalCount}回</p>
    <button className={styles.primaryButton} onClick={onMissions}>ミッションを見る</button><button className={styles.secondaryButton} onClick={onPlay}>ゲームにもどる</button>
  </main>;
}

export function MissionsScreen() {
  const [rows, setRows] = useState<MissionProgress[]>([]);
  const [message, setMessage] = useState("");
  async function refresh() { setRows(await missions()); }
  useEffect(() => { void missions().then(setRows); }, []);
  async function claim(row: MissionProgress) {
    const granted = await claimMission(row.missionId, row.periodKey);
    setMessage(granted ? `${row.rewardLabel}を受け取りました` : "この報酬は受け取り済みです");
    await refresh();
  }
  return <main className={styles.contentScreen}><DataModeBadge/><h1>きょうのミッション</h1>{message !== "" ? <p role="status" className={styles.successNotice}>{message}</p> : null}<div className={styles.missionList}>{rows.map((row) => <article key={`${row.missionId}:${row.periodKey}`}><div><strong>{row.title}</strong><p>{row.description}</p><small>ほうび: {row.rewardLabel}</small></div><progress max={row.target} value={Math.min(row.progress, row.target)} aria-label={`${row.title}の進捗`} /><span>{Math.min(row.progress, row.target)}/{row.target}</span>{row.completed ? <button disabled={row.claimed} onClick={() => void claim(row)}>{row.claimed ? "受取済み" : "うけとる"}</button> : <small>あと {row.target - row.progress}こ</small>}</article>)}</div></main>;
}
