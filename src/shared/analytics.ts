export type TrackEventType =
  | "tap"
  | "popup_open"
  | "item_view"
  | "cta_click"
  | "audio_play"
  | "onboard_done"
  | "onboard_skip"
  | "map_open"
  | "booth_card_open"
  | "stamp_get"
  | "reward_reach"
  | "unlock_hidden"
  | "announce_recv";

export interface TrackMeta {
  surface?: string;
  id?: string;
  url?: string;
  kind?: string;
  [key: string]: unknown;
}

export function track(type: TrackEventType, meta: TrackMeta = {}): void {
  void type;
  void meta;
}
