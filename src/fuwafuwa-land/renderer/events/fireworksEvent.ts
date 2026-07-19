import { Container, Graphics, Text } from "pixi.js";
import { BaseDisplayEvent, EVENT_DURATIONS_MS, type EventItemView, type EventStage } from "../displayEventBase";

export class FireworksEvent extends BaseDisplayEvent {
  readonly type = "fireworks" as const;
  private readonly night = new Graphics();
  private readonly bursts: Container[] = [];

  constructor(id: string, world: EventStage, views: EventItemView[]) {
    super(id, world, views, EVENT_DURATIONS_MS.fireworks);
    world.stage.addChildAt(this.night, 0);
  }

  protected step(elapsedMs: number, _deltaMs: number, now: number): void {
    const { width, height } = this.world.bounds();
    this.night.clear().rect(0, 0, width, height).fill({ color: 0x08152f, alpha: Math.min(0.78, elapsedMs / 3500) });
    this.once("title", () => {
      const title = new Text({ text: "はなびたいかい", style: { fill: 0xfff7d6, fontSize: this.world.bigTextSize(), fontWeight: "900", stroke: { color: 0x17324d, width: 7 } } });
      title.anchor.set(0.5);
      title.position.set(width / 2, height * 0.16);
      this.addTimedEffect(title, now, 2600, -0.005, 1.12);
    });
    for (let index = 0; index < 8; index += 1) {
      const at = 1800 + index * 1500;
      if (elapsedMs >= at) {
        this.once(`firework-${index}`, () => this.launchFirework(index, now, width, height));
      }
    }
    this.views.forEach((view, index) => {
      if (!this.alive(view)) return;
      view.container.rotation = Math.sin(now * 0.007 + index) * 0.04;
      view.container.y = view.body.y + Math.abs(Math.sin(now * 0.005 + index)) * 9;
    });
  }

  private launchFirework(index: number, now: number, width: number, height: number): void {
    const colors = [0xffd166, 0xff5d8f, 0x7dd3fc, 0xa7f3d0, 0xc4b5fd, 0xffffff];
    const burst = new Container();
    const color = colors[index % colors.length];
    for (let ray = 0; ray < 18; ray += 1) {
      const angle = (ray / 18) * Math.PI * 2;
      burst.addChild(new Graphics().moveTo(Math.cos(angle) * 14, Math.sin(angle) * 14).lineTo(Math.cos(angle) * 76, Math.sin(angle) * 76).stroke({ color, width: 5, alpha: 0.9 }));
    }
    burst.position.set(width * (0.16 + ((index * 0.23) % 0.68)), height * (0.2 + (index % 3) * 0.13));
    burst.scale.set(0.15);
    this.bursts.push(burst);
    this.addTimedEffect(burst, now, 1700, 0.008, 1.45);
    this.world.playTone(180 + index * 18, 140, 0.05, "sine");
    this.world.playTone(760 + index * 35, 520, 0.045, "triangle", 130);
  }

  protected cleanup(): void {
    this.night.destroy();
    this.bursts.length = 0;
  }
}
