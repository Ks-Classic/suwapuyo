import { useCallback, useEffect, useState } from "react";
import { CHARACTERS } from "../config/characters";
import { ExerciseScreen } from "../exercise/ExerciseScreen";
import { GameRoute } from "../game/GameRoute";
import { ArrivalScreen } from "../onboarding/ArrivalScreen";
import { OnboardingFlow } from "../onboarding/OnboardingFlow";
import { MissionsScreen, ProgressScreen } from "../progress/ProgressScreens";
import { ExhibitorReport } from "../report/ExhibitorReport";
import { createProfileAfterConsent, flushEventQueue, getSnapshot, grantConsent, hasConsent, newEvent, PRODUCT_CONSENT_VERSION, recordEvent } from "../shared/localMvpRepository";
import type { ExerciseType } from "../shared/mvpTypes";
import { CharacterCatalog } from "../village/CharacterCatalog";
import { BoothListScreen, ExerciseBoothIntro, VenueMapFallback } from "../village/VillageScreens";
import { DataModeBadge, MvpShell } from "./MvpShell";
import styles from "./mvp.module.css";

const REPORT_ID = "86da2704-835e-4e7b-9cf0-41f18be8cb21";

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

function FriendScreen({ onAdded }: { onAdded: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return <main className={styles.storyScreen}><img className={styles.storyCharacter} src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="わーわー"/><h1>ともだちになると<br/>きろくとキャラを<br/>もちかえれるよ</h1><button className={styles.primaryButton} onClick={onAdded}>LINEでともだちになる</button><button className={styles.textButton} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>なぜ必要？</button>{expanded ? <p>遊んだ記録を同じ家族の続きとして開くために使います。</p> : null}</main>;
}

function ConsentSheet({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
  return <div className={styles.sheetBackdrop} role="presentation"><section className={styles.consentSheet} role="dialog" aria-modal="true" aria-labelledby="consent-title"><button className={styles.sheetClose} onClick={onClose}>やめる</button><p className={styles.eyebrow}>保護者用</p><h2 id="consent-title">はじめるまえに</h2><ul><li>きろくは家族単位で保存</li><li>お名前・住所はききません</li><li>イベント改善に集計利用します</li></ul><details><summary>全文を見る</summary><p>体験回数と利用状況を保存します。診断や健康評価には使いません。撤回・削除についてはこの画面からいつでも確認できます。</p></details><button className={styles.primaryButton} onClick={onAccept}>同意してはじめる</button></section></div>;
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
    createProfileAfterConsent();
    setConsentOpen(false);
    if (intent === "survey") onSurvey(); else onPlay();
  }
  return <main className={styles.welcomeScreen}><div className={styles.skyScene}><img src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="わーわー"/><div className={styles.speech}>いっしょに遊ぼう</div></div><h1>すわぷよへ ようこそ</h1><button className={styles.primaryButton} onClick={() => { setIntent("play"); accept(onPlay); }}>すわぷよを始める</button><p>村の仲間を教えると、みんなが村へやってくるよ</p><div className={styles.splitActions}><button className={styles.secondaryButton} onClick={() => { setIntent("survey"); accept(onSurvey); }}>先に教える</button><button className={styles.secondaryButton} onClick={() => { setIntent("play"); accept(onPlay); }}>あとで</button></div>{consentOpen ? <ConsentSheet onAccept={acceptConsent} onClose={() => setConsentOpen(false)}/> : null}</main>;
}

function HomeScreen({ navigate }: { navigate: (path: string) => void }) {
  const snapshot = getSnapshot();
  const selected = CHARACTERS.find((character) => character.id === snapshot.selectedCharacterId) ?? CHARACTERS[0];
  return <main className={styles.homeScreen}><header><div><p>おはよう！</p><h1>きょうの村</h1></div><button onClick={() => navigate("/welcome?consent=1")}>保護者用</button></header><DataModeBadge/><section className={styles.villageHero}>{selected !== undefined ? <img src={selected.image} alt={selected.name}/> : null}<div><strong>{selected?.name ?? "村のなかま"}</strong><span>きょうも待ってるよ</span></div></section><button className={styles.primaryButton} onClick={() => navigate("/play")}>つづきから遊ぶ</button><section className={styles.homeMission}><div><span>今日のミッション</span><b>0/3</b></div><div className={styles.missionTrack}><i/><i/><i/></div><p>{snapshot.arrived ? "なかまと一緒に体操してみよう" : "アンケートで仲間が登場！"}</p><button onClick={() => navigate("/missions")}>くわしく見る</button></section></main>;
}

function ExerciseComplete({ queued, navigate }: { queued: boolean; navigate: (path: string) => void }) {
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setShowIntro(true), 850); return () => window.clearTimeout(timer); }, []);
  return <main className={styles.completeScreen}><img src="/content/fuwafuwa-land/characters/display/mogupiyo.png" alt="もぐぴよ"/><h1>できたね！</h1><p>きょうの体操を1こ記録しました</p>{queued ? <p className={styles.offlineNotice}>端末にあずかりました。接続後に送ります。</p> : <p className={styles.successNotice}>きろくに残しました</p>}{showIntro ? <ExerciseBoothIntro onOpen={() => navigate("/village/booths")} onLater={() => navigate("/progress")}/> : <p role="status">村からのお祝いを準備中…</p>}</main>;
}

export function MvpApp() {
  const { path, navigate } = useRoute();
  const [exerciseResult, setExerciseResult] = useState<boolean | null>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [path]);
  useEffect(() => {
    const flush = () => { void flushEventQueue(); };
    window.addEventListener("online", flush);
    flush();
    return () => window.removeEventListener("online", flush);
  }, []);
  if (path === "/auth") return <AuthScreen onContinue={() => navigate("/auth/friend")}/>;
  if (path === "/auth/friend") return <FriendScreen onAdded={() => navigate("/welcome")}/>;
  if (path === "/welcome") return <WelcomeScreen onSurvey={() => navigate("/survey/family")} onPlay={() => navigate("/")}/>;
  if (path === "/survey/family") return <OnboardingFlow onSkip={() => navigate("/play")} onComplete={() => navigate("/arrival")}/>;
  if (path === "/arrival") return <ArrivalScreen onContinue={() => navigate("/characters")}/>;
  if (path === "/characters") return <CharacterCatalog onDone={() => navigate("/play")}/>;
  if (path === "/play") return <GameRoute onHome={() => navigate("/")} onExercise={() => { setExerciseResult(null); navigate("/exercise/mouth"); }} onCharacters={() => navigate("/characters")}/>;
  if (path.startsWith("/exercise/complete")) return <ExerciseComplete queued={exerciseResult === true} navigate={navigate}/>;
  if (path.startsWith("/exercise/")) {
    const candidate = path.split("/")[2];
    const type: ExerciseType = candidate === "breath" || candidate === "neck" ? candidate : "mouth";
    return <ExerciseScreen type={type} onLater={() => navigate("/play")} onComplete={(queued) => { setExerciseResult(queued); navigate("/exercise/complete"); }}/>;
  }
  if (path === "/progress") return <MvpShell active="progress" onNavigate={navigate}><ProgressScreen onMissions={() => navigate("/missions")} onPlay={() => navigate("/play")}/></MvpShell>;
  if (path === "/missions") return <MvpShell active="progress" onNavigate={navigate}><MissionsScreen/></MvpShell>;
  if (path === "/village/booths") return <MvpShell active="village" onNavigate={navigate}><BoothListScreen onMap={() => navigate("/village/map")}/></MvpShell>;
  if (path === "/village/map") return <MvpShell active="village" onNavigate={navigate}><VenueMapFallback onList={() => navigate("/village/booths")}/></MvpShell>;
  if (path.startsWith("/reports/exhibitors/")) {
    const id = path.split("/")[3];
    return id === REPORT_ID ? <ExhibitorReport onBizContactClick={() => { void recordEvent(newEvent("biz_contact_clicked", { reportId: REPORT_ID })); }}/> : <main className={styles.forbiddenScreen}><h1>レポートを表示できません</h1><p>URLを確認してください。</p></main>;
  }
  if (!hasConsent("product")) return <WelcomeScreen onSurvey={() => navigate("/survey/family")} onPlay={() => navigate("/")}/>;
  return <MvpShell active="play" onNavigate={navigate}><HomeScreen navigate={navigate}/></MvpShell>;
}
