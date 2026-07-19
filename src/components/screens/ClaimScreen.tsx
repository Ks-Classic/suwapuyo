import { useMemo } from "react";
import styles from "../../app/mvp.module.css";

export interface ClaimScreenProps {
  navigate: (path: string) => void;
}

// QRクレーム画面(プレースホルダ)。
// `/claim?token=...` の token を読み取って表示するところまでを土台として用意。
// claim_character RPC 呼び出し(src/integrations/characterClaim.ts の claimCharacter)、
// LINE userId 解決(demo モードは getDemoLineUserId)、成功演出と buddyStore 取り込みは
// ゲーム担当ビルダーが実装する。
export function ClaimScreen({ navigate }: ClaimScreenProps) {
  const token = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get("token");
    return raw === null || raw.trim().length === 0 ? null : raw.trim();
  }, []);

  if (token === null) {
    return (
      <main className={styles.storyScreen}>
        <h1>QRコードを うまく よみこめなかったよ</h1>
        <p>おてすうですが、もういちど QRコードを よみこんでね。</p>
        <button className={styles.primaryButton} onClick={() => navigate("/")}>ホームへもどる</button>
      </main>
    );
  }

  return (
    <main className={styles.storyScreen}>
      <h1>きみのキャラを むかえに いってるよ…</h1>
      <p role="status">じゅんびちゅう…</p>
    </main>
  );
}
