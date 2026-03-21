import type { PuyoType } from "../config/puyoTypes";

export interface PuyoCell {
  type: PuyoType;
  row: number;
  col: number;
}

export type BoardGrid = (PuyoCell | null)[][];

export enum Direction {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3,
}

export interface PuyoPairState {
  pivot: { row: number; col: number; type: PuyoType };
  child: { row: number; col: number; type: PuyoType };
  childDirection: Direction;
}

export interface ConnectedGroup {
  type: PuyoType;
  cells: { row: number; col: number }[];
}

export interface ClearResult {
  groups: ConnectedGroup[];
  chainStep: number;
  score: number;
}

export interface GravityMove {
  type: PuyoType;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
}

export interface GravityResult {
  moves: GravityMove[];
  hasChanges: boolean;
}

export interface ChainStep {
  stepNumber: number;
  clearedGroups: ConnectedGroup[];
  gravityMoves: GravityMove[];
  scoreGained: number;
}
