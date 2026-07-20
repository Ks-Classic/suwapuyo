import { useCallback, useEffect, useState } from "react";
import { CharacterSelectScreen } from "../components/screens/CharacterSelectScreen";
import { ClaimScreen } from "../components/screens/ClaimScreen";
import { getClaimTokenFromUrl } from "../integrations/characterClaim";
import { CHARACTERS } from "../config/characters";
import { BoothCheckinScreen } from "../checkin/BoothCheckinScreen";
import { DEMO_CAMPAIGNS } from "../checkin/checkinRepository";
import { EventCheckinScreen } from "../checkin/EventCheckinScreen";
import { StampBook } from "../checkin/StampBook";
import { ExerciseScreen } from "../exercise/ExerciseScreen";
import { GameRoute } from "../game/GameRoute";
import { addLiffFriend, resolveSuwapuyoLiff, startLiffLogin, type SuwapuyoLiffState } from "../integrations/suwapuyoLiff";
import { MakerPage } from "../maker/MakerPage";
import { ArrivalScreen } from "../onboarding/ArrivalScreen";
import { OnboardingFlow } from "../onboarding/OnboardingFlow";
import { EventSurveyScreen } from "../onboarding/EventSurveyScreen";
import { SURVEY_COPY } from "../onboarding/surveyCopy";
import { MissionsScreen, ProgressScreen } from "../progress/ProgressScreens";
import { ExhibitorReport } from "../report/ExhibitorReport";
import { createProfileAfterConsent, dailyPreferredExercise, deleteAllUserData, deleteChild, flushEventQueue, getSnapshot, grantConsent, hasConsent, newEvent, PRODUCT_CONSENT_VERSION, recordEvent, revokeConsent, saveSurvey, SURVEY_CONSENT_VERSION, updateChild } from "../shared/localMvpRepository";
import type { AppSnapshot, ChildGender, ExerciseType, PreferredActivity, SurveyChild } from "../shared/mvpTypes";
import { rerollUnpinnedSlots } from "../shared/progressStore";
import { ExerciseBoothIntro, VenueMapFallback } from "../village/VillageScreens";
import { FeaturedBoothCatalog } from "../booths/FeaturedBooths";
import { DataModeBadge, MvpShell } from "./MvpShell";
import { isRetiredDemoPath } from "./routePolicy";
import styles from "./mvp.module.css";

const REPORT_ID = "86da2704-835e-4e7b-9cf0-41f18be8cb21";
const DEMO_CAMPAIGN_ID = Object.keys(DEMO_CAMPAIGNS)[0] ?? "yourtime-2026-08";
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
  return <main className={styles.authScreen}><img src="/content/01_すわぷよ/01_キャラクター/02_表示用/01_すーすー.png" alt="すーすー"/><h1>むらへ つれていくね…</h1>
    {status === "checking" ? <p role="status">LINEとの接続を確認しています</p> : null}
    {status === "ready" ? <button className={styles.primaryButton} onClick={onContinue}>村へすすむ</button> : null}
    {status === "error" ? <><p>LINEとの接続を確認できませんでした。</p><button onClick={() => setStatus("checking")}>もういちど</button><button>困ったとき</button></> : null}
    <button className={styles.devStateButton} onClick={() => setStatus("error")}>通信失敗の表示を確認</button>
  </main>;
}

function LiffGateScreen({ state, onRetry }: { state: SuwapuyoLiffState; onRetry: () => void }) {
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(false);
  if (state.status === "loading") return <main className={styles.authScreen}><img src="/content/01_すわぷよ/01_キャラクター/02_表示用/01_すーすー.png" alt="すーすー"/><h1>むらへ つれていくね…</h1><p role="status">LINEとの接続を確認しています</p></main>;
  if (state.status === "login_required") return <main className={styles.authScreen}><img src="/content/01_すわぷよ/01_キャラクター/02_表示用/02_わーわー.png" alt="わーわー"/><p className={styles.eyebrow}>外部ブラウザで開いています</p><h1>LINEでつづけよう</h1><p>遊んだ記録を同じ家族の続きとして開くために、LINEログインを使います。</p><button className={styles.primaryButton} onClick={startLiffLogin}>LINEでログイン</button><button className={styles.textButton} onClick={onRetry}>接続を確認する</button></main>;
  if (state.status === "friendship_required") return <main className={styles.authScreen}><img src="/content/01_すわぷよ/01_キャラクター/02_表示用/02_わーわー.png" alt="わーわー"/><h1>村のなかまになろう</h1><p>すわぷよは、村の案内所LINE公式アカウントの友だち限定で遊べます。</p>{addError ? <p className={styles.offlineNotice}>友だち追加画面を開けませんでした。LINEの画面で追加したあと、もう一度確認してください。</p> : null}<button className={styles.primaryButton} disabled={adding} onClick={() => { setAdding(true); setAddError(false); void addLiffFriend().then(onRetry).catch(() => { setAdding(false); setAddError(true); }); }}>{adding ? "確認中…" : "友だち追加へ"}</button><button className={styles.secondaryButton} onClick={onRetry}>追加したので確認する</button></main>;
  return <main className={styles.authScreen}><img src="/content/01_すわぷよ/01_キャラクター/02_表示用/01_すーすー.png" alt="すーすー"/><h1>LINEに接続できませんでした</h1><p>通信を確認して、もう一度お試しください。遊びの途中の記録は消えません。</p><p className={styles.errorCode}>エラー: {state.errorCode ?? "init_failed"}</p><button className={styles.primaryButton} onClick={onRetry}>もう一度確認</button></main>;
}

function FriendScreen({ onAdded }: { onAdded: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return <main className={styles.storyScreen}><img className={styles.storyCharacter} src="/content/01_すわぷよ/01_キャラクター/02_表示用/02_わーわー.png" alt="わーわー"/><h1>ともだちになると<br/>きろくとキャラを<br/>もちかえれるよ</h1><button className={styles.primaryButton} onClick={onAdded}>LINEでともだちになる</button><button className={styles.textButton} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>なぜ必要？</button>{expanded ? <p>遊んだ記録を同じ家族の続きとして開くために使います。</p> : null}</main>;
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
  return <main className={styles.welcomeScreen}><div className={styles.skyScene}><img src="/content/01_すわぷよ/01_キャラクター/02_表示用/02_わーわー.png" alt="わーわー"/><div className={styles.speech}>いっしょに遊ぼう</div></div><h1>すわぷよへ ようこそ</h1><button className={styles.primaryButton} onClick={() => { setIntent("play"); accept(onPlay); }}>すわぷよを始める</button><p>村の仲間を教えると、みんなが村へやってくるよ</p><div className={styles.splitActions}><button className={styles.secondaryButton} onClick={() => { setIntent("survey"); accept(onSurvey); }}>先に教える</button><button className={styles.secondaryButton} onClick={() => { setIntent("play"); accept(onPlay); }}>あとで</button></div>{consentOpen ? <ConsentSheet onAccept={acceptConsent} onClose={() => setConsentOpen(false)}/> : null}</main>;
}

function HomeScreen({ navigate }: { navigate: (path: string) => void }) {
  const snapshot = getSnapshot();
  const selected = CHARACTERS.find((character) => character.id === snapshot.selectedCharacterId) ?? CHARACTERS[0];
  return <main className={styles.homeScreen}><header><div><p>おはよう！</p><h1>きょうの村</h1></div><button onClick={() => navigate("/settings/family")}>保護者用</button></header><DataModeBadge/><section className={styles.villageHero}>{selected !== undefined ? <img src={selected.image} alt={selected.name}/> : null}<div><strong>{selected?.name ?? "村のなかま"}</strong><span>きょうも待ってるよ</span></div></section><button className={styles.primaryButton} onClick={() => navigate("/play")}>つづきから遊ぶ</button><section className={styles.homeMission}><div><span>今日のミッション</span><b>0/3</b></div><div className={styles.missionTrack}><i/><i/><i/></div><p>{snapshot.arrived ? "なかまと一緒に体操してみよう" : "アンケートで仲間が登場！"}</p><button onClick={() => navigate("/missions")}>くわしく見る</button></section></main>;
}

function ChildSettingsRow({ child, index, onChange }: { child: SurveyChild; index: number; onChange: (snapshot: AppSnapshot) => void }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [year, setYear] = useState(String(child.birthYear ?? ""));
  const [month, setMonth] = useState(String(child.birthMonth ?? ""));
  const [gender, setGender] = useState<ChildGender>(child.gender);
  const [error, setError] = useState<string | undefined>(undefined);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 19 }, (_, offset) => currentYear - offset);
  const genderLabel = SURVEY_COPY.gender.options.find(([, value]) => value === child.gender)?.[0] ?? "答えたくない";

  function save(): void {
    try {
      onChange(updateChild(child.id, { birthYear: Number(year), birthMonth: Number(month), gender }));
      setEditing(false);
      setError(undefined);
    } catch {
      setError("生まれた年月を確認してください");
    }
  }

  if (editing) return <fieldset className={styles.childCard}>
    <legend>{index + 1}人目のお子さん</legend>
    <div className={styles.birthPicker}>
      <label>生まれた年<select aria-label={`${index + 1}人目の生まれた年`} value={year} onChange={(event) => setYear(event.target.value)}>{years.map((option) => <option key={option} value={option}>{option}年</option>)}</select></label>
      <label>月<select aria-label={`${index + 1}人目の生まれた月`} value={month} onChange={(event) => setMonth(event.target.value)}>{Array.from({ length: 12 }, (_, offset) => offset + 1).map((option) => <option key={option} value={option}>{option}月</option>)}</select></label>
    </div>
    <div className={styles.optionGrid}>{SURVEY_COPY.gender.options.map(([label, value]) => <button type="button" aria-pressed={gender === value} key={value} onClick={() => setGender(value)}>{label}</button>)}</div>
    {error && <p className={styles.fieldError} role="alert">{error}</p>}
    <button className={styles.primaryButton} onClick={save}>保存する</button>
    <button className={styles.textButton} onClick={() => setEditing(false)}>やめる</button>
  </fieldset>;

  return <div className={styles.childCard}>
    <div className={styles.childCardTitle}><span>{index + 1}人目・{child.birthYear}年{child.birthMonth}月・{genderLabel}</span></div>
    {confirmingDelete ? <div><p>{index + 1}人目のお子さんの情報を削除します。よろしいですか？</p><button className={styles.primaryButton} onClick={() => onChange(deleteChild(child.id))}>削除する</button><button className={styles.textButton} onClick={() => setConfirmingDelete(false)}>やめる</button></div> : <div className={styles.optionGrid}>
      <button onClick={() => setEditing(true)}>変更</button>
      <button onClick={() => setConfirmingDelete(true)}>削除</button>
    </div>}
  </div>;
}

export function FamilySettings({ navigate }: { navigate: (path: string) => void }) {
  const [snapshot, setSnapshot] = useState(getSnapshot);
  const [revokeConfirming, setRevokeConfirming] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const survey = snapshot.survey;
  function update(preferredActivity: PreferredActivity) {
    if (survey === null) return;
    setSnapshot(saveSurvey({ ...survey, preferredActivity }));
  }
  function handleRevokeConsent(): void {
    revokeConsent("survey");
    setSnapshot(getSnapshot());
    setRevokeConfirming(false);
  }
  function handleDeleteAll(): void {
    deleteAllUserData();
    navigate("/");
  }
  return <main className={styles.contentScreen}>
    <div className={styles.screenTitleRow}><div><p className={styles.eyebrow}>保護者用</p><h1>遊びの設定</h1></div><button onClick={() => navigate("/")}>閉じる</button></div>
    {survey === null ? <section className={styles.settingsCard}><p>まだ遊び方を設定していません。</p><button className={styles.primaryButton} onClick={() => navigate("/onboarding")}>3問で設定する</button></section> : <section className={styles.settingsCard}>
      <h2>{SURVEY_COPY.activity.question}</h2><p>次に体操を開いたときの表示順へ反映します。いつでも変更できます。</p>
      <div className={styles.optionGrid}>{SURVEY_COPY.activity.options.map(([label, value]) => <button aria-pressed={survey.preferredActivity === value} key={value} onClick={() => update(value)}>{label}</button>)}</div>
      <p className={styles.successNotice} role="status">現在の設定：{survey.preferredActivity === "mouth" ? "お口あそび" : survey.preferredActivity === "body" ? "からだあそび" : survey.preferredActivity === "random" ? "おまかせ" : "あとで選ぶ"}</p>
    </section>}
    {survey !== null && <section className={styles.settingsCard}>
      <h2>お子さんの情報</h2>
      {survey.children.length === 0 ? <p>登録したお子さんはいません。</p> : <div className={styles.childCards}>
        {survey.children.map((child, index) => <ChildSettingsRow child={child} index={index} key={child.id} onChange={setSnapshot} />)}
      </div>}
    </section>}
    <section className={styles.settingsCard}>
      <h2>データの取り扱い</h2>
      {hasConsent("survey") && <>
        {revokeConfirming ? <div><p>登録した年月・性別・遊んだ記録の保存を止めます。よろしいですか？</p><button className={styles.primaryButton} onClick={handleRevokeConsent}>同意を撤回する</button><button className={styles.textButton} onClick={() => setRevokeConfirming(false)}>やめる</button></div> : <button className={styles.secondaryButton} onClick={() => setRevokeConfirming(true)}>遊びの記録の保存をやめる</button>}
      </>}
      {deleteConfirming ? <div><p>この端末に保存したすべてのデータを削除します。元に戻せません。</p><button className={styles.primaryButton} onClick={handleDeleteAll}>削除する</button><button className={styles.textButton} onClick={() => setDeleteConfirming(false)}>やめる</button></div> : <button className={styles.textButton} onClick={() => setDeleteConfirming(true)}>すべてのデータを削除する</button>}
    </section>
  </main>;
}

function ExerciseComplete({ queued, navigate }: { queued: boolean; navigate: (path: string) => void }) {
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setShowIntro(true), 850); return () => window.clearTimeout(timer); }, []);
  return <main className={styles.completeScreen}><img src="/content/01_すわぷよ/01_キャラクター/02_表示用/07_もぐぴよ.png" alt="もぐぴよ"/><h1>できたね！</h1><p>きょうの体操を1こ記録しました</p>{queued ? <p className={styles.offlineNotice}>端末にあずかりました。接続後に送ります。</p> : <p className={styles.successNotice}>きろくに残しました</p>}{showIntro ? <ExerciseBoothIntro onOpen={() => navigate("/village/booths")} onLater={() => navigate("/progress")}/> : <p role="status">村からのお祝いを準備中…</p>}</main>;
}

export function MvpApp() {
  const { path, navigate } = useRoute();
  const [exerciseResult, setExerciseResult] = useState<boolean | null>(null);
  const [liffAttempt, setLiffAttempt] = useState(0);
  const [liffState, setLiffState] = useState<SuwapuyoLiffState>({ status: "loading", inClient: false });
  useEffect(() => {
    let active = true;
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
  useEffect(() => {
    // LIFF深リンク(?claim=... / liff.state内claim)からQRクレーム画面へ誘導
    // (concierge の booth パラメータと同パターン)。navigate 後は claim= が
    // search から消えるため再実行してもループしない。
    const claimToken = getClaimTokenFromUrl();
    if (claimToken !== null && path !== "/claim") {
      navigate(`/claim?token=${encodeURIComponent(claimToken)}`);
    }
  }, [path, navigate]);
  if (isRetiredDemoPath(path)) return <main className={styles.forbiddenScreen}><h1>このデモは終了しました</h1><p>現在のすわぷよへ移動してください。</p><button onClick={() => navigate("/")}>すわぷよを開く</button></main>;
  if (liffState.status !== "ready" && liffState.status !== "demo") return <LiffGateScreen state={liffState} onRetry={() => {
    setLiffState({ status: "loading", inClient: false });
    setLiffAttempt((value) => value + 1);
  }}/>;
  if (path === "/claim") return <ClaimScreen navigate={navigate}/>;
  if (path === "/auth") return <AuthScreen onContinue={() => navigate("/auth/friend")}/>;
  if (path === "/auth/friend") return <FriendScreen onAdded={() => navigate("/welcome")}/>;
  if (path === "/welcome") return <WelcomeScreen onSurvey={() => navigate("/onboarding")} onPlay={() => navigate("/onboarding")}/>;
  if (path === "/onboarding" && !hasConsent("product")) return <WelcomeScreen onSurvey={() => navigate("/onboarding")} onPlay={() => navigate("/onboarding")}/>;
  if (path === "/onboarding") return <OnboardingFlow onSkip={() => navigate("/welcome")} onComplete={() => navigate("/arrival")}/>;
  if (hasConsent("product") && getSnapshot().survey === null) return <OnboardingFlow onSkip={() => navigate("/welcome")} onComplete={() => navigate("/arrival")}/>;
  if (path.startsWith("/events/") && path.includes("/survey/")) {
    const phase = path.split("/")[4];
    if (phase === "before" || phase === "during" || phase === "after") return <EventSurveyScreen phase={phase} onDone={() => navigate("/play")} onSkip={() => navigate("/play")}/>;
    return <main className={styles.storyScreen}><h1>イベント質問はありません</h1><p>通常どおり遊べます。</p><button className={styles.primaryButton} onClick={() => navigate("/play")}>遊ぶ</button></main>;
  }
  if (path === "/arrival") return <ArrivalScreen onContinue={() => navigate("/characters")}/>;
  if (path === "/characters") return <CharacterSelectScreen onSelect={() => navigate("/play")} onCancel={() => navigate("/play")}/>;
  if (path === "/settings/family") return <FamilySettings navigate={navigate}/>;
  if (path === "/play") return <GameRoute onHome={() => navigate("/")} onExercise={() => { setExerciseResult(null); navigate(`/exercise/${dailyPreferredExercise(getSnapshot().survey?.preferredActivity ?? "unanswered")}`); }} onNewGame={() => { rerollUnpinnedSlots(); navigate("/characters"); }}/>;
  if (path.startsWith("/exercise/complete")) return <ExerciseComplete queued={exerciseResult === true} navigate={navigate}/>;
  if (path.startsWith("/exercise/")) {
    const candidate = path.split("/")[2];
    const type: ExerciseType = candidate === "breath" || candidate === "neck" ? candidate : "mouth";
    return <ExerciseScreen type={type} onLater={() => navigate("/play")} onComplete={(queued) => { setExerciseResult(queued); navigate("/exercise/complete"); }}/>;
  }
  if (path === "/progress") return <MvpShell active="progress" onNavigate={navigate}><ProgressScreen onMissions={() => navigate("/missions")} onPlay={() => navigate("/play")}/></MvpShell>;
  if (path === "/missions") return <MvpShell active="progress" onNavigate={navigate}><MissionsScreen/></MvpShell>;
  if (path.startsWith("/events/") && path.includes("/booths/") && path.endsWith("/check-in")) {
    const segments = path.split("/");
    const campaignId = segments[2] ?? DEMO_CAMPAIGN_ID;
    const boothId = segments[4] ?? "";
    return <BoothCheckinScreen campaignId={campaignId} boothId={boothId} onFindNext={() => navigate("/village/booths")}/>;
  }
  if (path === "/village/booths") return <MvpShell active="village" onNavigate={navigate}><FeaturedBoothCatalog onMap={() => navigate("/village/map")}/></MvpShell>;
  if (path === "/village/map") return <MvpShell active="village" onNavigate={navigate}><VenueMapFallback onList={() => navigate("/village/booths")}/></MvpShell>;
  if (path === "/village/stamps") return <MvpShell active="village" onNavigate={navigate}><StampBook campaignId={DEMO_CAMPAIGN_ID} onBooth={(boothId) => navigate(`/events/${DEMO_CAMPAIGN_ID}/booths/${boothId}/check-in`)}/></MvpShell>;
  if (path.startsWith("/events/") && path.endsWith("/check-in")) {
    const campaignId = path.split("/")[2];
    return <EventCheckinScreen campaignId={campaignId} onPlay={() => navigate("/play")} onBooths={() => navigate("/village/booths")}/>;
  }
  if (path === "/makers") return <MakerPage onExit={() => navigate("/")}/>;
  if (path.startsWith("/reports/exhibitors/")) {
    const id = path.split("/")[3];
    return id === REPORT_ID ? <ExhibitorReport onBizContactClick={() => { void recordEvent(newEvent("biz_contact_clicked", { reportId: REPORT_ID })); }}/> : <main className={styles.forbiddenScreen}><h1>レポートを表示できません</h1><p>URLを確認してください。</p></main>;
  }
  if (path !== "/") return <main className={styles.forbiddenScreen}><h1>ページが見つかりません</h1><p>URLを確認してください。</p><button onClick={() => navigate("/")}>ホームへ戻る</button></main>;
  if (!hasConsent("product")) return <WelcomeScreen onSurvey={() => navigate("/onboarding")} onPlay={() => navigate("/onboarding")}/>;
  return <MvpShell active="play" onNavigate={navigate}><HomeScreen navigate={navigate}/></MvpShell>;
}
