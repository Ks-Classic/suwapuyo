import type { BoardGrid, PuyoPairState, GravityMove, ChainStep } from "./puyo";
import type { PuyoType } from "../config/puyoTypes";

export type GamePhase =
  | "SPAWNING"
  | "CONTROLLING"
  | "LOCKING"
  | "RESOLVING"
  | "CHAIN_ANIM"
  | "GRAVITY_ANIM"
  | "GAME_OVER"
  | "PAUSED";

export interface GameState {
  phase: GamePhase;
  board: BoardGrid;
  currentPair: PuyoPairState | null;
  nextPairs: PuyoPairState[];
  score: number;
  chainCount: number;
  maxChain: number;
  level: number;
  totalCleared: number;
  elapsedMs: number;
  minPopSettings: Record<PuyoType, number>;
}

export type GameAction =
  | { type: "MOVE_LEFT" }
  | { type: "MOVE_RIGHT" }
  | { type: "ROTATE_CW" }
  | { type: "ROTATE_CCW" }
  | { type: "SOFT_DROP" }
  | { type: "HARD_DROP" }
  | { type: "TICK"; dt: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESTART" };

export type GameEvent =
  | { type: "PIECE_SPAWNED"; pair: PuyoPairState }
  | { type: "PIECE_MOVED"; direction: "left" | "right" | "down" }
  | { type: "PIECE_ROTATED"; direction: "cw" | "ccw" }
  | { type: "PIECE_LANDED" }
  | { type: "PIECE_LOCKED" }
  | { type: "HARD_DROPPED" }
  | { type: "CHAIN_STEP"; step: ChainStep }
  | { type: "CHAIN_ENDED"; totalChain: number; totalScore: number }
  | { type: "GRAVITY_APPLIED"; moves: GravityMove[] }
  | { type: "LEVEL_UP"; newLevel: number }
  | { type: "GAME_OVER"; finalScore: number }
  | { type: "PAUSED" }
  | { type: "RESUMED" };

export interface GameSettings {
  seVolume: number;
  bgmVolume: number;
  minPop: Record<PuyoType, number>;
  fallSpeed: "slow" | "normal" | "fast";
  showGhost: boolean;
  touchSensitivity: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  seVolume: 0.8,
  bgmVolume: 0.7,
  minPop: {
    ghost: 4,
    tooth: 4,
    blob: 3,
    tanuki: 5,
  },
  fallSpeed: "normal",
  showGhost: true,
  touchSensitivity: 50,
};
