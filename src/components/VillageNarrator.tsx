import styles from "../styles/demo.module.css";

interface VillageNarratorProps {
  line: string;
  compact?: boolean;
  onNext?: () => void;
}

export function VillageNarrator({ line, compact = false, onNext }: VillageNarratorProps) {
  return (
    <div className={`${styles.villageNarrator} ${compact ? styles.villageNarratorCompact : ""}`}>
      <img src="/content/fuwafuwa-land/characters/display/waawaa.png" alt="わーわー村長" />
      <p>{line}</p>
      {onNext !== undefined ? (
        <button type="button" onClick={onNext}>
          つぎへ
        </button>
      ) : null}
    </div>
  );
}
