// Game board dimensions
export const BOARD_COLS = 6;
export const BOARD_ROWS = 14; // 12 visible + 2 hidden
export const VISIBLE_ROWS = 12;
export const HIDDEN_ROWS = 2;
export const CELL_SIZE = 64;
export const BOARD_WIDTH = BOARD_COLS * CELL_SIZE; // 384
export const BOARD_HEIGHT = VISIBLE_ROWS * CELL_SIZE; // 768

// Spawn position
export const SPAWN_COL = 2;
export const SPAWN_ROW = 0;

// Timing
export const LOCK_DELAY_MS = 500;
export const SOFT_DROP_MULTIPLIER = 20;
export const POP_ANIM_MS = 500;
export const GRAVITY_ANIM_MS = 200;
export const BOUNCE_ANIM_MS = 300;

// Fall speeds per level (ms per cell)
export const FALL_SPEEDS = [
  1000, // Level 1
  900, // Level 2
  800, // Level 3
  700, // Level 4
  600, // Level 5
  500, // Level 6
  400, // Level 7
  300, // Level 8
  200, // Level 9
  100, // Level 10 (max)
];

// Score calculation
export const BASE_SCORE_PER_PUYO = 10;
export const CHAIN_BONUSES = [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256];
export const GROUP_BONUS_PER_EXTRA = 2;

// Level up threshold (puyos cleared per level)
export const PUYOS_PER_LEVEL = 30;

// DAS (Delayed Auto Shift)
export const DAS_DELAY_MS = 170;
export const DAS_INTERVAL_MS = 50;
