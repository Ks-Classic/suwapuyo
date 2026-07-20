import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseRuntimeConfig } from "./lib/supabase";
import { createFuwafuwaServices } from "./store/displayState";
import { requestStoragePersistence } from "./store/db";
import { StaffPanel, type OperationsTab } from "./components/StaffPanel";
import { DisplayScreen } from "./components/DisplayScreen";
import { FuwafuwaDrawScreen } from "./components/FuwafuwaDrawScreen";
import { SUUSUU_CONFIG } from "./config";
import { readStaffTab } from "./staffRouting";
import "./styles.css";

type FuwafuwaRoute = "home" | "draw" | "staff" | "display" | "debug";

function readRoute(): FuwafuwaRoute {
  const path = window.location.pathname.replace(/\/$/, "");
  if (path === "/staff/debug") {
    return "debug";
  }
  if (path === "/staff" || path.startsWith("/staff/")) {
    return "staff";
  }
  if (path === "/fuwafuwa/draw") {
    return "draw";
  }
  if (path === "/display") {
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
        <a className="fuwafuwa-home-link is-primary" href="/">
          <img src="/content/01_すわぷよ/01_キャラクター/02_表示用/07_もぐぴよ.png" alt="" />
          <strong>すわぷよ</strong>
          <span>選んだなかまとぷよで遊ぶ</span>
        </a>
        <a className="fuwafuwa-home-link" href="/village/map">
          <img src="/content/01_すわぷよ/01_キャラクター/02_表示用/01_すーすー.png" alt="" />
          <strong>会場マップ</strong>
          <span>エリアや一覧から出展者を見る</span>
        </a>
      </nav>

      {/* 来場者には見せない運営用ツール。ホームの主役メニューとは視覚的に分離する。 */}
      <nav className="fuwafuwa-home-ops" aria-label="運営用（来場者には見せない画面）">
        <span className="fuwafuwa-home-ops-label">運営用（来場者には見せません）</span>
        <a className="fuwafuwa-home-ops-link" href="/staff">スタッフ：撮る・選ぶ・描く・登録する</a>
        <a className="fuwafuwa-home-ops-link" href="/display">ディスプレイ：会場モニター表示</a>
        <a className="fuwafuwa-home-ops-link" href="/staff/debug">チェック：FPS・件数・接続状態</a>
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
  const [staffTab, setStaffTab] = useState<OperationsTab>(() => readStaffTab(window.location.pathname));
  const services = useMemo(() => (getSupabaseRuntimeConfig() === null ? null : createFuwafuwaServices()), []);

  useEffect(() => {
    const syncFromLocation = () => {
      setRoute(readRoute());
      setStaffTab(readStaffTab(window.location.pathname));
    };
    window.addEventListener("hashchange", syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);
    void requestStoragePersistence();
    return () => {
      window.removeEventListener("hashchange", syncFromLocation);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, []);

  // タブ変更時にURLへ同期し、ブラウザバックでタブが戻れるようにする。
  const openStaffTab = useCallback((tab: OperationsTab): void => {
    setStaffTab(tab);
    const nextPath = tab === "home" ? "/staff" : `/staff/${tab}`;
    if (window.location.pathname.replace(/\/$/, "") !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
  }, []);

  if (route === "home") {
    return <FuwafuwaHome />;
  }
  if (route === "draw") {
    return <FuwafuwaDrawScreen services={services ?? undefined} />;
  }
  if (services === null) {
    return <MissingConfig />;
  }
  if (route === "staff") {
    return <StaffPanel services={services} tab={staffTab} onTabChange={openStaffTab} />;
  }
  return <DisplayScreen services={services} debug={route === "debug"} />;
}
