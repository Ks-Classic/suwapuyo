import { useState } from "react";
import { CHARACTERS } from "../config/characters";
import { getSnapshot, selectCharacter } from "../shared/localMvpRepository";
import styles from "../app/mvp.module.css";

export function CharacterCatalog({ onDone }: { onDone: () => void }) {
  const snapshot = getSnapshot();
  const [selected, setSelected] = useState(snapshot.selectedCharacterId);
  return <main className={styles.contentScreen}><p className={styles.eyebrow}>ぜんいんの姿と名前が見られるよ</p><h1>いっしょにあそぶ なかま</h1>
    <div className={styles.characterCatalog}>{CHARACTERS.map((character) => {
      const arrived = snapshot.arrived;
      return <button key={character.id} aria-pressed={selected === character.id} onClick={() => { if (arrived) { selectCharacter(character.id); setSelected(character.id); } }}><img src={character.image} alt=""/><strong>{character.name}</strong><small>{arrived ? "村にきてる" : "アンケートで村に呼べる"}</small></button>;
    })}</div>
    <button className={styles.primaryButton} disabled={!snapshot.arrived} onClick={onDone}>このこと あそぶ</button><button className={styles.secondaryButton} onClick={onDone}>もどる</button>
  </main>;
}
