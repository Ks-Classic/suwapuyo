import { useEffect, useState } from "react";
import { loadCharacters, type SelectableCharacter } from "../../config/characters";
import { ensureDemoBuddy, getBuddy, type BuddyRecord } from "../../shared/buddyStore";
import {
  getProgress,
  randomizePuyoCharacters,
  setPuyoCharacter,
  setSelectedBuddy,
  togglePinnedPuyoSlot,
  type PuyoSlotId,
} from "../../shared/progressStore";
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

export function CharacterSelectScreen({ onSelect, onCancel }: CharacterSelectScreenProps) {
  const [characters, setCharacters] = useState<SelectableCharacter[]>([]);
  const [buddy, setBuddy] = useState<BuddyRecord | null>(null);
  const [buddyUrl, setBuddyUrl] = useState<string | null>(null);
  const [slotSelections, setSlotSelections] = useState(() => getProgress().selected_puyo_character_ids);
  const [pinnedSlots, setPinnedSlots] = useState(() => getProgress().pinned_puyo_slot_ids);
  const [activeSlot, setActiveSlot] = useState<PuyoSlotId>("ghost");
  const [message, setMessage] = useState("だれと あそぶ〜？");

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
    setPinnedSlots(progress.pinned_puyo_slot_ids);
    setMessage("おまかせで えらんだよ");
    track("tap", { surface: "character_select", id: "randomize" });
  }

  function togglePin(slotId: PuyoSlotId): void {
    const progress = togglePinnedPuyoSlot(slotId);
    setPinnedSlots(progress.pinned_puyo_slot_ids);
    const isPinned = progress.pinned_puyo_slot_ids.includes(slotId);
    const label = PUYO_SLOTS.find((slot) => slot.id === slotId)?.label ?? "この枠";
    setMessage(isPinned ? `${label}を 固定したよ` : `${label}の 固定を 外したよ`);
    track("tap", { surface: "character_select", id: "pin_toggle", kind: isPinned ? "pinned" : "unpinned" });
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
          const isPinned = pinnedSlots.includes(slot.id);
          return (
            <div key={slot.id} className={`${styles.puyoSlotTile} ${activeSlot === slot.id ? styles.puyoSlotTileActive : ""}`}>
              <button
                type="button"
                onClick={() => setActiveSlot(slot.id)}
                style={{
                  display: "grid",
                  justifyItems: "center",
                  gap: 3,
                  width: "100%",
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  font: "inherit",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <span>{slot.label}</span>
                {selected.image !== null ? <img src={selected.image} alt="" /> : <strong>?</strong>}
                <b>{selected.name}</b>
              </button>
              <button
                type="button"
                onClick={() => togglePin(slot.id)}
                aria-pressed={isPinned}
                style={{
                  marginTop: 2,
                  padding: "1px 4px",
                  border: "none",
                  background: "transparent",
                  color: isPinned ? "var(--color-accent)" : "var(--color-text-secondary)",
                  fontSize: "0.58rem",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {isPinned ? "📌 固定中" : "📍 固定する"}
              </button>
            </div>
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
          return (
            <button
              type="button"
              key={character.id}
              className={styles.characterTile}
              onClick={() => chooseCharacter(character)}
            >
              <img src={character.image} alt={character.name} />
              <strong>{character.name}</strong>
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
    </main>
  );
}
