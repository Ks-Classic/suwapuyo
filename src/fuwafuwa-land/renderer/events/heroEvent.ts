import { Graphics, Text } from "pixi.js";
import { BaseDisplayEvent, EVENT_DURATIONS_MS, type EventItemView, type EventStage } from "../displayEventBase";

export function selectHero(views: EventItemView[]): EventItemView | undefined {
  return views.find((view) => view.featured) ?? [...views].filter((view) => !view.isSample).sort((left, right) => right.createdAtMs - left.createdAtMs)[0] ?? views[0];
}

export class HeroEvent extends BaseDisplayEvent {
  readonly type = "hero" as const;
  private readonly spotlight = new Graphics();
  private readonly hero: EventItemView | undefined;
  private title: Text | null = null;

  constructor(id: string, world: EventStage, views: EventItemView[]) {
    super(id, world, views, EVENT_DURATIONS_MS.hero);
    this.hero = selectHero(views);
    world.stage.addChildAt(this.spotlight, Math.min(1, world.stage.children.length));
  }

  protected step(elapsedMs: number, deltaMs: number, now: number): void {
    const { width, height } = this.world.bounds();
    const hero = this.hero;
    if (hero === undefined || !this.alive(hero)) return;
    this.once("fanfare", () => {
      [262, 330, 392, 523, 659, 784].forEach((frequency, index) => this.world.playTone(frequency, 280, 0.055, "square", index * 120));
      this.title = new Text({ text: `${hero.label}\nヒーローとうじょう!`, style: { align: "center", fill: 0xfff7d6, fontSize: this.world.bigTextSize() * 0.72, fontWeight: "900", stroke: { color: 0xe11d48, width: 9 } } });
      this.title.anchor.set(0.5);
      this.world.stage.addChild(this.title);
    });
    this.spotlight.clear().ellipse(width / 2, height * 0.56, width * 0.2, height * 0.38).fill({ color: 0xfff7d6, alpha: 0.26 }).stroke({ color: 0xffd166, width: 7, alpha: 0.75 });
    const intro = Math.min(1, elapsedMs / 3500);
    this.moveToward(hero, width / 2, height * 0.56, 0.25, deltaMs);
    hero.container.scale.set(hero.baseScale * (1 + intro * 1.45) * (1 + Math.sin(now * 0.009) * 0.04));
    this.title?.position.set(width / 2, height * 0.16);
    this.views.forEach((view, index) => {
      if (view.id === hero.id || !this.alive(view)) return;
      const angle = (index / Math.max(1, this.views.length - 1)) * Math.PI * 2;
      this.moveToward(view, width / 2 + Math.cos(angle) * width * 0.27, height * 0.62 + Math.sin(angle) * height * 0.2, 0.18, deltaMs);
      view.container.y -= Math.abs(Math.sin(now * 0.009 + index)) * 10;
    });
    if (elapsedMs > 5200 && elapsedMs < 14500) {
      this.once(`confetti-${Math.floor((elapsedMs - 5200) / 1800)}`, () => this.addConfettiBurst(width / 2, height * 0.35, now, width * 0.72, height * 0.3));
    }
  }

  protected cleanup(): void {
    this.spotlight.destroy();
    this.title?.destroy();
    this.title = null;
  }
}
