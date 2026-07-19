import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SPEECH_INTERVAL_MS, type DisplayCharacter, type FuwafuwaServices, type SpeechLine } from "../types";
import styles from "./SpeechLinePanel.module.css";

interface SpeechLinePanelProps {
  services: FuwafuwaServices;
  speechIntervalMs?: number;
}

const SAVE_DEBOUNCE_MS = 600;

export function SpeechLinePanel({ services, speechIntervalMs = DEFAULT_SPEECH_INTERVAL_MS }: SpeechLinePanelProps) {
  const [lines, setLines] = useState<SpeechLine[]>([]);
  const [characters, setCharacters] = useState<DisplayCharacter[]>([]);
  const [text, setText] = useState("");
  const [characterId, setCharacterId] = useState("");
  const [weight, setWeight] = useState(1);
  const [intervalSeconds, setIntervalSeconds] = useState(speechIntervalMs / 1000);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const intervalTimerRef = useRef<number | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    const [nextLines, nextCharacters] = await Promise.all([
      services.speechLines.list(),
      services.characterContent.listCharacters(),
    ]);
    setLines(nextLines);
    setCharacters(nextCharacters);
  }, [services.characterContent, services.speechLines]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (intervalTimerRef.current === null) {
        setIntervalSeconds(speechIntervalMs / 1000);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [speechIntervalMs]);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refresh().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "せりふを読み込めませんでした"));
    }, 0);
    const speechSubscription = services.speechLines.subscribeChanges(
      () => void refresh().catch(() => setMessage("せりふを更新できませんでした")),
      () => undefined,
    );
    const characterSubscription = services.characterContent.subscribeCharacterChanges(
      () => void refresh().catch(() => setMessage("キャラクターを更新できませんでした")),
      () => undefined,
    );
    return () => {
      if (intervalTimerRef.current !== null) {
        window.clearTimeout(intervalTimerRef.current);
      }
      window.clearTimeout(refreshTimer);
      void speechSubscription.unsubscribe();
      void characterSubscription.unsubscribe();
    };
  }, [refresh, services.characterContent, services.speechLines]);

  const changeInterval = (seconds: number): void => {
    setIntervalSeconds(seconds);
    if (intervalTimerRef.current !== null) {
      window.clearTimeout(intervalTimerRef.current);
    }
    intervalTimerRef.current = window.setTimeout(() => {
      intervalTimerRef.current = null;
      void services.displayState
        .updateSettings({ speechIntervalMs: seconds * 1000 })
        .then(() => setMessage(`発話間隔を${seconds}秒にしました。`))
        .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "発話間隔を保存できませんでした"));
    }, SAVE_DEBOUNCE_MS);
  };

  const addLine = (): void => {
    const normalizedText = text.trim();
    if (pending || normalizedText.length < 1 || normalizedText.length > 40) {
      return;
    }
    setPending(true);
    void services.speechLines
      .add({ text: normalizedText, characterId: characterId === "" ? null : characterId, weight })
      .then(() => {
        setText("");
        setCharacterId("");
        setWeight(1);
        setMessage("せりふを追加しました。");
        return refresh();
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "せりふを追加できませんでした"))
      .finally(() => setPending(false));
  };

  const setActive = (line: SpeechLine, active: boolean): void => {
    void services.speechLines
      .setActive(line.id, active)
      .then(() => refresh())
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "有効設定を変更できませんでした"));
  };

  const remove = (line: SpeechLine): void => {
    void services.speechLines
      .remove(line.id)
      .then(() => {
        setMessage("せりふを削除しました。");
        return refresh();
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "せりふを削除できませんでした"));
  };

  const characterLabel = (id: string | null): string => {
    if (id === null) {
      return "だれでも";
    }
    return characters.find((character) => character.id === id)?.label ?? id;
  };

  return (
    <section className={styles.panel} aria-label="せりふ">
      <div className={styles.heading}>
        <div><strong>せりふ</strong><span>キャラの暮らしのひとことを設定します</span></div>
        <label>
          <span>発話間隔 {intervalSeconds}秒</span>
          <input type="range" min="15" max="120" step="1" value={intervalSeconds} onChange={(event) => changeInterval(Number(event.currentTarget.value))} />
        </label>
      </div>

      <div className={styles.form}>
        <label className={styles.textInput}>
          <span>テキスト（40字以内）</span>
          <input type="text" maxLength={40} value={text} onChange={(event) => setText(event.currentTarget.value)} />
        </label>
        <label>
          <span>対象キャラ</span>
          <select value={characterId} onChange={(event) => setCharacterId(event.currentTarget.value)}>
            <option value="">だれでも</option>
            {characters.map((character) => <option key={character.id} value={character.id}>{character.label}</option>)}
          </select>
        </label>
        <label>
          <span>重み {weight}</span>
          <input type="range" min="1" max="5" step="1" value={weight} onChange={(event) => setWeight(Number(event.currentTarget.value))} />
        </label>
        <button type="button" disabled={pending || text.trim().length === 0} onClick={addLine}>追加</button>
      </div>

      {message.length > 0 ? <p className={styles.message} role="status">{message}</p> : null}
      <ul className={styles.list}>
        {lines.map((line) => (
          <li key={line.id} className={line.active ? "" : styles.inactive}>
            <div className={styles.lineText}><strong>{line.text}</strong><span className={styles.badge}>{characterLabel(line.characterId)}</span><small>重み {line.weight}</small></div>
            <label className={styles.toggle}><input type="checkbox" checked={line.active} onChange={(event) => setActive(line, event.currentTarget.checked)} /> 有効</label>
            <button type="button" className={styles.deleteButton} onClick={() => remove(line)}>削除</button>
          </li>
        ))}
        {lines.length === 0 ? <li className={styles.empty}>せりふはまだありません。</li> : null}
      </ul>
    </section>
  );
}
