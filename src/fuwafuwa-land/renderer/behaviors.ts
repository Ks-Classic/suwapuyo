/**
 * behaviors - キャラが「そこで暮らしている」ように見える行動パターン5種(08_設計書 §2)。
 * 各キャラ独立の状態機械。既存MotionBodyドリフトはfloat状態として温存。
 * FuwafuwaWorldの肥大回避のため分離し、tickからupdateBehaviorを呼ぶ。
 */
import { Container, Sprite, Text } from "pixi.js";
import type { FuwafuwaConfig } from "../config";
import { type MotionBody, updateBody } from "./artworkMotion";

export type BehaviorState = "float" | "stroll" | "nap" | "play" | "greet";
export type BehaviorRandom = () => number;

/** 同時おひるね上限(全員寝てしまうのを防ぐ) */
export const MAX_NAPPERS = 3;
/** play/greet相手を探す距離(px) */
export const PARTNER_RANGE = 460;

/** featured とイベント参加中は通常行動の抽選対象外。 */
export function isBehaviorEligible(featured: boolean, displayEventActive: boolean): boolean {
  return !featured && !displayEventActive;
}

const STATE_DURATION_MS: Record<BehaviorState, [min: number, max: number]> = {
  float: [8000, 20000],
  stroll: [6000, 14000],
  nap: [5000, 10000],
  play: [4000, 8000],
  greet: [3000, 5000],
};

const STROLL_SPEED = 0.055;
const CHASE_SPEED = 0.16;
const APPROACH_SPEED = 0.09;
const CATCH_DISTANCE = 92;
const GREET_DISTANCE = 150;
const NAP_SINK_PX = 42;
const JUMP_HEIGHT = 46;
const JUMP_MS = 620;
const BOW_MS = 950;
const PARTICLE_LIFE_MS = 1700;
const MAX_PARTICLES = 6;

interface BehaviorParticle {
  text: Text;
  bornAt: number;
  lifeMs: number;
  vx: number;
  vy: number;
}

export interface BehaviorRuntime {
  state: BehaviorState;
  rng: BehaviorRandom;
  /** 0なら次のupdateで抽選(全体同時遷移を避ける独立タイマー) */
  stateUntil: number;
  facing: 1 | -1;
  strollDirection: 1 | -1;
  strollTargetY: number;
  pauseUntil: number;
  napTilt: number;
  napStartY: number;
  /** 1→0で減衰。任意状態で描画されるぴょん跳ね */
  jumpT: number;
  /** 1→0で減衰。おじぎ(縦つぶし) */
  bowT: number;
  partnerId: string | null;
  nextParticleAt: number;
  particles: BehaviorParticle[];
}

export interface BehaviorPeer {
  id: string;
  x: number;
  y: number;
  state: BehaviorState;
}

export interface BehaviorContext {
  now: number;
  bounds: { width: number; height: number };
  config: FuwafuwaConfig;
  /** パーティクル(Zzz/♡/♪)を載せるレイヤー */
  stage: Container;
  /** 現在おひるね中の数。遷移時にmutateして同tick内の超過を防ぐ */
  napCount: number;
  /** 自分を含む行動対象全キャラのスナップショット */
  peers: BehaviorPeer[];
  getRuntime(id: string): BehaviorRuntime | undefined;
}

export interface BehaviorItem {
  id: string;
  container: Container;
  body: MotionBody;
  behavior: BehaviorRuntime;
}

// ---- 純粋ロジック(テスト対象) ---------------------------------------------

export function rollStateDuration(state: BehaviorState, rng: BehaviorRandom): number {
  const [min, max] = STATE_DURATION_MS[state];
  return min + rng() * (max - min);
}

export interface TransitionOptions {
  napCount: number;
  hasPartner: boolean;
}

/**
 * 次状態の抽選。仕様の遷移表:
 * float→stroll/nap/play/greet、stroll→float/nap/greet、nap/play/greet→float。
 * napは上限、play/greetは相手がいる時のみ候補になる。
 */
export function pickNextState(current: BehaviorState, options: TransitionOptions, rng: BehaviorRandom): BehaviorState {
  let candidates: BehaviorState[];
  if (current === "float") {
    candidates = ["stroll"];
    if (options.napCount < MAX_NAPPERS) {
      candidates.push("nap");
    }
    if (options.hasPartner) {
      candidates.push("play", "greet");
    }
  } else if (current === "stroll") {
    candidates = ["float"];
    if (options.napCount < MAX_NAPPERS) {
      candidates.push("nap");
    }
    if (options.hasPartner) {
      candidates.push("greet");
    }
  } else {
    return "float";
  }
  const index = Math.min(candidates.length - 1, Math.floor(rng() * candidates.length));
  return candidates[index];
}

/** さんぽは画面下1/3をてくてく歩く */
export function strollTargetY(height: number, rng: BehaviorRandom): number {
  return height * (0.72 + rng() * 0.16);
}

// ---- ランタイム ------------------------------------------------------------

export function createBehavior(rng: BehaviorRandom = Math.random): BehaviorRuntime {
  return {
    state: "float",
    rng,
    stateUntil: 0,
    facing: 1,
    strollDirection: rng() < 0.5 ? -1 : 1,
    strollTargetY: 0,
    pauseUntil: 0,
    napTilt: 0,
    napStartY: 0,
    jumpT: 0,
    bowT: 0,
    partnerId: null,
    nextParticleAt: 0,
    particles: [],
  };
}

/** 状態と一時演出をリセット(イベント/バトル開始時)。パーティクルは破棄 */
export function resetBehavior(runtime: BehaviorRuntime): void {
  runtime.state = "float";
  runtime.stateUntil = 0;
  runtime.jumpT = 0;
  runtime.bowT = 0;
  runtime.partnerId = null;
  clearParticles(runtime);
}

/** アイテム削除時に呼ぶ。stage上のパーティクルを破棄 */
export function destroyBehavior(runtime: BehaviorRuntime): void {
  clearParticles(runtime);
}

function clearParticles(runtime: BehaviorRuntime): void {
  runtime.particles.forEach((particle) => {
    if (!particle.text.destroyed) {
      particle.text.destroy();
    }
  });
  runtime.particles.length = 0;
}

export function updateBehavior(item: BehaviorItem, ctx: BehaviorContext, deltaMs: number): void {
  const behavior = item.behavior;
  if (behavior.stateUntil === 0) {
    behavior.stateUntil = ctx.now + rollStateDuration(behavior.state, behavior.rng);
  }
  updateParticles(behavior, deltaMs);
  if (ctx.now >= behavior.stateUntil) {
    transition(item, ctx);
  }
  switch (behavior.state) {
    case "stroll":
      tickStroll(item, ctx, deltaMs);
      break;
    case "nap":
      tickNap(item, ctx, deltaMs);
      break;
    case "play":
      tickPlay(item, ctx, deltaMs);
      break;
    case "greet":
      tickGreet(item, ctx, deltaMs);
      break;
    default:
      tickFloat(item, ctx, deltaMs);
      break;
  }
  decayImpulses(behavior, deltaMs);
  applyPose(item, ctx);
}

function transition(item: BehaviorItem, ctx: BehaviorContext): void {
  const behavior = item.behavior;
  const partner = findPartner(item, ctx);
  const next = pickNextState(behavior.state, { napCount: ctx.napCount, hasPartner: partner !== null }, behavior.rng);
  behavior.state = next;
  behavior.stateUntil = ctx.now + rollStateDuration(next, behavior.rng);
  behavior.partnerId = null;
  if (next === "nap") {
    ctx.napCount += 1;
    behavior.napTilt = (behavior.rng() < 0.5 ? -1 : 1) * 0.35;
    behavior.napStartY = item.body.y;
    behavior.nextParticleAt = ctx.now + 600;
  } else if (next === "stroll") {
    behavior.strollDirection = item.body.vx >= 0 ? 1 : -1;
    behavior.strollTargetY = strollTargetY(ctx.bounds.height, behavior.rng);
    behavior.pauseUntil = 0;
  } else if ((next === "play" || next === "greet") && partner !== null) {
    behavior.partnerId = partner.id;
  }
}

/** 近くのfloat中の相手を探す(ペア成立時のみplay/greetが発動する) */
function findPartner(item: BehaviorItem, ctx: BehaviorContext): BehaviorPeer | null {
  let best: BehaviorPeer | null = null;
  let bestDistance = PARTNER_RANGE;
  ctx.peers.forEach((peer) => {
    if (peer.id === item.id || peer.state !== "float") {
      return;
    }
    const distance = Math.hypot(peer.x - item.body.x, peer.y - item.body.y);
    if (distance < bestDistance) {
      best = peer;
      bestDistance = distance;
    }
  });
  return best;
}

function toFloat(behavior: BehaviorRuntime, ctx: BehaviorContext): void {
  behavior.state = "float";
  behavior.stateUntil = ctx.now + rollStateDuration("float", behavior.rng);
  behavior.partnerId = null;
}

// ---- 各状態のtick ----------------------------------------------------------

function tickFloat(item: BehaviorItem, ctx: BehaviorContext, deltaMs: number): void {
  item.body = updateBody(item.body, deltaMs, ctx.bounds, ctx.config);
  item.behavior.facing = item.body.vx >= 0 ? 1 : -1;
}

function tickStroll(item: BehaviorItem, ctx: BehaviorContext, deltaMs: number): void {
  const behavior = item.behavior;
  const body = item.body;
  body.phase += (deltaMs / (ctx.config.motion.bobPeriodMs * 0.3)) * Math.PI * 2;
  if (ctx.now < behavior.pauseUntil) {
    // 立ち止まってきょろきょろ(左右反転)
    behavior.facing = Math.floor(ctx.now / 420) % 2 === 0 ? 1 : -1;
    return;
  }
  if (behavior.rng() < deltaMs * 0.00012) {
    behavior.pauseUntil = ctx.now + 700 + behavior.rng() * 700;
    return;
  }
  const margin = 90;
  body.x += behavior.strollDirection * STROLL_SPEED * deltaMs;
  if (body.x < margin) {
    body.x = margin;
    behavior.strollDirection = 1;
  } else if (body.x > ctx.bounds.width - margin) {
    body.x = ctx.bounds.width - margin;
    behavior.strollDirection = -1;
  }
  behavior.facing = behavior.strollDirection;
  if (behavior.strollTargetY === 0) {
    behavior.strollTargetY = strollTargetY(ctx.bounds.height, behavior.rng);
  }
  body.y += (behavior.strollTargetY - body.y) * Math.min(1, deltaMs * 0.0018);
}

function tickNap(item: BehaviorItem, ctx: BehaviorContext, deltaMs: number): void {
  const behavior = item.behavior;
  const body = item.body;
  body.phase += (deltaMs / (ctx.config.motion.bobPeriodMs * 2)) * Math.PI * 2;
  const targetY = behavior.napStartY + NAP_SINK_PX;
  body.y += (targetY - body.y) * Math.min(1, deltaMs * 0.0012);
  if (ctx.now >= behavior.nextParticleAt) {
    behavior.nextParticleAt = ctx.now + 1300;
    spawnParticle(item, ctx, "Zzz", 0x6b7fb3, 34, -46, 0.008, -0.028);
  }
}

function tickPlay(item: BehaviorItem, ctx: BehaviorContext, deltaMs: number): void {
  const behavior = item.behavior;
  const partner = behavior.partnerId === null ? undefined : ctx.peers.find((peer) => peer.id === behavior.partnerId);
  if (partner === undefined) {
    toFloat(behavior, ctx);
    return;
  }
  const body = item.body;
  body.phase += (deltaMs / (ctx.config.motion.bobPeriodMs * 0.25)) * Math.PI * 2;
  const dx = partner.x - body.x;
  const dy = partner.y - body.y;
  const distance = Math.hypot(dx, dy);
  behavior.facing = dx >= 0 ? 1 : -1;
  if (distance <= CATCH_DISTANCE) {
    // つかまえた! お互いぴょんと跳ねて解散
    behavior.jumpT = 1;
    const partnerRuntime = ctx.getRuntime(partner.id);
    if (partnerRuntime !== undefined) {
      partnerRuntime.jumpT = 1;
    }
    spawnParticle(item, ctx, "♪", 0xe86fa4, 0, -70, 0.01, -0.03);
    toFloat(behavior, ctx);
    return;
  }
  body.x += (dx / distance) * CHASE_SPEED * deltaMs;
  body.y += (dy / distance) * CHASE_SPEED * deltaMs;
}

function tickGreet(item: BehaviorItem, ctx: BehaviorContext, deltaMs: number): void {
  const behavior = item.behavior;
  const partner = behavior.partnerId === null ? undefined : ctx.peers.find((peer) => peer.id === behavior.partnerId);
  if (partner === undefined) {
    toFloat(behavior, ctx);
    return;
  }
  const body = item.body;
  body.phase += (deltaMs / ctx.config.motion.bobPeriodMs) * Math.PI * 2;
  const dx = partner.x - body.x;
  const dy = partner.y - body.y;
  const distance = Math.hypot(dx, dy);
  behavior.facing = dx >= 0 ? 1 : -1;
  if (distance > GREET_DISTANCE) {
    body.x += (dx / distance) * APPROACH_SPEED * deltaMs;
    body.y += (dy / distance) * APPROACH_SPEED * deltaMs;
    return;
  }
  // 向き合って同時におじぎ+ハート/音符
  if (behavior.bowT <= 0) {
    behavior.bowT = 1;
    const partnerRuntime = ctx.getRuntime(partner.id);
    if (partnerRuntime !== undefined) {
      partnerRuntime.bowT = 1;
      partnerRuntime.facing = dx >= 0 ? -1 : 1;
    }
    spawnParticle(item, ctx, behavior.rng() < 0.5 ? "♡" : "♪", 0xe11d48, dx / 2, -64, 0, -0.026);
    toFloat(behavior, ctx);
    behavior.stateUntil = ctx.now + BOW_MS + rollStateDuration("float", behavior.rng);
  }
}

// ---- 描画適用 --------------------------------------------------------------

function decayImpulses(behavior: BehaviorRuntime, deltaMs: number): void {
  if (behavior.jumpT > 0) {
    behavior.jumpT = Math.max(0, behavior.jumpT - deltaMs / JUMP_MS);
  }
  if (behavior.bowT > 0) {
    behavior.bowT = Math.max(0, behavior.bowT - deltaMs / BOW_MS);
  }
}

function applyPose(item: BehaviorItem, ctx: BehaviorContext): void {
  const behavior = item.behavior;
  const body = item.body;
  const container = item.container;
  if (container.destroyed) {
    return;
  }
  let offsetY = 0;
  let rotation = 0;
  switch (behavior.state) {
    case "stroll":
      offsetY = -Math.abs(Math.sin(body.phase)) * 9;
      rotation = behavior.strollDirection * 0.07 + Math.sin(body.phase) * 0.03;
      break;
    case "nap":
      offsetY = Math.sin(body.phase) * 3;
      rotation = behavior.napTilt;
      break;
    case "play":
      offsetY = -Math.abs(Math.sin(body.phase)) * 14;
      rotation = Math.sin(body.phase) * 0.08;
      break;
    default:
      offsetY = Math.sin(body.phase) * ctx.config.motion.bobAmplitude;
      rotation = Math.sin(body.phase * 0.7) * body.rotation;
      break;
  }
  if (behavior.jumpT > 0) {
    // ぴょんと2回跳ねる
    const progress = 1 - behavior.jumpT;
    offsetY -= Math.abs(Math.sin(progress * Math.PI * 2)) * JUMP_HEIGHT * behavior.jumpT;
  }
  container.x = body.x;
  container.y = body.y + offsetY;
  container.rotation = rotation;
  // おじぎ: 軽い縦つぶし。|scale.x|を基準にするので累積しない
  const baseScale = Math.abs(container.scale.x);
  const squash = behavior.bowT > 0 ? Math.sin((1 - behavior.bowT) * Math.PI) * 0.18 : 0;
  container.scale.y = baseScale * (1 - squash);
  // 進行方向への反転はSpriteのみ(ラベルTextを鏡文字にしない)
  container.children.forEach((child) => {
    if (child instanceof Sprite) {
      const magnitude = Math.abs(child.scale.x);
      child.scale.x = behavior.facing === -1 ? -magnitude : magnitude;
    }
  });
}

// ---- パーティクル ----------------------------------------------------------

function spawnParticle(item: BehaviorItem, ctx: BehaviorContext, textValue: string, color: number, offsetX: number, offsetY: number, vx: number, vy: number): void {
  const behavior = item.behavior;
  if (behavior.particles.length >= MAX_PARTICLES) {
    return;
  }
  const text = new Text({
    text: textValue,
    style: { fill: color, fontSize: 26, fontWeight: "900", stroke: { color: 0xffffff, width: 4 } },
  });
  text.anchor.set(0.5);
  text.position.set(item.body.x + offsetX, item.body.y + offsetY);
  ctx.stage.addChild(text);
  behavior.particles.push({ text, bornAt: ctx.now, lifeMs: PARTICLE_LIFE_MS, vx, vy });
}

function updateParticles(behavior: BehaviorRuntime, deltaMs: number): void {
  behavior.particles = behavior.particles.filter((particle) => {
    if (particle.text.destroyed) {
      return false;
    }
    particle.lifeMs -= deltaMs;
    if (particle.lifeMs <= 0) {
      particle.text.destroy();
      return false;
    }
    particle.text.x += particle.vx * deltaMs;
    particle.text.y += particle.vy * deltaMs;
    particle.text.alpha = Math.min(1, particle.lifeMs / (PARTICLE_LIFE_MS * 0.6));
    return true;
  });
}
