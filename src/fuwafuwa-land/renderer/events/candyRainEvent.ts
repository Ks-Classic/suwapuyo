import { Container, Graphics } from "pixi.js";
import { BaseDisplayEvent, EVENT_DURATIONS_MS, type EventItemView, type EventStage } from "../displayEventBase";

interface Candy { node: Container; speed: number; caught: boolean }

export class CandyRainEvent extends BaseDisplayEvent {
  readonly type = "candy_rain" as const;
  private readonly candies: Candy[] = [];
  private caught = 0;

  constructor(id: string, world: EventStage, views: EventItemView[]) {
    super(id, world, views, EVENT_DURATIONS_MS.candy_rain);
  }

  protected step(elapsedMs: number, deltaMs: number, now: number): void {
    const { width, height } = this.world.bounds();
    this.once("jingle", () => [784, 988, 1175, 1568].forEach((frequency, index) => this.world.playTone(frequency, 160, 0.045, "square", index * 90)));
    for (let index = 0; index < 24; index += 1) {
      if (elapsedMs >= 700 + index * 430) this.once(`candy-${index}`, () => this.spawnCandy(index, width));
    }
    this.candies.forEach((candy) => {
      if (candy.caught || candy.node.destroyed) return;
      candy.node.y += candy.speed * deltaMs;
      candy.node.rotation += deltaMs * 0.004;
      const catcher = this.views.find((view) => this.alive(view) && Math.hypot(view.container.x - candy.node.x, view.container.y - candy.node.y) < 86);
      if (catcher !== undefined || candy.node.y > height * 0.9) {
        candy.caught = true;
        candy.node.visible = false;
        this.caught += 1;
        const x = catcher?.container.x ?? candy.node.x;
        const y = catcher?.container.y ?? height * 0.86;
        this.addFloatingText(`${this.caught}こ!`, x, y - 70, now, { fill: 0xe11d48, fontSize: 28 });
        this.world.playTone(620 + (this.caught % 5) * 90, 100, 0.035, "triangle");
      }
    });
    this.views.forEach((view, index) => {
      if (!this.alive(view)) return;
      const target = this.candies.find((candy) => !candy.caught && Math.abs(candy.node.x - view.container.x) < width * 0.28);
      const targetX = target?.node.x ?? width * (0.12 + ((index * 0.19) % 0.76));
      this.moveToward(view, targetX, height * 0.82, 0.2, deltaMs);
      view.container.y -= Math.abs(Math.sin(now * 0.009 + index)) * 5;
    });
  }

  private spawnCandy(index: number, width: number): void {
    const colors = [0xff5d8f, 0xffd166, 0x60a5fa, 0x34d399, 0xa78bfa];
    const node = new Container();
    const color = colors[index % colors.length];
    node.addChild(new Graphics().circle(0, 0, 15).fill(color).stroke({ color: 0xffffff, width: 3 }));
    node.addChild(new Graphics().poly([-15, 0, -30, -12, -28, 12]).fill(color).poly([15, 0, 30, -12, 28, 12]).fill(color));
    node.position.set(width * (0.06 + ((index * 0.173) % 0.88)), -30);
    this.world.stage.addChild(node);
    this.candies.push({ node, speed: 0.13 + (index % 4) * 0.025, caught: false });
  }

  protected cleanup(): void {
    this.candies.forEach(({ node }) => node.destroy({ children: true }));
    this.candies.length = 0;
  }
}
