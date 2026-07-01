import { useEffect, useMemo, useState } from "react";
import { DEFAULT_TAISOU_HOST, TAISOU_HOSTS, type TaisouHost } from "../../config/taisouHosts";
import type { Sponsor } from "../../shared/sponsors";
import { incrementTaisouCount } from "../../shared/progressStore";
import { track } from "../../shared/analytics";
import { VillageNarrator } from "../VillageNarrator";
import styles from "../../styles/demo.module.css";

interface TaisouInterludeProps {
  host?: TaisouHost;
  sponsor?: Sponsor;
  onClose: () => void;
}

const BEAT_MS = 1500;

function pictLabel(pict: string): string {
  const labels: Record<string, string> = {
    open: "大きく開く",
    wide: "横にひく",
    "round-small": "すぼめる",
    smile: "えがお",
    round: "まるく",
    "neck-left": "左へ",
    "neck-down": "下へ",
    "neck-right": "右へ",
    "neck-up": "上へ",
    "nose-in": "鼻からすう",
    hold: "まつ",
    blow: "ふー",
  };
  return labels[pict] ?? pict;
}

export function TaisouInterlude({ host = DEFAULT_TAISOU_HOST, sponsor, onClose }: TaisouInterludeProps) {
  void sponsor;
  const [beat, setBeat] = useState(0);
  const [done, setDone] = useState(false);
  const totalBeats = host.kana.length;
  const secondsLeft = Math.max(Math.ceil(((totalBeats - beat) * BEAT_MS) / 1000), 0);
  const ringStyle = useMemo(
    () => ({
      background: `conic-gradient(#8bd46e ${Math.min((beat / totalBeats) * 360, 360)}deg, rgba(255,255,255,0.72) 0deg)`,
    }),
    [beat, totalBeats]
  );

  useEffect(() => {
    if (done) {
      return;
    }
    const timer = window.setTimeout(() => {
      setBeat((current) => {
        const next = current + 1;
        if (next >= totalBeats) {
          incrementTaisouCount(host.bodyPart);
          track("item_view", { kind: "taisou_complete", id: host.bodyPart });
          setDone(true);
          return totalBeats;
        }
        return next;
      });
    }, BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [beat, done, host.bodyPart, totalBeats]);

  const currentBeat = Math.min(beat, totalBeats - 1);
  return (
    <div className={styles.taisouOverlay} role="dialog" aria-modal="true">
      <div className={styles.taisouPanel}>
        <VillageNarrator line={done ? "じょうずっ！はなまるだ〜！" : "ここで…むびょう体操タイム！"} compact />
        <div className={styles.taisouStage}>
          <img src={host.hostImage} alt={host.hostName} className={styles.taisouHost} />
          <div className={styles.taisouMain}>
            <p className={styles.taisouLine}>{done ? "じょうず！お口げんき〜" : host.hostLine}</p>
            {done ? (
              <div className={styles.taisouDone}>できたね！</div>
            ) : (
              <>
                <div className={styles.kanaBeat}>{host.kana[currentBeat]}</div>
                <div className={styles.mouthPict}>
                  <span>{pictLabel(host.mouthPicts[currentBeat])}</span>
                </div>
                <p className={styles.beatLine}>{host.beatLines[currentBeat]}</p>
              </>
            )}
          </div>
          <div className={styles.timerRing} style={ringStyle}>
            <span>{done ? "OK" : secondsLeft}</span>
          </div>
        </div>
        <div className={styles.taisouActions}>
          <button type="button" onClick={onClose}>
            {done ? "あそびに戻る" : "スキップ"}
          </button>
          {!done && TAISOU_HOSTS.length > 1 ? <span>今日はお口から</span> : null}
        </div>
      </div>
    </div>
  );
}
