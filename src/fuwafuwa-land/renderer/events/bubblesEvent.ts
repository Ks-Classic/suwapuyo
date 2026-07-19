import { Graphics } from "pixi.js";
import { BaseDisplayEvent, EVENT_DURATIONS_MS, type EventItemView, type EventStage } from "../displayEventBase";

interface Bubble { node: Graphics; bornAt: number; speed: number }

export class BubblesEvent extends BaseDisplayEvent {
  readonly type = "bubbles" as const;
  private readonly bubbles: Bubble[] = [];

  constructor(id: string, world: EventStage, views: EventItemView[]) {
    super(id, world, views, EVENT_DURATIONS_MS.bubbles);
  }

  protected step(elapsedMs: number, _deltaMs: number, now: number): void {
    const { width, height } = this.world.bounds();
    this.once("jingle", () => [659, 880, 1175, 1568].forEach((frequency, index) => this.world.playTone(frequency, 260, 0.035, "sine", index * 130)));
    for (let index = 0; index < 18; index += 1) {
      if (elapsedMs >= index * 520) this.once(`bubble-${index}`, () => this.spawnBubble(index, now, width, height));
    }
    this.bubbles.forEach((bubble) => {
      const age = now - bubble.bornAt;
      bubble.node.y -= bubble.speed * 16;
      bubble.node.x += Math.sin(age * 0.003) * 0.7;
      if (age > 5200 && bubble.node.visible) {
        bubble.node.visible = false;
        this.addSparkleBurst(bubble.node.x, bubble.node.y, now, 0xbdefff, 10);
        this.world.playTone(1250, 90, 0.025, "sine");
      }
    });
    this.views.forEach((view, index) => {
      if (!this.alive(view)) return;
      const rideStart = 2500 + index * 160;
      const rideProgress = Math.max(0, Math.min(1, (elapsedMs - rideStart) / 8500));
      const targetX = width * (0.12 + ((index * 0.17) % 0.76));
      const targetY = height * (0.76 - rideProgress * 0.58);
      view.container.position.set(targetX + Math.sin(now * 0.002 + index) * 22, targetY);
      if (rideProgress >= 1) view.container.y += Math.min(height * 0.58, (elapsedMs - rideStart - 8500) * 0.25);
    });
  }

  private spawnBubble(index: number, now: number, width: number, height: number): void {
    const radius = 24 + (index % 5) * 13;
    const node = new Graphics().circle(0, 0, radius).fill({ color: 0xbdefff, alpha: 0.12 }).stroke({ color: index % 2 === 0 ? 0x7dd3fc : 0xf0abfc, width: 4, alpha: 0.72 });
    node.position.set(width * (0.05 + ((index * 0.213) % 0.9)), height + radius);
    this.world.stage.addChild(node);
    this.bubbles.push({ node, bornAt: now, speed: 0.75 + (index % 4) * 0.18 });
  }

  protected cleanup(): void {
    this.bubbles.forEach(({ node }) => node.destroy());
    this.bubbles.length = 0;
  }
}
