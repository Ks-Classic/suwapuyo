import { useMemo, useState } from "react";
import { grantConsent, hasConsent, saveSurvey, SURVEY_CONSENT_VERSION } from "../shared/localMvpRepository";
import type { ChildGender, FamilySurvey, PrimaryPlayer, SurveyChild } from "../shared/mvpTypes";
import { SURVEY_COPY } from "./surveyCopy";
import { birthMonthToAgeBand } from "./surveyDomain";
import styles from "../app/mvp.module.css";

type Step = "intro" | "player" | "count" | "children" | "confirm" | "complete";
type ChildDraft = { id: string; year: string; month: string; gender: ChildGender | ""; error?: string };

const EMPTY_SURVEY: FamilySurvey = {
  schemaVersion: 3,
  primaryPlayer: "unanswered",
  preferredActivity: "unanswered",
  children: [],
};

interface Props {
  onSkip: () => void;
  onComplete: () => void;
}

function createChild(index: number): ChildDraft {
  return { id: `child-${index + 1}-${crypto.randomUUID()}`, year: "", month: "", gender: "" };
}

export function OnboardingFlow({ onSkip, onComplete }: Props) {
  const [step, setStep] = useState<Step>(() => hasConsent("survey") ? "player" : "intro");
  const [draft, setDraft] = useState<FamilySurvey>(EMPTY_SURVEY);
  const [children, setChildren] = useState<ChildDraft[]>([]);
  const [childIndex, setChildIndex] = useState(0);
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 19 }, (_, index) => currentYear - index), [currentYear]);

  function choosePlayer(primaryPlayer: PrimaryPlayer): void {
    setDraft((current) => ({ ...current, primaryPlayer, children: [] }));
    if (primaryPlayer === "adult") {
      setChildren([]);
      setStep("confirm");
      return;
    }
    setStep("count");
  }

  function chooseCount(count: number): void {
    setChildren(Array.from({ length: count }, (_, index) => createChild(index)));
    setChildIndex(0);
    setStep("children");
  }

  function updateChild(change: Partial<ChildDraft>): void {
    setChildren((current) => current.map((child, index) => index === childIndex ? { ...child, ...change, error: undefined } : child));
  }

  function confirmCurrentChild(): void {
    const child = children[childIndex];
    if (child === undefined) return;
    const result = birthMonthToAgeBand({ year: Number(child.year), month: Number(child.month) });
    if (child.year === "" || child.month === "" || child.gender === "" || result === null) {
      updateChild({ error: "生まれた年・月と性別を選んでください" });
      return;
    }
    if (childIndex < children.length - 1) {
      setChildIndex((current) => current + 1);
      return;
    }
    const surveyChildren: SurveyChild[] = children.map((item) => {
      const age = birthMonthToAgeBand({ year: Number(item.year), month: Number(item.month) });
      if (age === null || item.gender === "") throw new Error("invalid_child_draft");
      return { id: item.id, birthYear: Number(item.year), birthMonth: Number(item.month), gender: item.gender, ...age };
    });
    setDraft((current) => ({ ...current, children: surveyChildren }));
    setStep("confirm");
  }

  function finish(): void {
    const next = { ...draft, completedAt: new Date().toISOString() };
    saveSurvey(next);
    setDraft(next);
    setStep("complete");
  }

  function goBack(): void {
    if (step === "player") return setStep("intro");
    if (step === "count") return setStep("player");
    if (step === "children") {
      if (childIndex > 0) setChildIndex((current) => current - 1);
      else setStep("count");
      return;
    }
    if (step === "confirm") setStep(draft.primaryPlayer === "adult" ? "player" : "children");
  }

  if (step === "intro") return <main className={styles.storyScreen}>
    <img className={styles.storyCharacter} src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="" />
    <p className={styles.eyebrow}>保護者・ご本人へ</p>
    <h1>{SURVEY_COPY.intro.title}</h1>
    <p className={styles.lead}>{SURVEY_COPY.intro.body}</p>
    <p className={styles.privacyNote}>{SURVEY_COPY.intro.note}</p>
    <p className={styles.privacyNote}><a href="/terms">利用規約</a>・<a href="/privacy">プライバシーポリシー</a></p>
    <button className={styles.primaryButton} onClick={() => { grantConsent("survey", SURVEY_CONSENT_VERSION); setStep("player"); }}>{SURVEY_COPY.intro.accept}</button>
    <button className={styles.secondaryButton} onClick={onSkip}>{SURVEY_COPY.intro.skip}</button>
  </main>;

  const progress = step === "player" ? 1 : step === "count" ? 2 : step === "children" ? 3 : 4;
  const currentChild = children[childIndex];
  return <main className={styles.storyScreen}>
    {step !== "complete" && <button aria-label="前へ戻る" className={styles.backButton} onClick={goBack}>← 戻る</button>}
    {step !== "complete" && <div className={styles.pathDots} aria-label={`登録 ${progress} / 4`}>
      {[1, 2, 3, 4].map((number) => <span className={number <= progress ? styles.pathDotActive : ""} key={number} />)}
    </div>}

    {step === "player" && <>
      <img className={styles.guideCharacter} src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="わーわー" />
      <h1>{SURVEY_COPY.player.question}</h1><p>{SURVEY_COPY.player.help}</p>
      <div className={styles.optionGrid}>{SURVEY_COPY.player.options.map(([label, value]) => <button key={value} onClick={() => choosePlayer(value)}>{label}</button>)}</div>
    </>}

    {step === "count" && <>
      <h1>遊ぶお子さんは何人？</h1>
      <p>いっしょに遊ぶお子さん全員を登録します</p>
      <div className={styles.optionGrid}>{[1, 2, 3, 4, 5].map((count) => <button key={count} onClick={() => chooseCount(count)}>{count === 5 ? "5人以上" : `${count}人`}</button>)}</div>
    </>}

    {step === "children" && currentChild !== undefined && <>
      <p className={styles.eyebrow}>{childIndex + 1} / {children.length}</p>
      <h1>{childIndex + 1}人目のお子さん</h1>
      <p>{SURVEY_COPY.birth.help}</p>
      <div className={styles.birthPicker}>
        <label>生まれた年<select aria-label={`${childIndex + 1}人目の生まれた年`} value={currentChild.year} onChange={(event) => updateChild({ year: event.target.value })}><option value="">選んでください</option>{years.map((year) => <option key={year} value={year}>{year}年</option>)}</select></label>
        <label>月<select aria-label={`${childIndex + 1}人目の生まれた月`} value={currentChild.month} onChange={(event) => updateChild({ month: event.target.value })}><option value="">選んでください</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}月</option>)}</select></label>
      </div>
      <fieldset className={styles.childCard}>
        <legend>性別</legend>
        <div className={styles.optionGrid}>{SURVEY_COPY.gender.options.map(([label, value]) => <button type="button" aria-pressed={currentChild.gender === value} key={value} onClick={() => updateChild({ gender: value })}>{label}</button>)}</div>
      </fieldset>
      {currentChild.error && <p className={styles.fieldError} role="alert">{currentChild.error}</p>}
      <button className={styles.primaryButton} onClick={confirmCurrentChild}>{childIndex < children.length - 1 ? "次のお子さんへ" : "確認する"}</button>
    </>}

    {step === "confirm" && <>
      <h1>{draft.primaryPlayer === "adult" ? "遊ぶ準備を確認" : `${draft.children.length}人で遊ぶ準備ができたよ`}</h1>
      {draft.children.map((child, index) => <p className={styles.resultMessage} key={child.id}>{index + 1}人目・{child.birthYear}年{child.birthMonth}月・{SURVEY_COPY.gender.options.find(([, value]) => value === child.gender)?.[0]}</p>)}
      <p className={styles.privacyNote}>登録内容は設定からいつでも変更・削除できます。</p>
      <button className={styles.primaryButton} onClick={finish}>この内容ではじめる</button>
    </>}

    {step === "complete" && <>
      <img className={styles.storyCharacter} src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="わーわー" />
      <h1>{SURVEY_COPY.complete.title}</h1>
      <button className={styles.primaryButton} onClick={onComplete}>{SURVEY_COPY.complete.action}</button>
    </>}
  </main>;
}
