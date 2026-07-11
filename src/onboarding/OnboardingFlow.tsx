import { useState } from "react";
import { grantConsent, saveSurvey, SURVEY_CONSENT_VERSION } from "../shared/localMvpRepository";
import type { ChildCountBand, FamilySurvey, SurveyChild } from "../shared/mvpTypes";
import { SURVEY_COPY } from "./surveyCopy";
import styles from "../app/mvp.module.css";

type Step = "intro" | "party" | "adults" | "child-count" | "children" | "source" | "health" | "complete";

const EMPTY_SURVEY: FamilySurvey = {
  adults: "unanswered",
  childCount: "unanswered",
  children: [],
  acquisitionSource: "unanswered",
  healthWork: "unanswered",
  interests: [],
};

function childrenForBand(band: ChildCountBand): SurveyChild[] {
  if (band !== "1" && band !== "2") return [];
  const count = Number(band);
  return Array.from({ length: count }, (_, index) => ({ id: `child-${index + 1}`, ageBand: "unanswered", gender: "unanswered" }));
}

interface Props {
  onSkip: () => void;
  onComplete: () => void;
}

export function OnboardingFlow({ onSkip, onComplete }: Props) {
  const [step, setStep] = useState<Step>("intro");
  const [draft, setDraft] = useState<FamilySurvey>(EMPTY_SURVEY);
  const [party, setParty] = useState("");

  function forward(next: Step): void {
    window.setTimeout(() => setStep(next), 220);
  }

  function setChild(index: number, change: Partial<SurveyChild>): void {
    setDraft((current) => ({ ...current, children: current.children.map((child, childIndex) => childIndex === index ? { ...child, ...change } : child) }));
  }

  if (step === "intro") {
    return <main className={styles.storyScreen}>
      <img className={styles.storyCharacter} src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="わーわー" />
      <p className={styles.eyebrow}>保護者用</p><h1>{SURVEY_COPY.intro.title}</h1><p className={styles.lead}>{SURVEY_COPY.intro.body}</p>
      <button className={styles.primaryButton} onClick={() => { grantConsent("survey", SURVEY_CONSENT_VERSION); setStep("party"); }}>{SURVEY_COPY.intro.accept}</button>
      <button className={styles.secondaryButton} onClick={onSkip}>{SURVEY_COPY.intro.skip}</button>
    </main>;
  }

  const backMap: Partial<Record<Step, Step>> = { adults: "party", "child-count": "adults", children: "child-count", source: draft.children.length > 0 ? "children" : "child-count", health: "source" };
  return <main className={styles.storyScreen}>
    {backMap[step] !== undefined ? <button className={styles.backButton} onClick={() => setStep(backMap[step] as Step)}>戻る</button> : null}
    <div className={styles.pathDots} aria-label="村への小道"><span /><span /><span /></div>
    {step === "party" ? <>
      <img className={styles.guideCharacter} src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="わーわー" /><h1>{SURVEY_COPY.party.question}</h1><p>{SURVEY_COPY.party.help}</p>
      <div className={styles.optionGrid}>{SURVEY_COPY.party.options.map((label) => <button aria-pressed={party === label} key={label} onClick={() => { setParty(label); forward("adults"); }}>{label}</button>)}</div>
      <button className={styles.textButton} onClick={onSkip}>あとで答える</button>
    </> : null}
    {step === "adults" ? <><h1>{SURVEY_COPY.adults.question}</h1><p>{SURVEY_COPY.adults.help}</p><div className={styles.optionGrid}>{SURVEY_COPY.adults.options.map(([label, value]) => <button key={value} onClick={() => { setDraft((current) => ({ ...current, adults: value })); forward("child-count"); }}>{label}</button>)}</div><button className={styles.textButton} onClick={onSkip}>あとで答える</button></> : null}
    {step === "child-count" ? <><h1>{SURVEY_COPY.children.question}</h1><p>{SURVEY_COPY.children.help}</p><div className={styles.optionGrid}>{SURVEY_COPY.children.options.map(([label, value]) => <button key={value} onClick={() => { setDraft((current) => ({ ...current, childCount: value, children: childrenForBand(value) })); forward(value === "1" || value === "2" ? "children" : "source"); }}>{label}</button>)}</div><button className={styles.textButton} onClick={onSkip}>あとで答える</button></> : null}
    {step === "children" ? <><h1>お子さんのこと</h1><div className={styles.childCards}>{draft.children.map((child, index) => <section key={child.id} className={styles.childCard}><h2>{index + 1}人目のこども</h2><p>{SURVEY_COPY.age.question}</p><div className={styles.chipGrid}>{SURVEY_COPY.age.options.map(([label, value]) => <button aria-pressed={child.ageBand === value} key={value} onClick={() => setChild(index, { ageBand: value })}>{label}</button>)}</div><p>{SURVEY_COPY.gender.help}</p><div className={styles.segmented}>{SURVEY_COPY.gender.options.map(([label, value]) => <button aria-pressed={child.gender === value} key={value} onClick={() => setChild(index, { gender: value })}>{label}</button>)}</div></section>)}</div><button className={styles.primaryButton} onClick={() => setStep("source")}>これでOK</button><button className={styles.textButton} onClick={onSkip}>あとで答える</button></> : null}
    {step === "source" ? <><h1>{SURVEY_COPY.source.question}</h1><div className={styles.optionGrid}>{SURVEY_COPY.source.options.map(([label, value]) => <button key={value} onClick={() => { setDraft((current) => ({ ...current, acquisitionSource: value })); forward("health"); }}>{label}</button>)}</div><button className={styles.textButton} onClick={onSkip}>あとで答える</button></> : null}
    {step === "health" ? <><p className={styles.eyebrow}>{SURVEY_COPY.health.lead}</p><h1>{SURVEY_COPY.health.question}</h1><div className={styles.optionGrid}>{SURVEY_COPY.health.options.map(([label, value]) => <button key={value} onClick={() => { const next = { ...draft, healthWork: value }; setDraft(next); window.setTimeout(() => { saveSurvey({ ...next, completedAt: new Date().toISOString() }); setStep("complete"); }, 220); }}>{label}</button>)}</div><button className={styles.textButton} onClick={onSkip}>あとで答える</button></> : null}
    {step === "complete" ? <><img className={styles.guideCharacter} src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="わーわー"/><h1>{SURVEY_COPY.complete.title}</h1><p>{SURVEY_COPY.complete.body}</p><button className={styles.primaryButton} onClick={onComplete}>{SURVEY_COPY.complete.action}</button></> : null}
    <span hidden>{party}</span>
  </main>;
}
