import { useEffect } from "react";

export const TAISOU_MISSION_INTERVAL_MS = 60_000;

/** enabledであるプレイ時間だけを数え、発火後は呼び出し側がdisabledにする。 */
export function useTaisouMissionTimer(enabled: boolean, onTrigger: () => void): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = window.setTimeout(onTrigger, TAISOU_MISSION_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, onTrigger]);
}
