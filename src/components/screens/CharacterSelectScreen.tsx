import { useEffect, useState } from "react";
import { loadCharacters, isUnlocked, type SelectableCharacter } from "../../config/characters";
import { ensureDemoBuddy, getBuddy, type BuddyRecord } from "../../shared/buddyStore";
import { getProgress, randomizePuyoCharacters, setPuyoCharacter, setSelectedBuddy, type PuyoSlotId } from "../../shared/progressStore";
import { track } from "../../shared/analytics";
import { VillageNarrator } from "../VillageNarrator";
import styles from "../../styles/demo.module.css";

interface CharacterSelectScreenProps {
  onSelect: () => void;
  onCancel: () => void;
}

const PUYO_SLOTS: { id: PuyoSlotId; label: string }[] = [
  { id: "ghost", label: "1枠目" },
  { id: "tooth", label: "2枠目" },
  { id: "blob", label: "3枠目" },
  { id: "tanuki", label: "4枠目" },
];

// 隠しキャラ解除の目安回数（お口の体操 mouth）。今回は予告ポップアップのみで
// 実解除はスタンプ経由のまま。数値変更はここだけ。
const MOUTH_UNLOCK_COUNT = 3;

export function CharacterSelectScreen({ onSelect, onCancel }: CharacterSelectScreenProps) {
  const [characters, setCharacters] = useState<SelectableCharacter[]>([]);
  const [buddy, setBuddy] = useState<BuddyRecord | null>(null);
  const [buddyUrl, setBuddyUrl] = useState<string | null>(null);
  const [slotSelections, setSlotSelections] = useState(() => getProgress().selected_puyo_character_ids);
  const [activeSlot, setActiveSlot] = useState<PuyoSlotId>("ghost");
  const [message, setMessage] = useState("だれと あそぶ〜？");
  const [lockedPopup, setLockedPopup] = useState<SelectableCharacter | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([loadCharacters(), getBuddy()])
      .then(([loadedCharacters, loadedBuddy]) => {
        if (!active) {
          return;
        }
        setCharacters(loadedCharacters);
        setBuddy(loadedBuddy);
        if (loadedBuddy !== null) {
          const url = URL.createObjectURL(loadedBuddy.image);
          setBuddyUrl(url);
        }
      })
      .catch((error: unknown) => {
        console.debug("character select load failed", error);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (buddyUrl !== null) {
        URL.revokeObjectURL(buddyUrl);
      }
    };
  }, [buddyUrl]);

  function chooseSelf(): void {
    void ensureDemoBuddy().then(() => {
      setPuyoCharacter(activeSlot, "self");
      setSelectedBuddy("self");
      setSlotSelections(getProgress().selected_puyo_character_ids);
      track("tap", { surface: "character_select", id: "self" });
      setMessage(`${PUYO_SLOTS.find((slot) => slot.id === activeSlot)?.label ?? "この枠"}に入れたよ`);
    });
  }

  function chooseCharacter(character: SelectableCharacter): void {
    const progress = getProgress();
    if (!isUnlocked(character, progress)) {
      setLockedPopup(character);
      track("tap", { surface: "character_select_locked", id: character.id });
      return;
    }
    setPuyoCharacter(activeSlot, character.id);
    setSelectedBuddy(character.id);
    setSlotSelections(getProgress().selected_puyo_character_ids);
    track("tap", { surface: "character_select", id: character.id });
    setMessage(`${PUYO_SLOTS.find((slot) => slot.id === activeSlot)?.label ?? "この枠"}は ${character.name}`);
  }

  function characterForSlot(slotId: PuyoSlotId): { name: string; image: string | null } {
    const id = slotSelections[slotId];
    if (id === "self") {
      return { name: buddy?.label ?? "自分の絵", image: buddyUrl };
    }
    const character = characters.find((item) => item.id === id);
    return { name: character?.name ?? "未設定", image: character?.image ?? null };
  }

  function startGame(): void {
    const progress = getProgress();
    if (progress.selected_buddy === "") {
      setSelectedBuddy(progress.selected_puyo_character_ids.blob);
    }
    track("cta_click", { surface: "character_select", id: "start_game", url: "/" });
    onSelect();
  }

  function randomizeSlots(): void {
    const progress = randomizePuyoCharacters();
    setSlotSelections(progress.selected_puyo_character_ids);
    setMessage("おまかせで えらんだよ");
    track("tap", { surface: "character_select", id: "randomize" });
  }

  return (
    <main className={styles.selectScreen}>
      <VillageNarrator line={message} />
      <section className={styles.selectHeader}>
        <h1>だれと あそぶ？</h1>
      </section>
      <div className={styles.puyoSlotGrid} aria-label="ぷよ枠">
        {PUYO_SLOTS.map((slot) => {
          const selected = characterForSlot(slot.id);
          return (
            <button
              key={slot.id}
              type="button"
              className={`${styles.puyoSlotTile} ${activeSlot === slot.id ? styles.puyoSlotTileActive : ""}`}
              onClick={() => setActiveSlot(slot.id)}
            >
              <span>{slot.label}</span>
              {selected.image !== null ? <img src={selected.image} alt="" /> : <strong>?</strong>}
              <b>{selected.name}</b>
            </button>
          );
        })}
      </div>
      <div className={styles.characterGrid}>
        <button type="button" className={`${styles.characterTile} ${styles.selfTile}`} onClick={chooseSelf}>
          <span className={styles.tileBadge}>あたらしいなかま！</span>
          {buddyUrl !== null ? <img src={buddyUrl} alt={buddy?.label ?? "自分の絵"} /> : <span className={styles.drawPlaceholder}>描</span>}
          <strong>{buddy?.label ?? "ふわふわランドで描こう"}</strong>
        </button>
        {characters.map((character) => {
          const locked = !isUnlocked(character, getProgress());
          return (
            <button
              type="button"
              key={character.id}
              className={`${styles.characterTile} ${locked ? styles.characterTileLocked : ""}`}
              onClick={() => chooseCharacter(character)}
            >
              <span className={styles.lockMark}>{locked ? "?" : ""}</span>
              <img src={character.image} alt={locked ? "" : character.name} />
              <strong>{locked ? "？？？" : character.name}</strong>
            </button>
          );
        })}
      </div>
      <a className={styles.drawLink} href="/staff">
        管理画面で描く・登録する
      </a>
      <button type="button" className={styles.randomButton} onClick={randomizeSlots}>
        おまかせで選ぶ
      </button>
      <button type="button" className={styles.startGameButton} onClick={startGame}>
        この4枠で遊ぶ
      </button>
      <button type="button" className={styles.backButton} onClick={onCancel}>
        ゲームに戻る
      </button>

      {lockedPopup !== null && (
        <div
          className={styles.lockPopupOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="ひみつのなかま"
          onClick={() => setLockedPopup(null)}
        >
          <div className={styles.lockPopupPanel} onClick={(event) => event.stopPropagation()}>
            <div className={styles.lockPopupArt} aria-hidden="true">
              <img src={lockedPopup.image} alt="" />
              <span className={styles.lockPopupMark}>?</span>
            </div>
            <p className={styles.lockPopupTitle}>まだ ひみつの なかま</p>
            <p className={styles.lockPopupBody}>
              お口の たいそうを <b>{MOUTH_UNLOCK_COUNT}かい</b> やったら
              <br />
              いっしょに あそべるよ！
            </p>
            <p className={styles.lockPopupProgress}>
              いま {getProgress().taisou_counts.mouth}／{MOUTH_UNLOCK_COUNT} かい
            </p>
            <button type="button" className={styles.lockPopupClose} onClick={() => setLockedPopup(null)}>
              とじる
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
