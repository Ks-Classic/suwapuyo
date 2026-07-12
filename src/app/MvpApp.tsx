import { useCallback, useEffect, useState } from "react";
import { CharacterSelectScreen } from "../components/screens/CharacterSelectScreen";
import { CHARACTERS } from "../config/characters";
import { ExerciseScreen } from "../exercise/ExerciseScreen";
import { GameRoute } from "../game/GameRoute";
import { addLiffFriend, resolveSuwapuyoLiff, startLiffLogin, type SuwapuyoLiffState } from "../integrations/suwapuyoLiff";
import { ArrivalScreen } from "../onboarding/ArrivalScreen";
import { OnboardingFlow } from "../onboarding/OnboardingFlow";
import { EventSurveyScreen } from "../onboarding/EventSurveyScreen";
import { SURVEY_COPY } from "../onboarding/surveyCopy";
import { MissionsScreen, ProgressScreen } from "../progress/ProgressScreens";
import { ExhibitorReport } from "../report/ExhibitorReport";
import { createProfileAfterConsent, dailyPreferredExercise, flushEventQueue, getSnapshot, grantConsent, hasConsent, newEvent, PRODUCT_CONSENT_VERSION, recordEvent, saveSurvey, SURVEY_CONSENT_VERSION } from "../shared/localMvpRepository";
import type { ExerciseType, PreferredActivity } from "../shared/mvpTypes";
import { ExerciseBoothIntro, VenueMapFallback } from "../village/VillageScreens";
import { FeaturedBoothCatalog } from "../booths/FeaturedBooths";
import { DataModeBadge, MvpShell } from "./MvpShell";
import styles from "./mvp.module.css";

const REPORT_ID = "86da2704-835e-4e7b-9cf0-41f18be8cb21";
const SUWAPUYO_LIFF_ID: string | undefined = import.meta.env.VITE_SUWAPUYO_LIFF_MODE === "demo" ? undefined : import.meta.env.VITE_SUWAPUYO_LIFF_ID;

function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const listener = () => setPath(window.location.pathname);
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);
  const navigate = useCallback((next: string) => {
    window.history.pushState({}, "", next);
    setPath(next);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);
  return { path, navigate };
}

function AuthScreen({ onContinue }: { onContinue: () => void }) {
  const [status, setStatus] = useState<"checking" | "ready" | "error">("checking");
  useEffect(() => { const timer = window.setTimeout(() => setStatus("ready"), 650); return () => window.clearTimeout(timer); }, []);
  return <main className={styles.authScreen}><img src="/content/fuwafuwa-land/characters/display/suusuu.png" alt="すーすー"/><h1>むらへ つれていくね…</h1>
    {status === "checking" ? <p role="status">LINEとの接続を確認しています</p> : null}
    {status === "ready" ? <button className={styles.primaryButton} onClick={onContinue}>村へすすむ</button> : null}
    {status === "error" ? <><p>LINEとの接続を確認できませんでした。</p><button onClick={() => setStatus("checking")}>もういちど</button><button>困ったとき</button></> : null}
    <button className={styles.devStateButton} onClick={() => setStatus("error")}>通信失敗の表示を確認</button>
  </main>;
}

function LiffGateScreen({ state, onRetry }: { state: SuwapuyoLiffState; onRetry: () => void }) {
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(false);
  if (state.status === "loading") return <main className={styles.authScreen}><img src="/content/fuwafuwa-land/characters/display/suusuu.png" alt="すーすー"/><h1>むらへ つれていくね…</h1><p role="status">LINEとの接続を確認しています</p></main>;
  if (state.status === "login_required") return <main className={styles.authScreen}><img src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="わーわー"/><p className={styles.eyebrow}>外部ブラウザで開いています</p><h1>LINEでつづけよう</h1><p>遊んだ記録を同じ家族の続きとして開くために、LINEログインを使います。</p><button className={styles.primaryButton} onClick={startLiffLogin}>LINEでログイン</button><button className={styles.textButton} onClick={onRetry}>接続を確認する</button></main>;
  if (state.status === "friendship_required") return <main className={styles.authScreen}><img src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="わーわー"/><h1>村のなかまになろう</h1><p>すわぷよは、村の案内所LINE公式アカウントの友だち限定で遊べます。</p>{addError ? <p className={styles.offlineNotice}>友だち追加画面を開けませんでした。LINEの画面で追加したあと、もう一度確認してください。</p> : null}<button className={styles.primaryButton} disabled={adding} onClick={() => { setAdding(true); setAddError(false); void addLiffFriend().then(onRetry).catch(() => { setAdding(false); setAddError(true); }); }}>{adding ? "確認中…" : "友だち追加へ"}</button><button className={styles.secondaryButton} onClick={onRetry}>追加したので確認する</button></main>;
  return <main className={styles.authScreen}><img src="/content/fuwafuwa-land/characters/display/suusuu.png" alt="すーすー"/><h1>LINEに接続できませんでした</h1><p>通信を確認して、もう一度お試しください。遊びの途中の記録は消えません。</p><p className={styles.errorCode}>エラー: {state.errorCode ?? "init_failed"}</p><button className={styles.primaryButton} onClick={onRetry}>もう一度確認</button></main>;
}

function FriendScreen({ onAdded }: { onAdded: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return <main className={styles.storyScreen}><img className={styles.storyCharacter} src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="わーわー"/><h1>ともだちになると<br/>きろくとキャラを<br/>もちかえれるよ</h1><button className={styles.primaryButton} onClick={onAdded}>LINEでともだちになる</button><button className={styles.textButton} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>なぜ必要？</button>{expanded ? <p>遊んだ記録を同じ家族の続きとして開くために使います。</p> : null}</main>;
}

function ConsentSheet({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
  return <div className={styles.sheetBackdrop} role="presentation"><section className={styles.consentSheet} role="dialog" aria-modal="true" aria-labelledby="consent-title"><button className={styles.sheetClose} onClick={onClose}>今はやめておく</button><p className={styles.eyebrow}>保護者・ご本人へ</p><h2 id="consent-title">みんなで遊びやすくするために</h2><p>遊ぶお子さんの生まれた年月、性別、遊んだ記録を保存します。</p><ul><li>年齢に合わせた表示</li><li>サービスの改善</li><li>利用傾向の集計と分析</li></ul><p>登録した情報は、あとから確認・変更・削除できます。</p><details><summary>利用規約・プライバシーを確認</summary><p>個人別販促、外部データとの突合、第三者提供には別の同意が必要です。診断や健康評価には使いません。</p></details><button className={styles.primaryButton} onClick={onAccept}>内容を確認してはじめる</button></section></div>;
}

function WelcomeScreen({ onSurvey, onPlay }: { onSurvey: () => void; onPlay: () => void }) {
  const [consentOpen, setConsentOpen] = useState(false);
  const accept = (next: () => void) => {
    if (!hasConsent("product")) { setConsentOpen(true); return; }
    next();
  };
  const [intent, setIntent] = useState<"survey" | "play">("play");
  function acceptConsent() {
    grantConsent("product", PRODUCT_CONSENT_VERSION);
    grantConsent("survey", SURVEY_CONSENT_VERSION);
    createProfileAfterConsent();
    setConsentOpen(false);
    if (intent === "survey") onSurvey(); else onPlay();
  }
  return <main className={styles.welcomeScreen}><div className={styles.skyScene}><img src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="わーわー"/><div className={styles.speech}>いっしょに遊ぼう</div></div><h1>すわぷよへ ようこそ</h1><button className={styles.primaryButton} onClick={() => { setIntent("play"); accept(onPlay); }}>すわぷよを始める</button><p>村の仲間を教えると、みんなが村へやってくるよ</p><div className={styles.splitActions}><button className={styles.secondaryButton} onClick={() => { setIntent("survey"); accept(onSurvey); }}>先に教える</button><button className={styles.secondaryButton} onClick={() => { setIntent("play"); accept(onPlay); }}>あとで</button></div>{consentOpen ? <ConsentSheet onAccept={acceptConsent} onClose={() => setConsentOpen(false)}/> : null}</main>;
}

function HomeScreen({ navigate }: { navigate: (path: string) => void }) {
  const snapshot = getSnapshot();
  const selected = CHARACTERS.find((character) => character.id === snapshot.selectedCharacterId) ?? CHARACTERS[0];
  return <main className={styles.homeScreen}><header><div><p>おはよう！</p><h1>きょうの村</h1></div><button onClick={() => navigate("/settings/family")}>保護者用</button></header><DataModeBadge/><section className={styles.villageHero}>{selected !== undefined ? <img src={selected.image} alt={selected.name}/> : null}<div><strong>{selected?.name ?? "村のなかま"}</strong><span>きょうも待ってるよ</span></div></section><button className={styles.primaryButton} onClick={() => navigate("/play")}>つづきから遊ぶ</button><section className={styles.homeMission}><div><span>今日のミッション</span><b>0/3</b></div><div className={styles.missionTrack}><i/><i/><i/></div><p>{snapshot.arrived ? "なかまと一緒に体操してみよう" : "アンケートで仲間が登場！"}</p><button onClick={() => navigate("/missions")}>くわしく見る</button></section></main>;
}

function FamilySettings({ navigate }: { navigate: (path: string) => void }) {
  const [snapshot, setSnapshot] = useState(getSnapshot);
  const survey = snapshot.survey;
  function update(preferredActivity: PreferredActivity) {
    if (survey === null) return;
    setSnapshot(saveSurvey({ ...survey, preferredActivity }));
  }
  return <main className={styles.contentScreen}>
    <div className={styles.screenTitleRow}><div><p className={styles.eyebrow}>保護者用</p><h1>遊びの設定</h1></div><button onClick={() => navigate("/")}>閉じる</button></div>
    {survey === null ? <section className={styles.settingsCard}><p>まだ遊び方を設定していません。</p><button className={styles.primaryButton} onClick={() => navigate("/survey/family")}>3問で設定する</button></section> : <section className={styles.settingsCard}>
      <h2>{SURVEY_COPY.activity.question}</h2><p>次に体操を開いたときの表示順へ反映します。いつでも変更できます。</p>
      <div className={styles.optionGrid}>{SURVEY_COPY.activity.options.map(([label, value]) => <button aria-pressed={survey.preferredActivity === value} key={value} onClick={() => update(value)}>{label}</button>)}</div>
      <p className={styles.successNotice} role="status">現在の設定：{survey.preferredActivity === "mouth" ? "お口あそび" : survey.preferredActivity === "body" ? "からだあそび" : survey.preferredActivity === "random" ? "おまかせ" : "あとで選ぶ"}</p>
    </section>}
  </main>;
}

function ExerciseComplete({ queued, navigate }: { queued: boolean; navigate: (path: string) => void }) {
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setShowIntro(true), 850); return () => window.clearTimeout(timer); }, []);
  return <main className={styles.completeScreen}><img src="/content/fuwafuwa-land/characters/display/mogupiyo.png" alt="もぐぴよ"/><h1>できたね！</h1><p>きょうの体操を1こ記録しました</p>{queued ? <p className={styles.offlineNotice}>端末にあずかりました。接続後に送ります。</p> : <p className={styles.successNotice}>きろくに残しました</p>}{showIntro ? <ExerciseBoothIntro onOpen={() => navigate("/village/booths")} onLater={() => navigate("/progress")}/> : <p role="status">村からのお祝いを準備中…</p>}</main>;
}

export function MvpApp() {
  const { path, navigate } = useRoute();
  const [exerciseResult, setExerciseResult] = useState<boolean | null>(null);
  const [liffAttempt, setLiffAttempt] = useState(0);
  const [liffState, setLiffState] = useState<SuwapuyoLiffState>({ status: "loading", inClient: false });
  useEffect(() => {
    let active = true;
    setLiffState({ status: "loading", inClient: false });
    void resolveSuwapuyoLiff(SUWAPUYO_LIFF_ID).then((state) => { if (active) setLiffState(state); });
    return () => { active = false; };
  }, [liffAttempt]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [path]);
  useEffect(() => {
    const flush = () => { void flushEventQueue(); };
    window.addEventListener("online", flush);
    flush();
    return () => window.removeEventListener("online", flush);
  }, []);
  if (liffState.status !== "ready" && liffState.status !== "demo") return <LiffGateScreen state={liffState} onRetry={() => setLiffAttempt((value) => value + 1)}/>;
  if (path === "/auth") return <AuthScreen onContinue={() => navigate("/auth/friend")}/>;
  if (path === "/auth/friend") return <FriendScreen onAdded={() => navigate("/welcome")}/>;
  if (path === "/welcome") return <WelcomeScreen onSurvey={() => navigate("/survey/family")} onPlay={() => navigate("/survey/family")}/>;
  if (path === "/survey/family" && !hasConsent("product")) return <WelcomeScreen onSurvey={() => navigate("/survey/family")} onPlay={() => navigate("/survey/family")}/>;
  if (path === "/survey/family") return <OnboardingFlow onSkip={() => navigate("/welcome")} onComplete={() => navigate("/arrival")}/>;
  if (hasConsent("product") && getSnapshot().survey === null) return <OnboardingFlow onSkip={() => navigate("/welcome")} onComplete={() => navigate("/arrival")}/>;
  if (path.startsWith("/survey/event/")) {
    const phase = path.split("/")[3];
    if (phase === "before" || phase === "during" || phase === "after") return <EventSurveyScreen phase={phase} onDone={() => navigate("/play")} onSkip={() => navigate("/play")}/>;
    return <main className={styles.storyScreen}><h1>イベント質問はありません</h1><p>通常どおり遊べます。</p><button className={styles.primaryButton} onClick={() => navigate("/play")}>遊ぶ</button></main>;
  }
  if (path === "/arrival") return <ArrivalScreen onContinue={() => navigate("/characters")}/>;
  if (path === "/characters") return <CharacterSelectScreen onSelect={() => navigate("/play")} onCancel={() => navigate("/play")}/>;
  if (path === "/settings/family") return <FamilySettings navigate={navigate}/>;
  if (path === "/play") return <GameRoute onHome={() => navigate("/")} onExercise={() => { setExerciseResult(null); navigate(`/exercise/${dailyPreferredExercise(getSnapshot().survey?.preferredActivity ?? "unanswered")}`); }} onCharacters={() => navigate("/characters")}/>;
  if (path.startsWith("/exercise/complete")) return <ExerciseComplete queued={exerciseResult === true} navigate={navigate}/>;
  if (path.startsWith("/exercise/")) {
    const candidate = path.split("/")[2];
    const type: ExerciseType = candidate === "breath" || candidate === "neck" ? candidate : "mouth";
    return <ExerciseScreen type={type} onLater={() => navigate("/play")} onComplete={(queued) => { setExerciseResult(queued); navigate("/exercise/complete"); }}/>;
  }
  if (path === "/progress") return <MvpShell active="progress" onNavigate={navigate}><ProgressScreen onMissions={() => navigate("/missions")} onPlay={() => navigate("/play")}/></MvpShell>;
  if (path === "/missions") return <MvpShell active="progress" onNavigate={navigate}><MissionsScreen/></MvpShell>;
  if (path === "/booths" || path === "/village/booths") return <MvpShell active="village" onNavigate={navigate}><FeaturedBoothCatalog onMap={() => navigate("/village/map")}/></MvpShell>;
  if (path === "/village/map") return <MvpShell active="village" onNavigate={navigate}><VenueMapFallback onList={() => navigate("/village/booths")}/></MvpShell>;
  if (path.startsWith("/reports/exhibitors/")) {
    const id = path.split("/")[3];
    return id === REPORT_ID ? <ExhibitorReport onBizContactClick={() => { void recordEvent(newEvent("biz_contact_clicked", { reportId: REPORT_ID })); }}/> : <main className={styles.forbiddenScreen}><h1>レポートを表示できません</h1><p>URLを確認してください。</p></main>;
  }
  if (!hasConsent("product")) return <WelcomeScreen onSurvey={() => navigate("/survey/family")} onPlay={() => navigate("/survey/family")}/>;
  return <MvpShell active="play" onNavigate={navigate}><HomeScreen navigate={navigate}/></MvpShell>;
}
