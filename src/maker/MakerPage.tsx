import { useEffect, useState } from "react";
import styles from "../app/mvp.module.css";
import { track } from "../shared/analytics";
import { ConsultationDraftScreen } from "./ConsultationDraftScreen";
import makerStyles from "./maker.module.css";
import { MAKER_COPY } from "./makerCopy";
import type { MakerProblemId } from "./makerTypes";

export function MakerPage({ onExit }: { onExit?: () => void }) {
  const [problemId, setProblemId] = useState<MakerProblemId | null>(null);
  useEffect(() => { track("maker_viewed", { surface: "maker_page" }); }, []);

  function selectProblem(id: MakerProblemId) {
    track("problem_selected", { id });
    setProblemId(id);
  }

  if (problemId !== null) return <ConsultationDraftScreen problemId={problemId} onBack={() => setProblemId(null)}/>;

  return <main className={styles.contentScreen}>
    {onExit !== undefined ? <button className={styles.backButton} onClick={onExit}>とじる</button> : null}
    <p className={styles.eyebrow}>{MAKER_COPY.hero.eyebrow}</p>
    <h1>{MAKER_COPY.hero.title}</h1>
    <p className={styles.lead}>{MAKER_COPY.hero.lead}</p>

    <section className={makerStyles.section}>
      <h2>{MAKER_COPY.origin.title}</h2>
      <p>{MAKER_COPY.origin.body}</p>
      <div className={makerStyles.caseCard}>
        <span className={styles.categoryLabel}>{MAKER_COPY.origin.caseTitle}</span>
        <p>{MAKER_COPY.origin.caseBody}</p>
      </div>
    </section>

    <section className={makerStyles.section}>
      <h2>{MAKER_COPY.roles.title}</h2>
      <div className={makerStyles.roleGrid}>
        <article className={makerStyles.roleCard}>
          <h3>{MAKER_COPY.roles.tsunamayo.name}</h3>
          <p className={makerStyles.roleLabel}>{MAKER_COPY.roles.tsunamayo.role}</p>
          <p>{MAKER_COPY.roles.tsunamayo.body}</p>
          <ul>{MAKER_COPY.roles.tsunamayo.items.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className={makerStyles.roleCard}>
          <h3>{MAKER_COPY.roles.yasu.name}</h3>
          <p className={makerStyles.roleLabel}>{MAKER_COPY.roles.yasu.role}</p>
          <p>{MAKER_COPY.roles.yasu.body}</p>
          <ul>{MAKER_COPY.roles.yasu.items.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </div>
      <p className={styles.privacyNote}>{MAKER_COPY.roles.note}</p>
    </section>

    <section className={makerStyles.section}>
      <h2>{MAKER_COPY.problems.title}</h2>
      <p className={styles.lead}>{MAKER_COPY.problems.help}</p>
      <div className={styles.chipGrid}>{MAKER_COPY.problems.options.map(([id, label]) => <button key={id} onClick={() => selectProblem(id)}>{label}</button>)}</div>
    </section>
  </main>;
}
