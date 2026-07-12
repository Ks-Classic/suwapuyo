import mvpStyles from "../app/mvp.module.css";
import styles from "./checkin.module.css";
import { DEMO_BOOTH_IDS, findDemoBooth, listStampedBoothIds } from "./checkinRepository";

export interface StampBookProps {
  campaignId: string;
  onBooth?: (boothId: string) => void;
}

export function StampBook({ campaignId, onBooth }: StampBookProps) {
  const stamped = new Set(listStampedBoothIds(campaignId));
  const booths = DEMO_BOOTH_IDS.map((boothId) => findDemoBooth(boothId)).filter((booth) => booth !== null);

  return <main className={mvpStyles.contentScreen}>
    <p className={mvpStyles.eyebrow}>スタンプ帳</p>
    <h1>{stamped.size}/{booths.length}こ あつめたよ</h1>
    <ul className={styles.stampList}>
      {booths.map((booth) => {
        const got = stamped.has(booth.id);
        return <li key={booth.id} className={got ? styles.stampGot : styles.stampMissing}>
          <span aria-hidden="true">{got ? "●" : "○"}</span>
          <div><strong>{booth.name}</strong><small>{got ? "スタンプゲット済み" : "まだ訪れていないよ"}</small></div>
          {onBooth !== undefined ? <button onClick={() => onBooth(booth.id)}>見る</button> : null}
        </li>;
      })}
    </ul>
  </main>;
}
