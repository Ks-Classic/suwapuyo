// @vitest-environment jsdom
import { Container } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import type { DisplayEventType } from "../types";
import { createDisplayEvent, EVENT_DURATIONS_MS, type EventStage } from "./displayEvents";
import { selectHero } from "./events/heroEvent";

const TYPES = ["rainbow", "fireworks", "candy_rain", "train", "bubbles", "hero"] as const;

function world(): EventStage {
  return { stage: new Container(), bounds: () => ({ width: 1280, height: 720 }), playTone: vi.fn(), bigTextSize: () => 72 };
}

describe("display events", () => {
  it.each(TYPES)("constructs, runs and cleans up %s", (type) => {
    const stage = world();
    const handle = createDisplayEvent({ id: `event-${type}`, type, startedAt: new Date().toISOString() }, stage, []);
    expect(handle?.type).toBe(type);
    expect(handle?.update(16, 1000)).toBe(true);
    expect(handle?.update(16, 1000 + EVENT_DURATIONS_MS[type] + 1)).toBe(false);
    handle?.destroy();
  });

  it("does not route the legacy battle through the six-event factory", () => {
    expect(createDisplayEvent({ id: "battle", type: "battle", startedAt: new Date().toISOString() }, world(), [])).toBeNull();
  });

  it("selects featured hero, otherwise the newest artwork", () => {
    const base = (id: string, featured: boolean, createdAtMs: number, isSample = false) => ({ id, featured, createdAtMs, isSample, label: id, container: new Container(), body: { x: 0, y: 0, vx: 0, vy: 0, phase: 0, rotation: 0 }, baseScale: 1 });
    expect(selectHero([base("old", false, 1), base("featured", true, 0)])?.id).toBe("featured");
    expect(selectHero([base("sample", false, 9, true), base("old", false, 1), base("new", false, 5)])?.id).toBe("new");
  });

  it("keeps all new event durations within the specified 15–20 seconds", () => {
    (Object.keys(EVENT_DURATIONS_MS) as Exclude<DisplayEventType, "battle">[]).forEach((type) => {
      expect(EVENT_DURATIONS_MS[type]).toBeGreaterThanOrEqual(15_000);
      expect(EVENT_DURATIONS_MS[type]).toBeLessThanOrEqual(20_000);
    });
  });
});
