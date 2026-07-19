import { Container, Graphics, Text } from "pixi.js";
import type { DisplayEventType } from "../types";
import type { MotionBody } from "./artworkMotion";

export const EVENT_DURATIONS_MS: Record<Exclude<DisplayEventType, "battle">, number> = {
  rainbow: 18_000,
  fireworks: 18_000,
  candy_rain: 16_000,
  train: 17_000,
  bubbles: 18_000,
  hero: 18_000,
};

export interface EventItemView {
  id: string;
  container: Container;
  body: MotionBody;
  baseScale: number;
  label: string;
  featured: boolean;
  createdAtMs: number;
  isSample: boolean;
}

export interface EventStage {
  stage: Container;
  bounds(): { width: number; height: number };
  playTone(frequency: number, durationMs: number, gain: number, wave: OscillatorType, delayMs?: number): void;
  bigTextSize(): number;
}

export interface DisplayEventHandle {
  readonly id: string;
  readonly type: DisplayEventType;
  update(deltaMs: number, now: number): boolean;
  destroy(): void;
}

interface TimedEffect {
  container: Container;
  bornAt: number;
  lifeMs: number;
  riseSpeed: number;
  growTo: number;
}

export abstract class BaseDisplayEvent implements DisplayEventHandle {
  readonly id: string;
  abstract readonly type: DisplayEventType;
  protected readonly world: EventStage;
  protected readonly views: EventItemView[];
  protected readonly durationMs: number;
  protected startedAt = -1;
  private readonly effects: TimedEffect[] = [];
  private readonly firedKeys = new Set<string>();
  private destroyed = false;

  constructor(id: string, world: EventStage, views: EventItemView[], durationMs: number) {
    this.id = id;
    this.world = world;
    this.views = views;
    this.durationMs = durationMs;
  }

  update(deltaMs: number, now: number): boolean {
    if (this.destroyed) return false;
    if (this.startedAt < 0) this.startedAt = now;
    const elapsed = now - this.startedAt;
    this.step(elapsed, deltaMs, now);
    this.tickEffects(now);
    return elapsed < this.durationMs;
  }

  protected abstract step(elapsedMs: number, deltaMs: number, now: number): void;
  protected abstract cleanup(): void;

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.effects.forEach((effect) => {
      if (!effect.container.destroyed) effect.container.destroy({ children: true });
    });
    this.effects.length = 0;
    this.cleanup();
    this.views.forEach((view) => {
      if (view.container.destroyed) return;
      view.container.alpha = 1;
      view.container.visible = true;
      view.container.scale.set(view.baseScale);
      view.container.rotation = 0;
    });
  }

  protected alive(view: EventItemView): boolean { return !view.container.destroyed; }

  protected once(key: string, run: () => void): void {
    if (this.firedKeys.has(key)) return;
    this.firedKeys.add(key);
    run();
  }

  protected moveToward(view: EventItemView, targetX: number, targetY: number, speed: number, deltaMs: number): number {
    const dx = targetX - view.container.x;
    const dy = targetY - view.container.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 2) return 0;
    const step = Math.min(distance, speed * deltaMs);
    view.container.x += (dx / distance) * step;
    view.container.y += (dy / distance) * step;
    return distance;
  }

  protected rowTargetX(index: number, count: number, width: number, spread = 0.8): number {
    const usable = width * spread;
    const gap = count <= 1 ? 0 : usable / (count - 1);
    return width * ((1 - spread) / 2) + gap * index;
  }

  protected addTimedEffect(container: Container, now: number, lifeMs: number, riseSpeed = 0, growTo = 1): void {
    this.world.stage.addChild(container);
    this.effects.push({ container, bornAt: now, lifeMs, riseSpeed, growTo });
  }

  protected addFloatingText(textValue: string, x: number, y: number, now: number, options?: { fontSize?: number; fill?: number; lifeMs?: number }): void {
    const label = new Text({ text: textValue, style: { fill: options?.fill ?? 0xfff7d6, fontSize: options?.fontSize ?? 30, fontWeight: "900", stroke: { color: 0x17324d, width: 5 } } });
    label.anchor.set(0.5);
    label.position.set(x, y);
    this.addTimedEffect(label, now, options?.lifeMs ?? 1400, -0.03, 1.15);
  }

  protected addSparkleBurst(x: number, y: number, now: number, color = 0xfff7d6, count = 8): void {
    const container = new Container();
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const radius = 16 + (index % 3) * 12;
      const star = new Graphics().poly([0, -7, 2, -2, 7, 0, 2, 2, 0, 7, -2, 2, -7, 0, -2, -2]).fill(color);
      star.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius);
      container.addChild(star);
    }
    container.position.set(x, y);
    this.addTimedEffect(container, now, 700, -0.01, 1.9);
  }

  protected addConfettiBurst(x: number, y: number, now: number, spreadX: number, spreadY: number): void {
    const container = new Container();
    const colors = [0xffb703, 0xe11d48, 0x14b8a6, 0x60a5fa, 0xffffff, 0xa78bfa];
    for (let index = 0; index < 40; index += 1) {
      const piece = new Graphics().rect(-5, -3, 10, 6).fill(colors[index % colors.length]);
      piece.position.set((Math.random() - 0.5) * spreadX, (Math.random() - 0.5) * spreadY);
      piece.rotation = Math.random() * Math.PI * 2;
      container.addChild(piece);
    }
    container.position.set(x, y);
    this.addTimedEffect(container, now, 2200, 0.035, 1.35);
  }

  private tickEffects(now: number): void {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index];
      const progress = Math.min(1, (now - effect.bornAt) / effect.lifeMs);
      if (progress >= 1 || effect.container.destroyed) {
        if (!effect.container.destroyed) effect.container.destroy({ children: true });
        this.effects.splice(index, 1);
        continue;
      }
      effect.container.alpha = 1 - progress * progress;
      effect.container.y += effect.riseSpeed * 16;
      effect.container.scale.set(1 + (effect.growTo - 1) * progress);
    }
  }
}
