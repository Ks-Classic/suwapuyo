import { useEffect, useMemo, useState } from "react";
import { getSupabaseRuntimeConfig } from "./lib/supabase";
import { createFuwafuwaServices } from "./store/displayState";
import { requestStoragePersistence } from "./store/db";
import { StaffPanel } from "./components/StaffPanel";
import { DisplayScreen } from "./components/DisplayScreen";
import { SUUSUU_CONFIG } from "./config";
import "./styles.css";

type FuwafuwaRoute = "home" | "staff" | "display" | "debug";

function readRoute(): FuwafuwaRoute {
  const path = window.location.pathname.replace(/\/$/, "");
  if (path === "/staff" || path === "/fuwafuwa/staff") {
    return "staff";
  }
  if (path === "/debug" || path === "/fuwafuwa/debug") {
    return "debug";
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
        <a className="fuwafuwa-home-link is-primary" href="/staff">
          <img src="/content/fuwafuwa-land/sprites/blob/preview.png" alt="" />
          <strong>スタッフ</strong>
          <span>撮る・選ぶ・描く・登録する</span>
        </a>
        <a className="fuwafuwa-home-link" href="/display">
          <img src="/content/fuwafuwa-land/sprites/ghost/preview.png" alt="" />
          <strong>ディスプレイ</strong>
          <span>モニターにふわふわ表示する</span>
        </a>
        <a className="fuwafuwa-home-link" href="/debug">
          <img src="/content/fuwafuwa-land/sprites/tooth/preview.png" alt="" />
          <strong>チェック</strong>
          <span>FPS・件数・接続状態を見る</span>
        </a>
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

  if (services === null) {
    return <MissingConfig />;
  }
  if (route === "home") {
    return <FuwafuwaHome />;
  }
  if (route === "staff") {
    return <StaffPanel services={services} />;
  }
  return <DisplayScreen services={services} debug={route === "debug"} />;
}
