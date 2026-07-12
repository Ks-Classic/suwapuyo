import { useState } from "react";
import styles from "../app/mvp.module.css";
import { track } from "../shared/analytics";
import makerStyles from "./maker.module.css";
import { CTA_OPTIONS } from "./makerCopy";
import { buildConsultationDraft } from "./makerDraft";
import type { MakerCtaType, MakerDraftStage, MakerProblemId } from "./makerTypes";

export function ConsultationDraftScreen({ problemId, onBack }: { problemId: MakerProblemId; onBack: () => void }) {
  const [ctaType, setCtaType] = useState<MakerCtaType | null>(null);
  const [draftText, setDraftText] = useState("");
  const [stage, setStage] = useState<MakerDraftStage>("compose");

  function selectCta(next: MakerCtaType) {
    setCtaType(next);
    setDraftText(buildConsultationDraft(problemId, next));
  }

  function send() {
    track("consultation_started", { id: problemId, kind: ctaType ?? "unanswered" });
    setStage("sent");
  }

  if (stage === "sent") return <main className={styles.contentScreen}>
    <p className={styles.eyebrow}>相談文を送りました（デモ）</p>
    <h1>ありがとうございます！</h1>
    <p className={styles.successNotice}>本番ではここからLINEでの会話が始まる予定です。今はデモのため、実際には送信されていません。</p>
    <button className={styles.primaryButton} onClick={onBack}>作り手ページにもどる</button>
  </main>;

  if (stage === "review") return <main className={styles.contentScreen}>
    <p className={styles.eyebrow}>この内容で送りますか？</p>
    <h1>相談文を確認してね</h1>
    <p className={makerStyles.draftReview}>{draftText}</p>
    <div className={styles.splitActions}>
      <button className={styles.secondaryButton} onClick={() => setStage("compose")}>編集にもどる</button>
      <button className={styles.primaryButton} onClick={send}>この内容で送信する</button>
    </div>
  </main>;

  return <main className={styles.contentScreen}>
    <button className={styles.backButton} onClick={onBack}>もどる</button>
    <p className={styles.eyebrow}>相談文をつくろう</p>
    <h1>どんなふうに話したい？</h1>
    <div className={makerStyles.ctaList}>{CTA_OPTIONS.map(([value, label]) => <button key={value} aria-pressed={ctaType === value} onClick={() => selectCta(value)}>{label}</button>)}</div>
    {ctaType !== null ? <>
      <label className={makerStyles.draftLabel} htmlFor="maker-draft-text">送る前に、自由に書きかえられます</label>
      <textarea id="maker-draft-text" className={makerStyles.draftTextarea} value={draftText} onChange={(event) => setDraftText(event.target.value)}/>
      <button className={styles.primaryButton} disabled={draftText.trim() === ""} onClick={() => setStage("review")}>内容を確認する</button>
    </> : null}
  </main>;
}
