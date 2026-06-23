import type { FuwafuwaConfig } from "../config";

export interface MotionBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  rotation: number;
}

export function createBody(width: number, height: number, config: FuwafuwaConfig): MotionBody {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.random() * Math.max(1, width),
    y: Math.random() * Math.max(1, height),
    vx: Math.cos(angle) * config.motion.driftSpeed,
    vy: Math.sin(angle) * config.motion.driftSpeed,
    phase: Math.random() * Math.PI * 2,
    rotation: (Math.random() - 0.5) * config.motion.rotationJitter,
  };
}

export function updateBody(body: MotionBody, deltaMs: number, bounds: { width: number; height: number }, config: FuwafuwaConfig): MotionBody {
  const next = {
    ...body,
    x: body.x + body.vx * deltaMs,
    y: body.y + body.vy * deltaMs,
    phase: body.phase + (deltaMs / config.motion.bobPeriodMs) * Math.PI * 2,
  };
  if (next.x < 40 || next.x > bounds.width - 40) {
    next.vx *= -1;
  }
  if (next.y < 40 || next.y > bounds.height - 40) {
    next.vy *= -1;
  }
  next.x = Math.max(40, Math.min(bounds.width - 40, next.x));
  next.y = Math.max(40, Math.min(bounds.height - 40, next.y));
  return next;
}
