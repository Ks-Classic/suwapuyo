import { Container, Graphics, Text } from "pixi.js";
import { BaseDisplayEvent, EVENT_DURATIONS_MS, type EventItemView, type EventStage } from "../displayEventBase";

export class TrainEvent extends BaseDisplayEvent {
  readonly type = "train" as const;
  private readonly engine = new Container();

  constructor(id: string, world: EventStage, views: EventItemView[]) {
    super(id, world, views, EVENT_DURATIONS_MS.train);
    this.engine.addChild(new Graphics().roundRect(-70, -35, 120, 70, 16).fill(0x14b8a6).stroke({ color: 0x0f766e, width: 5 }));
    this.engine.addChild(new Graphics().rect(-20, -75, 45, 45).fill(0xe11d48).rect(22, -58, 18, 30).fill(0x17324d));
    this.engine.addChild(new Graphics().circle(-42, 38, 18).circle(27, 38, 18).fill(0x17324d));
    world.stage.addChild(this.engine);
  }

  protected step(elapsedMs: number, _deltaMs: number, now: number): void {
    const { width, height } = this.world.bounds();
    const progress = Math.min(1, elapsedMs / EVENT_DURATIONS_MS.train);
    const leadX = -120 + progress * (width + 260);
    const leadY = height * (0.5 + Math.sin(progress * Math.PI * 4) * 0.2);
    this.engine.position.set(leadX, leadY);
    this.engine.rotation = Math.cos(progress * Math.PI * 4) * 0.08;
    this.once("title", () => {
      const title = new Text({ text: "しゅっしゅっ ぽっぽ!", style: { fill: 0xe11d48, fontSize: this.world.bigTextSize() * 0.7, fontWeight: "900", stroke: { color: 0xffffff, width: 7 } } });
      title.anchor.set(0.5);
      title.position.set(width / 2, height * 0.16);
      this.addTimedEffect(title, now, 3000, -0.006, 1.08);
      [196, 262, 330].forEach((frequency, index) => this.world.playTone(frequency, 320, 0.05, "square", index * 220));
    });
    this.views.forEach((view, index) => {
      if (!this.alive(view)) return;
      const gap = 105 + Math.min(35, this.views.length * 2);
      const x = leadX - (index + 1) * gap;
      const delayedProgress = Math.max(0, progress - ((index + 1) * gap) / Math.max(width, 1) / 5);
      const y = height * (0.5 + Math.sin(delayedProgress * Math.PI * 4) * 0.2);
      view.container.position.set(x, y);
      view.container.rotation = Math.cos(delayedProgress * Math.PI * 4) * 0.07;
    });
  }

  protected cleanup(): void {
    this.engine.destroy({ children: true });
  }
}
