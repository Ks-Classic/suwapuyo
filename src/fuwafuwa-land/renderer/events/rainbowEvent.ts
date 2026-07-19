/**
 * にじのアーチ: 空に虹が伸びる→全キャラ集合→一斉ジャンプ×3→キラキラ(08_設計書 §3)
 */
import { Graphics } from "pixi.js";
import { BaseDisplayEvent, EVENT_DURATIONS_MS, type EventItemView, type EventStage } from "../displayEventBase";

const RAINBOW_COLORS = [0xe11d48, 0xf97316, 0xfacc15, 0x22c55e, 0x3b82f6, 0xa78bfa];
const REVEAL_MS = 4000;
const GATHER_START_MS = 3200;
const JUMP_START_MS = 9000;
const JUMP_CYCLE_MS = 2000;
const JUMP_ACTIVE_MS = 750;
const FADE_START_MS = 15500;

export class RainbowEvent extends BaseDisplayEvent {
  readonly type = "rainbow" as const;
  private readonly arch = new Graphics();
  private lastReveal = -1;
  private nextSparkleAt = 0;

  constructor(id: string, world: EventStage, views: EventItemView[]) {
    super(id, world, views, EVENT_DURATIONS_MS.rainbow);
    world.stage.addChild(this.arch);
  }

  protected step(elapsedMs: number, deltaMs: number, now: number): void {
    const { width, height } = this.world.bounds();
    this.once("jingle", () => {
      // 上昇スケールのジングル(虹が伸びる)
      [523, 587, 659, 698, 784, 880, 988, 1046].forEach((frequency, index) => this.world.playTone(frequency, 220, 0.05, "triangle", index * 160));
    });
    this.drawArch(elapsedMs, width, height);
    if (elapsedMs >= GATHER_START_MS) {
      this.moveViewsUnderArch(elapsedMs, deltaMs, now, width, height);
    }
    if (elapsedMs >= JUMP_START_MS && elapsedMs < FADE_START_MS && now >= this.nextSparkleAt) {
      this.nextSparkleAt = now + 600;
      this.addSparkleBurst(width * (0.2 + Math.random() * 0.6), height * (0.2 + Math.random() * 0.35), now, 0xfff7d6, 8);
    }
    if (elapsedMs >= FADE_START_MS) {
      this.arch.alpha = Math.max(0, 1 - (elapsedMs - FADE_START_MS) / 2200);
    }
  }

  private drawArch(elapsedMs: number, width: number, height: number): void {
    const reveal = Math.min(1, elapsedMs / REVEAL_MS);
    if (reveal === this.lastReveal) {
      return;
    }
    this.lastReveal = reveal;
    const centerX = width / 2;
    const baseY = height * 0.92;
    const outerRadius = Math.min(width * 0.46, height * 0.78);
    const band = Math.max(10, outerRadius * 0.055);
    this.arch.clear();
    RAINBOW_COLORS.forEach((color, index) => {
      const radius = outerRadius - index * band;
      // 左端(π)から右へreveal分だけ伸ばす
      this.arch
        .arc(centerX, baseY, radius, Math.PI, Math.PI + Math.PI * reveal)
        .stroke({ color, width: band, alpha: 0.82 });
    });
  }

  private moveViewsUnderArch(elapsedMs: number, deltaMs: number, now: number, width: number, height: number): void {
    const jumping = elapsedMs >= JUMP_START_MS && elapsedMs < FADE_START_MS;
    const jumpLocal = (elapsedMs - JUMP_START_MS) % JUMP_CYCLE_MS;
    const jumpOffset = jumping && jumpLocal < JUMP_ACTIVE_MS ? -Math.sin((jumpLocal / JUMP_ACTIVE_MS) * Math.PI) * 96 : 0;
    if (jumping && jumpLocal < JUMP_ACTIVE_MS) {
      this.once(`jump-${Math.floor((elapsedMs - JUMP_START_MS) / JUMP_CYCLE_MS)}`, () => {
        this.world.playTone(440, 150, 0.05, "sine");
        this.world.playTone(880, 200, 0.04, "triangle", 90);
      });
    }
    this.views.forEach((view, index) => {
      if (!this.alive(view)) {
        return;
      }
      const targetX = this.rowTargetX(index, this.views.length, width, 0.76);
      const targetY = height * 0.78;
      this.moveToward(view, targetX, targetY + jumpOffset, 0.24, deltaMs);
      view.container.rotation = Math.sin(now * 0.004 + index) * 0.06;
    });
  }

  protected cleanup(): void {
    if (!this.arch.destroyed) {
      this.arch.destroy();
    }
  }
}
