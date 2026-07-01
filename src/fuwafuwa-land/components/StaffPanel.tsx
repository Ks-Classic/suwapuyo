import { useState } from "react";
import type { FuwafuwaServices } from "../types";
import { RegisterForm } from "./RegisterForm";
import { CharacterList } from "./CharacterList";

interface StaffPanelProps {
  services: FuwafuwaServices;
}

export function StaffPanel({ services }: StaffPanelProps) {
  const [characterRefreshToken, setCharacterRefreshToken] = useState(0);

  return (
    <main className="fuwafuwa-staff">
      <header className="fuwafuwa-header">
        <h1>ふわふわランド</h1>
        <nav className="fuwafuwa-screen-links" aria-label="画面移動">
          <a href="/">すわぷよ</a>
          <a href="/fuwafuwa">ホーム</a>
          <a href="/display">ディスプレイ</a>
        </nav>
      </header>
      <RegisterForm
        repository={services.repository}
        characterContent={services.characterContent}
        onRegistered={() => setCharacterRefreshToken((current) => current + 1)}
      />
      <section className="fuwafuwa-panel">
        <div className="fuwafuwa-panel-title">
          <strong>イベント</strong>
          <span>ディスプレイで演出が始まります</span>
        </div>
        <div className="fuwafuwa-toolbar">
          <button type="button" className="fuwafuwa-primary-action" onClick={() => void services.displayState.startBattleEvent()}>
            バトル
          </button>
          <button type="button" onClick={() => void services.displayState.clearDisplayEvent()}>
            イベント停止
          </button>
        </div>
      </section>
      <CharacterList repository={services.characterContent} artworkRepository={services.repository} refreshToken={characterRefreshToken} />
    </main>
  );
}
