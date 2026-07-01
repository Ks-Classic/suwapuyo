import { track as trackShared, type TrackEventType, type TrackMeta } from "../../shared/analytics";

const TRACK_EVENT_TYPES = new Set<string>(["tap", "popup_open", "item_view", "cta_click", "audio_play"]);

export function track(type: TrackEventType | string, idOrMeta?: string | TrackMeta, meta?: TrackMeta): void {
  const nextMeta = typeof idOrMeta === "string" ? { ...meta, id: idOrMeta } : idOrMeta;
  if (TRACK_EVENT_TYPES.has(type)) {
    trackShared(type as TrackEventType, nextMeta ?? {});
    return;
  }
  console.debug("track:legacy-event-skipped", type, nextMeta ?? {});
}
