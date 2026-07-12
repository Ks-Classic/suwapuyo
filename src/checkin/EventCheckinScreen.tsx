import { useState } from "react";
import { track } from "../shared/analytics";
import mvpStyles from "../app/mvp.module.css";
import styles from "./checkin.module.css";
import { CHECKIN_COPY } from "./checkinCopy";
import { findCampaign, hasCheckedIn, recordEventCheckin } from "./checkinRepository";

export interface EventCheckinScreenProps {
  campaignId: string;
  onPlay: () => void;
  onBooths: () => void;
}

export function EventCheckinScreen({ campaignId, onPlay, onBooths }: EventCheckinScreenProps) {
  const campaign = findCampaign(campaignId);
  const [checkedIn, setCheckedIn] = useState(() => campaign !== null && hasCheckedIn(campaign.id));
  const [justGranted, setJustGranted] = useState(false);

  if (campaign === null) {
    return <main className={mvpStyles.forbiddenScreen}><h1>{CHECKIN_COPY.entrance.unknown}</h1><p>{CHECKIN_COPY.entrance.unknownNote}</p></main>;
  }

  const activeCampaign = campaign;

  function checkIn() {
    const outcome = recordEventCheckin(activeCampaign.id);
    setCheckedIn(true);
    setJustGranted(outcome.granted);
    track("cta_click", { surface: "event_checkin", id: activeCampaign.id });
    if (outcome.granted) track("reward_reach", { surface: "event_checkin", id: activeCampaign.limitedCharacterId });
  }

  if (!checkedIn) {
    return <main className={mvpStyles.storyScreen}>
      <p className={mvpStyles.eyebrow}>{CHECKIN_COPY.entrance.eyebrow}</p>
      <h1>{campaign.title}</h1>
      <p className={mvpStyles.lead}>{campaign.dateLabel}</p>
      <p className={mvpStyles.privacyNote}>{CHECKIN_COPY.entrance.heading}</p>
      <button className={mvpStyles.primaryButton} onClick={checkIn}>{CHECKIN_COPY.entrance.action}</button>
    </main>;
  }

  return <main className={mvpStyles.storyScreen}>
    <p className={mvpStyles.eyebrow}>{CHECKIN_COPY.entrance.eyebrow}</p>
    <h1>{justGranted ? `${campaign.title}${CHECKIN_COPY.entrance.successTitle}` : CHECKIN_COPY.entrance.alreadyTitle}</h1>
    {justGranted ? <>
      <p>{CHECKIN_COPY.entrance.revealHeading}</p>
      <div className={styles.characterReveal}>
        <img src={campaign.limitedCharacterImage} alt={campaign.limitedCharacterName}/>
        <strong>{campaign.limitedCharacterName}</strong>
      </div>
    </> : <div className={styles.characterReveal}><img src={campaign.limitedCharacterImage} alt={campaign.limitedCharacterName}/><strong>{campaign.limitedCharacterName}</strong></div>}
    <button className={mvpStyles.primaryButton} onClick={onPlay}>{CHECKIN_COPY.entrance.toPlay}</button>
    <button className={mvpStyles.secondaryButton} onClick={onBooths}>{CHECKIN_COPY.entrance.toBooths}</button>
  </main>;
}
