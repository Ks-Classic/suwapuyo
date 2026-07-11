import { useEffect, useState } from "react";
import { CHARACTERS } from "../config/characters";
import { markArrived } from "../shared/localMvpRepository";
import styles from "../app/mvp.module.css";

export function ArrivalScreen({ onContinue }: { onContinue: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    markArrived();
    const timer = window.setTimeout(() => setReady(true), 1600);
    return () => window.clearTimeout(timer);
  }, []);
  return <main className={styles.arrivalScreen}>
    <div className={styles.arrivalLight} aria-hidden="true" />
    <p className={styles.eyebrow}>村に新しい風がふいたよ</p>
    <h1>みんなが なかまになった！</h1>
    <div className={styles.arrivalGroup} aria-label="村へやってきた仲間">
      {CHARACTERS.slice(0, 10).map((character, index) => <figure key={character.id} style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}><img src={character.image} alt={character.name}/><figcaption>{character.name}</figcaption></figure>)}
    </div>
    <p>ゲームでいっしょに遊べるよ</p>
    <button className={styles.primaryButton} disabled={!ready} onClick={onContinue}>{ready ? "いっしょに遊ぶ" : "なかまたちが向かっています"}</button>
    <button className={styles.secondaryButton} onClick={onContinue}>演出をスキップ</button>
  </main>;
}
