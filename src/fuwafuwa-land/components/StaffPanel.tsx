import { useEffect, useState } from "react";
import type { Artwork, FuwafuwaServices } from "../types";
import { RegisterForm } from "./RegisterForm";
import { ArtworkList } from "./ArtworkList";
import { SUUSUU_CONFIG } from "../config";

interface StaffPanelProps {
  services: FuwafuwaServices;
}

export function StaffPanel({ services }: StaffPanelProps) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    try {
      setArtworks(await services.repository.list());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "load_failed");
    }
  };

  useEffect(() => {
    void services.repository.list().then(setArtworks).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "load_failed");
    });
    const subscription = services.repository.subscribeArtworkChanges(
      (artwork) => setArtworks((current) => [artwork, ...current.filter((item) => item.id !== artwork.id)]),
      () => undefined,
    );
    return () => {
      void subscription.unsubscribe();
    };
  }, [services.repository]);

  return (
    <main className="fuwafuwa-staff">
      <header className="fuwafuwa-header">
        <h1>ふわふわランド</h1>
        <nav className="fuwafuwa-screen-links" aria-label="画面移動">
          <a href="/">ホーム</a>
          <a href="/display">ディスプレイ</a>
        </nav>
      </header>
      <RegisterForm repository={services.repository} displayState={services.displayState} onRegistered={(artwork) => setArtworks((current) => [artwork, ...current.filter((item) => item.id !== artwork.id)])} />
      <section className="fuwafuwa-panel">
        <div className="fuwafuwa-toolbar">
          <button type="button" onClick={() => void services.displayState.resetDisplay().then(refresh)}>
            全リセット
          </button>
          <button type="button" onClick={() => void services.displayState.randomizeDisplay(SUUSUU_CONFIG.display.standardCount, true).then(refresh)}>
            ランダム
          </button>
          <button type="button" onClick={() => void services.displayState.pauseToggle()}>
            一時停止
          </button>
          {SUUSUU_CONFIG.display.selectableCounts.map((count) => (
            <button key={count} type="button" onClick={() => void services.displayState.setMaxVisible(count)}>
              {count}
            </button>
          ))}
        </div>
      </section>
      <ArtworkList artworks={artworks} repository={services.repository} displayState={services.displayState} onRefresh={() => void refresh()} />
      {message !== null ? <p className="fuwafuwa-message">{message}</p> : null}
    </main>
  );
}
