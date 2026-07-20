import { useEffect, useState } from "react";
import { track } from "../shared/analytics";
import mvpStyles from "../app/mvp.module.css";
import styles from "./checkin.module.css";
import { CHECKIN_COPY, ENGAGEMENT_OPTIONS, RATING_OPTIONS } from "./checkinCopy";
import {
  type BoothVisitResult,
  findDemoBooth,
  latestEngagementActions,
  recordBoothEngagement,
  recordBoothFeedback,
  recordBoothVisit,
} from "./checkinRepository";
import type { BoothEngagementAction, FeedbackRating } from "./checkinTypes";

export interface BoothCheckinScreenProps {
  campaignId: string;
  boothId: string;
  onFindNext: () => void;
}

export function BoothCheckinScreen({ campaignId, boothId, onFindNext }: BoothCheckinScreenProps) {
  const booth = findDemoBooth(boothId);
  const [visit, setVisit] = useState<BoothVisitResult | null>(null);
  const [selectedActions, setSelectedActions] = useState<BoothEngagementAction[]>(() => latestEngagementActions(campaignId, boothId));
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const outcome = recordBoothVisit(campaignId, boothId);
      setVisit(outcome);
      if (outcome.granted) track("stamp_get", { surface: "booth_checkin", id: boothId });
      if (outcome.newMilestone !== null) track("reward_reach", { surface: "booth_milestone", id: String(outcome.newMilestone) });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [campaignId, boothId]);

  if (booth === null) {
    return <main className={mvpStyles.forbiddenScreen}><h1>{CHECKIN_COPY.booth.unknown}</h1><p>{CHECKIN_COPY.booth.unknownNote}</p></main>;
  }

  function toggleAction(action: BoothEngagementAction) {
    setSelectedActions((current) => current.includes(action) ? current.filter((value) => value !== action) : [...current, action]);
  }

  function submit() {
    if (selectedActions.length > 0) recordBoothEngagement(campaignId, boothId, selectedActions);
    if (rating !== null || comment.trim() !== "") recordBoothFeedback(campaignId, boothId, rating, comment);
    setSubmitted(true);
  }

  function skip() {
    setSubmitted(true);
  }

  return <main className={mvpStyles.contentScreen}>
    <div className={styles.boothHeader}>
      <img src="/content/01_すわぷよ/01_キャラクター/02_表示用/07_もぐぴよ.png" alt=""/>
      <h1>{booth.name}にきたよ！</h1>
      {visit !== null ? <p className={mvpStyles.successNotice} role="status">{visit.granted ? CHECKIN_COPY.booth.gained : `${booth.name}${CHECKIN_COPY.booth.alreadyGained}`}</p> : <p role="status">確認中…</p>}
      {visit?.newMilestone !== null && visit?.newMilestone !== undefined ? <p className={styles.milestoneBanner}>{CHECKIN_COPY.booth.milestoneNote(visit.newMilestone)}</p> : null}
    </div>

    {!submitted ? <>
      <h2>{CHECKIN_COPY.booth.engagementQuestion}</h2>
      <p className={mvpStyles.lead}>{CHECKIN_COPY.booth.engagementHelp}</p>
      <div className={mvpStyles.optionGrid}>
        {ENGAGEMENT_OPTIONS.map(([label, value]) => <button key={value} aria-pressed={selectedActions.includes(value)} onClick={() => toggleAction(value)}>{label}</button>)}
      </div>

      <h2>{CHECKIN_COPY.booth.ratingQuestion}</h2>
      <div className={mvpStyles.chipGrid}>
        {RATING_OPTIONS.map(([label, value]) => <button key={value} aria-pressed={rating === value} onClick={() => setRating(rating === value ? null : value)}>{label}</button>)}
      </div>
      <label>
        {CHECKIN_COPY.booth.commentLabel}
        <textarea className={styles.commentBox} value={comment} onChange={(event) => setComment(event.target.value)}/>
      </label>

      <div className={mvpStyles.splitActions}>
        <button className={mvpStyles.primaryButton} onClick={submit}>{CHECKIN_COPY.booth.submit}</button>
        <button className={mvpStyles.secondaryButton} onClick={skip}>{CHECKIN_COPY.booth.later}</button>
      </div>
    </> : <p className={mvpStyles.successNotice} role="status">{CHECKIN_COPY.booth.thanks}</p>}

    <button className={mvpStyles.textButton} onClick={onFindNext}>{CHECKIN_COPY.booth.findNext}</button>
  </main>;
}
