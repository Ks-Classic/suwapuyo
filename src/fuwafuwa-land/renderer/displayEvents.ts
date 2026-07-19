import type { DisplayEvent } from "../types";
import { BubblesEvent } from "./events/bubblesEvent";
import { CandyRainEvent } from "./events/candyRainEvent";
import { FireworksEvent } from "./events/fireworksEvent";
import { HeroEvent } from "./events/heroEvent";
import { RainbowEvent } from "./events/rainbowEvent";
import { TrainEvent } from "./events/trainEvent";
import type { DisplayEventHandle, EventItemView, EventStage } from "./displayEventBase";

export * from "./displayEventBase";

/** 新6イベントの同期ディスパッチ。battleは既存実装へ残す。 */
export function createDisplayEvent(event: DisplayEvent, world: EventStage, views: EventItemView[]): DisplayEventHandle | null {
  switch (event.type) {
    case "rainbow": return new RainbowEvent(event.id, world, views);
    case "fireworks": return new FireworksEvent(event.id, world, views);
    case "candy_rain": return new CandyRainEvent(event.id, world, views);
    case "train": return new TrainEvent(event.id, world, views);
    case "bubbles": return new BubblesEvent(event.id, world, views);
    case "hero": return new HeroEvent(event.id, world, views);
    default: return null;
  }
}
