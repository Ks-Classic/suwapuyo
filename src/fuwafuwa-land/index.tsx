import { useEffect, useMemo, useState } from "react";
import { getSupabaseRuntimeConfig } from "./lib/supabase";
import { createFuwafuwaServices } from "./store/displayState";
import { requestStoragePersistence } from "./store/db";
import { StaffPanel } from "./components/StaffPanel";
import { DisplayScreen } from "./components/DisplayScreen";
import { FuwafuwaDrawScreen } from "./components/FuwafuwaDrawScreen";
import { SUUSUU_CONFIG } from "./config";
import "./styles.css";

type FuwafuwaRoute = "home" | "draw" | "staff" | "display" | "debug";

function readRoute(): FuwafuwaRoute {
  const path = window.location.pathname.replace(/\/$/, "");
  if (path === "/staff" || path === "/fuwafuwa/staff") {
    return "staff";
  }
  if (path === "/debug" || path === "/fuwafuwa/debug") {
    return "debug";
  }
  if (path === "/fuwafuwa/draw") {
    return "draw";
  }
  if (path === "/display" || path === "/fuwafuwa/display") {
    return "display";
  }

  const hash = window.location.hash;
  if (hash.startsWith("#/fuwafuwa/staff")) {
    return "staff";
  }
  if (hash.startsWith("#/fuwafuwa/debug")) {
    return "debug";
  }
  if (hash.startsWith("#/fuwafuwa/draw")) {
    return "draw";
  }
  if (hash.startsWith("#/fuwafuwa/display")) {
    return "display";
  }
  return "home";
}

function FuwafuwaHome() {
  return (
    <main className="fuwafuwa-home">
      <section className="fuwafuwa-home-stage" aria-labelledby="fuwafuwa-home-title">
        <div className="fuwafuwa-home-copy">
          <span className="fuwafuwa-home-kicker">すーすーわーわー</span>
          <h1 id="fuwafuwa-home-title">ふわふわランド</h1>
          <p>描いたなかまが、村の空にふわっと登場します。</p>
        </div>
        <div className="fuwafuwa-home-characters" aria-label="すーすーわーわーのなかまたち">
          {SUUSUU_CONFIG.sampleCharacters.map((character) => (
            <img key={character.id} src={character.imageUrl} alt="" />
          ))}
        </div>
      </section>

      <nav className="fuwafuwa-home-nav" aria-label="ふわふわランドメニュー">
        <a className="fuwafuwa-home-link is-primary" href="/line">
          <img src="/content/01_すわぷよ/01_キャラクター/02_表示用/02_わーわー.png" alt="" />
          <strong>村の案内所</strong>
          <span>LINE風メニューから全体を見る</span>
        </a>
        <a className="fuwafuwa-home-link is-primary" href="/">
          <img src="/content/01_すわぷよ/01_キャラクター/02_表示用/07_もぐぴよ.png" alt="" />
          <strong>すわぷよ</strong>
          <span>選んだなかまとぷよで遊ぶ</span>
        </a>
        <a className="fuwafuwa-home-link" href="/concierge">
          <img src="/content/01_すわぷよ/01_キャラクター/02_表示用/01_すーすー.png" alt="" />
          <strong>会場マップ</strong>
          <span>村の案内所からランド別に出展者を見る</span>
        </a>
      </nav>

      {/* 来場者には見せない運営用ツール。ホームの主役メニューとは視覚的に分離する。 */}
      <nav className="fuwafuwa-home-ops" aria-label="運営用（来場者には見せない画面）">
        <span className="fuwafuwa-home-ops-label">運営用（来場者には見せません）</span>
        <a className="fuwafuwa-home-ops-link" href="/staff">スタッフ：撮る・選ぶ・描く・登録する</a>
        <a className="fuwafuwa-home-ops-link" href="/display">ディスプレイ：会場モニター表示</a>
        <a className="fuwafuwa-home-ops-link" href="/debug">チェック：FPS・件数・接続状態</a>
      </nav>
    </main>
  );
}

function MissingConfig() {
  return (
    <main className="fuwafuwa-staff">
      <section className="fuwafuwa-panel">
        <h1>Supabase設定が必要です</h1>
        <p>`.env.local` に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定してください。</p>
      </section>
    </main>
  );
}

export function FuwafuwaApp() {
  const [route, setRoute] = useState<FuwafuwaRoute>(() => readRoute());
  const services = useMemo(() => (getSupabaseRuntimeConfig() === null ? null : createFuwafuwaServices()), []);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onPopState);
    void requestStoragePersistence();
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  if (route === "home") {
    return <FuwafuwaHome />;
  }
  if (route === "draw") {
    return <FuwafuwaDrawScreen />;
  }
  if (services === null) {
    return <MissingConfig />;
  }
  if (route === "staff") {
    return <StaffPanel services={services} />;
  }
  return <DisplayScreen services={services} debug={route === "debug"} />;
}
