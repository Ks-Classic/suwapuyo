import type { GameAction } from "../types/game";

type ActionType = GameAction["type"];

export const KEY_BINDINGS: Record<string, ActionType> = {
  ArrowLeft: "MOVE_LEFT",
  KeyA: "MOVE_LEFT",
  ArrowRight: "MOVE_RIGHT",
  KeyD: "MOVE_RIGHT",
  ArrowDown: "SOFT_DROP",
  KeyS: "SOFT_DROP",
  ArrowUp: "HARD_DROP",
  KeyW: "HARD_DROP",
  KeyZ: "ROTATE_CCW",
  KeyQ: "ROTATE_CCW",
  KeyX: "ROTATE_CW",
  KeyE: "ROTATE_CW",
  Space: "PAUSE",
  KeyR: "RESTART",
};

// Keys that support DAS (Delayed Auto Shift) for repeated input
export const DAS_KEYS: Set<ActionType> = new Set([
  "MOVE_LEFT",
  "MOVE_RIGHT",
  "SOFT_DROP",
]);
