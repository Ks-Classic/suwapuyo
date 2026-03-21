import { useRef, useEffect, useState, useCallback } from "react";
import {
  Application,
  Assets,
  Sprite,
  Container,
  Graphics,
  Text,
  TextStyle,
  Texture,
} from "pixi.js";
import { SoundFX } from "../../audio/SoundFX";
import styles from "../../styles/demo.module.css";

// ═══════════════════════════════════════
// Constants
// ═══════════════════════════════════════
const COLS = 6;
const ROWS = 10;
const CELL = 56;
const GAP = 2;
const BOARD_W = COLS * (CELL + GAP) - GAP;
const BOARD_H = ROWS * (CELL + GAP) - GAP;
const BOARD_PAD = 12;

type PuyoType = "ghost" | "tooth" | "blob" | "tanuki";
const TYPES: PuyoType[] = ["ghost", "tooth", "blob", "tanuki"];

const MIN_POP: Record<PuyoType, number> = {
  ghost: 4,
  tooth: 4,
  blob: 3,
  tanuki: 5,
};

const THEME_COLORS: Record<PuyoType, number> = {
  ghost: 0xc8e6f0,
  tooth: 0xfff5e0,
  blob: 0xe8e8f0,
  tanuki: 0xb08860,
};

const THEME_COLORS_HEX: Record<PuyoType, string> = {
  ghost: "#C8E6F0",
  tooth: "#FFF5E0",
  blob: "#E8E8F0",
  tanuki: "#B08860",
};

const CHAR_NAMES: Record<PuyoType, string> = {
  ghost: "わのの",
  tooth: "わーわー",
  blob: "すーすー",
  tanuki: "たぬぺい",
};

const SPRITE_PATHS: Record<PuyoType, string> = {
  ghost: "/assets/sprites/ghost/idle.png",
  tooth: "/assets/sprites/tooth/idle.png",
  blob: "/assets/sprites/blob/idle.png",
  tanuki: "/assets/sprites/tanuki/idle.png",
};

// ═══════════════════════════════════════
// Easing functions
// ═══════════════════════════════════════
function easeOutQuad(t: number) {
  return t * (2 - t);
}
function easeInQuad(t: number) {
  return t * t;
}
function easeOutBounce(t: number) {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
}
function easeOutBack(t: number) {
  const s = 1.70158;
  return --t * t * ((s + 1) * t + s) + 1;
}

// ═══════════════════════════════════════
// Tween system
// ═══════════════════════════════════════
interface TweenData {
  obj: Record<string, number>;
  start: Record<string, number>;
  end: Record<string, number>;
  duration: number;
  elapsed: number;
  ease: (t: number) => number;
  resolve: () => void;
}

let activeTweens: TweenData[] = [];

function tweenTo(
  obj: Record<string, number>,
  props: Record<string, number>,
  duration: number,
  ease = easeOutQuad
): Promise<void> {
  return new Promise((resolve) => {
    const start: Record<string, number> = {};
    for (const key in props) {
      start[key] = obj[key] ?? 0;
    }
    activeTweens.push({
      obj,
      start,
      end: props,
      duration,
      elapsed: 0,
      ease,
      resolve,
    });
  });
}

function updateTweens(dtMs: number) {
  for (let i = activeTweens.length - 1; i >= 0; i--) {
    const t = activeTweens[i];
    t.elapsed = Math.min(t.elapsed + dtMs, t.duration);
    const p = t.ease(t.elapsed / t.duration);
    for (const key in t.end) {
      t.obj[key] = t.start[key] + (t.end[key] - t.start[key]) * p;
    }
    if (t.elapsed >= t.duration) {
      t.resolve();
      activeTweens.splice(i, 1);
    }
  }
}

// ═══════════════════════════════════════
// Particle system
// ═══════════════════════════════════════
interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

let particles: Particle[] = [];

function spawnParticles(
  container: Container,
  x: number,
  y: number,
  color: number,
  count: number
) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 120 + Math.random() * 180;
    const size = 3 + Math.random() * 5;

    const g = new Graphics();
    g.circle(0, 0, size).fill({ color, alpha: 0.9 });
    g.x = x;
    g.y = y;
    container.addChild(g);

    particles.push({
      g,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 400 + Math.random() * 200,
    });
  }
}

function updateParticles(dtMs: number) {
  const dtSec = dtMs / 1000;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dtMs;
    p.g.x += p.vx * dtSec;
    p.g.y += p.vy * dtSec;
    p.vy += 400 * dtSec;
    const progress = p.life / p.maxLife;
    p.g.alpha = 1 - progress;
    p.g.scale.set(1 - progress * 0.5);

    if (p.life >= p.maxLife) {
      p.g.destroy();
      particles.splice(i, 1);
    }
  }
}

// ═══════════════════════════════════════
// Board logic
// ═══════════════════════════════════════
function createBoard(): (PuyoType | null)[][] {
  const board: (PuyoType | null)[][] = [];
  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
      board[r][c] = TYPES[Math.floor(Math.random() * TYPES.length)];
    }
  }
  return board;
}

function findGroup(
  board: (PuyoType | null)[][],
  startR: number,
  startC: number
): { row: number; col: number }[] {
  const type = board[startR]?.[startC];
  if (!type) return [];

  const visited = new Set<string>();
  const group: { row: number; col: number }[] = [];
  const queue: [number, number][] = [[startR, startC]];
  visited.add(`${startR},${startC}`);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    group.push({ row: r, col: c });

    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (
        nr >= 0 &&
        nr < ROWS &&
        nc >= 0 &&
        nc < COLS &&
        !visited.has(key) &&
        board[nr][nc] === type
      ) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  return group;
}

function applyGravity(
  board: (PuyoType | null)[][]
): { type: PuyoType; fromR: number; fromC: number; toR: number }[] {
  const moves: {
    type: PuyoType;
    fromR: number;
    fromC: number;
    toR: number;
  }[] = [];

  for (let c = 0; c < COLS; c++) {
    let writeR = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] !== null) {
        if (r !== writeR) {
          moves.push({
            type: board[r][c]!,
            fromR: r,
            fromC: c,
            toR: writeR,
          });
          board[writeR][c] = board[r][c];
          board[r][c] = null;
        }
        writeR--;
      }
    }
  }

  return moves;
}

function findAllClearable(
  board: (PuyoType | null)[][]
): { type: PuyoType; cells: { row: number; col: number }[] }[] {
  const visited = new Set<string>();
  const clearable: { type: PuyoType; cells: { row: number; col: number }[] }[] =
    [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${r},${c}`;
      if (visited.has(key) || !board[r][c]) continue;

      const type = board[r][c]!;
      const group = findGroup(board, r, c);
      group.forEach((g) => visited.add(`${g.row},${g.col}`));

      if (group.length >= MIN_POP[type]) {
        clearable.push({ type, cells: group });
      }
    }
  }

  return clearable;
}

// ═══════════════════════════════════════
// PuyoDemo class - PixiJS scene
// ═══════════════════════════════════════
class PuyoDemo {
  app: Application;
  board: (PuyoType | null)[][] = [];
  sprites: (Sprite | null)[][] = [];
  textures: Record<string, Texture> = {};
  boardContainer!: Container;
  effectContainer!: Container;
  uiContainer!: Container;
  boardBg!: Graphics;
  busy = false;
  time = 0;
  score = 0;
  chainCount = 0;
  initialized = false;
  destroyed = false;

  // Sound effects
  sfx = new SoundFX();

  // Selection state
  selectedRow = -1;
  selectedCol = -1;
  selectionHighlight: Graphics | null = null;
  arrowGraphics: Graphics[] = [];

  onScoreChange?: (score: number) => void;
  onChainChange?: (chain: number) => void;

  constructor() {
    this.app = new Application();
  }

  async init(container: HTMLElement) {
    if (this.destroyed) return;

    const totalW = BOARD_W + BOARD_PAD * 2;
    const totalH = BOARD_H + BOARD_PAD * 2;

    await this.app.init({
      width: totalW,
      height: totalH,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (this.destroyed) return;

    container.appendChild(this.app.canvas);
    this.app.canvas.style.borderRadius = "16px";

    // Load textures
    for (const type of TYPES) {
      this.textures[type] = await Assets.load(SPRITE_PATHS[type]);
      if (this.destroyed) return;
    }

    // Board background
    this.boardBg = new Graphics();
    this.drawBoardBg();
    this.app.stage.addChild(this.boardBg);

    // Board container (for sprites)
    this.boardContainer = new Container();
    this.boardContainer.x = BOARD_PAD;
    this.boardContainer.y = BOARD_PAD;
    this.app.stage.addChild(this.boardContainer);

    // Effect container (for particles)
    this.effectContainer = new Container();
    this.effectContainer.x = BOARD_PAD;
    this.effectContainer.y = BOARD_PAD;
    this.app.stage.addChild(this.effectContainer);

    // UI container (for arrows, selection highlight)
    this.uiContainer = new Container();
    this.uiContainer.x = BOARD_PAD;
    this.uiContainer.y = BOARD_PAD;
    this.app.stage.addChild(this.uiContainer);

    // Create initial board
    this.board = createBoard();
    this.initSprites();

    // Ticker
    this.app.ticker.add((ticker) => {
      const dt = ticker.deltaMS;
      this.time += dt;
      updateTweens(dt);
      updateParticles(dt);
      this.updateIdleAnimation();
      this.updateSelectionPulse();
    });

    this.initialized = true;
  }

  drawBoardBg() {
    const g = this.boardBg;
    g.clear();

    const totalW = BOARD_W + BOARD_PAD * 2;
    const totalH = BOARD_H + BOARD_PAD * 2;

    // Soft cream board background
    g.roundRect(0, 0, totalW, totalH, 20).fill({
      color: 0xfff8e7,
      alpha: 0.92,
    });

    // Grid cells (light green tint)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = BOARD_PAD + c * (CELL + GAP);
        const y = BOARD_PAD + r * (CELL + GAP);
        g.roundRect(x, y, CELL, CELL, 10).fill({
          color: 0xe8f5e0,
          alpha: 0.7,
        });
      }
    }

    // Warm border
    g.roundRect(1, 1, totalW - 2, totalH - 2, 20).stroke({
      color: 0x8bd46e,
      alpha: 0.5,
      width: 2.5,
    });
  }

  cellX(col: number) {
    return col * (CELL + GAP) + CELL / 2;
  }

  cellY(row: number) {
    return row * (CELL + GAP) + CELL / 2;
  }

  initSprites() {
    this.sprites = [];
    for (let r = 0; r < ROWS; r++) {
      this.sprites[r] = [];
      for (let c = 0; c < COLS; c++) {
        const type = this.board[r][c];
        if (type) {
          const sprite = this.createSprite(type, r, c);
          this.sprites[r][c] = sprite;
        } else {
          this.sprites[r][c] = null;
        }
      }
    }
  }

  createSprite(type: PuyoType, row: number, col: number): Sprite {
    const sprite = new Sprite({
      texture: this.textures[type],
    });
    sprite.anchor.set(0.5);
    sprite.x = this.cellX(col);
    sprite.y = this.cellY(row);
    sprite.width = CELL - 4;
    sprite.height = CELL - 4;
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    sprite.alpha = 0;

    (sprite as any)._puyoRow = row;
    (sprite as any)._puyoCol = col;
    (sprite as any)._puyoType = type;
    (sprite as any)._baseY = sprite.y;
    (sprite as any)._idlePhase = Math.random() * Math.PI * 2;

    // Click handler - reads current position from metadata (not closure)
    sprite.on("pointerdown", () => {
      const currentRow = (sprite as any)._puyoRow;
      const currentCol = (sprite as any)._puyoCol;
      this.handleClick(currentRow, currentCol);
    });

    this.boardContainer.addChild(sprite);

    // Fade in
    tweenTo(
      sprite as any,
      { alpha: 1 },
      300 + Math.random() * 200,
      easeOutQuad
    );

    return sprite;
  }

  updateIdleAnimation() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const sprite = this.sprites[r][c];
        if (!sprite || (sprite as any)._animating) continue;

        const phase = (sprite as any)._idlePhase ?? 0;
        const baseY = (sprite as any)._baseY ?? this.cellY(r);
        sprite.y = baseY + Math.sin(this.time * 0.003 + phase) * 2;
        sprite.rotation = Math.sin(this.time * 0.002 + phase * 1.3) * 0.04;
      }
    }
  }

  updateSelectionPulse() {
    if (!this.selectionHighlight) return;
    const pulse = 0.6 + Math.sin(this.time * 0.006) * 0.3;
    this.selectionHighlight.alpha = pulse;
  }

  // ──── Selection & Swap Logic ────

  handleClick(row: number, col: number) {
    if (this.busy) return;

    if (this.selectedRow === -1) {
      // Nothing selected → select this puyo
      this.select(row, col);
    } else if (this.selectedRow === row && this.selectedCol === col) {
      // Clicked same puyo → deselect
      this.sfx.deselect();
      this.deselect();
    } else if (this.isAdjacent(this.selectedRow, this.selectedCol, row, col)) {
      // Clicked adjacent puyo → swap!
      this.performSwap(this.selectedRow, this.selectedCol, row, col);
    } else {
      // Clicked non-adjacent → reselect
      this.deselect();
      this.select(row, col);
    }
  }

  isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  select(row: number, col: number) {
    this.deselect();
    this.selectedRow = row;
    this.selectedCol = col;
    this.sfx.select();

    // Draw selection highlight (glowing ring)
    const highlight = new Graphics();
    const cx = this.cellX(col);
    const cy = this.cellY(row);
    highlight.roundRect(
      cx - CELL / 2 - 2,
      cy - CELL / 2 - 2,
      CELL + 4,
      CELL + 4,
      12
    ).stroke({ color: 0xf5a623, width: 3, alpha: 1 });
    highlight.roundRect(
      cx - CELL / 2 - 4,
      cy - CELL / 2 - 4,
      CELL + 8,
      CELL + 8,
      14
    ).stroke({ color: 0xf5a623, width: 1.5, alpha: 0.4 });
    this.selectionHighlight = highlight;
    this.uiContainer.addChild(highlight);

    // Scale up selected sprite slightly
    const sprite = this.sprites[row][col];
    if (sprite) {
      tweenTo(sprite.scale as any, { x: 1.1, y: 1.1 }, 150, easeOutBack);
    }

    // Show directional arrows on adjacent cells
    this.showArrows(row, col);
  }

  deselect() {
    // Remove highlight
    if (this.selectionHighlight) {
      this.selectionHighlight.destroy();
      this.selectionHighlight = null;
    }

    // Scale back selected sprite
    if (this.selectedRow >= 0 && this.selectedCol >= 0) {
      const sprite = this.sprites[this.selectedRow]?.[this.selectedCol];
      if (sprite) {
        tweenTo(sprite.scale as any, { x: 1, y: 1 }, 150, easeOutQuad);
      }
    }

    // Remove arrows
    this.hideArrows();

    this.selectedRow = -1;
    this.selectedCol = -1;
  }

  showArrows(row: number, col: number) {
    this.hideArrows();

    const directions = [
      { dr: -1, dc: 0 }, // up
      { dr: 1, dc: 0 }, // down
      { dr: 0, dc: -1 }, // left
      { dr: 0, dc: 1 }, // right
    ];

    for (const { dr, dc } of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;

      // Arrow positioned at the midpoint between cells
      const fromX = this.cellX(col);
      const fromY = this.cellY(row);
      const toX = this.cellX(nc);
      const toY = this.cellY(nr);
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;

      const arrowContainer = new Graphics();

      // Background circle (orange)
      arrowContainer.circle(0, 0, 14).fill({ color: 0xf5a623, alpha: 0.85 });

      // Arrow triangle
      const sz = 7;
      if (dr === -1) {
        // up
        arrowContainer
          .poly([0, -sz, -sz * 0.7, sz * 0.5, sz * 0.7, sz * 0.5])
          .fill({ color: 0xffffff });
      } else if (dr === 1) {
        // down
        arrowContainer
          .poly([0, sz, -sz * 0.7, -sz * 0.5, sz * 0.7, -sz * 0.5])
          .fill({ color: 0xffffff });
      } else if (dc === -1) {
        // left
        arrowContainer
          .poly([-sz, 0, sz * 0.5, -sz * 0.7, sz * 0.5, sz * 0.7])
          .fill({ color: 0xffffff });
      } else {
        // right
        arrowContainer
          .poly([sz, 0, -sz * 0.5, -sz * 0.7, -sz * 0.5, sz * 0.7])
          .fill({ color: 0xffffff });
      }

      arrowContainer.x = midX;
      arrowContainer.y = midY;
      arrowContainer.eventMode = "static";
      arrowContainer.cursor = "pointer";
      arrowContainer.zIndex = 100;

      arrowContainer.on("pointerdown", (e) => {
        e.stopPropagation();
        this.performSwap(row, col, nr, nc);
      });

      this.uiContainer.addChild(arrowContainer);
      this.arrowGraphics.push(arrowContainer);
    }
  }

  hideArrows() {
    for (const g of this.arrowGraphics) {
      g.destroy();
    }
    this.arrowGraphics = [];
  }

  async performSwap(r1: number, c1: number, r2: number, c2: number) {
    this.busy = true;
    this.deselect();

    // Animate swap
    this.sfx.swap();
    await this.animateSwap(r1, c1, r2, c2);

    // Swap in board data
    const temp = this.board[r1][c1];
    this.board[r1][c1] = this.board[r2][c2];
    this.board[r2][c2] = temp;

    // Swap sprite references
    const tempSprite = this.sprites[r1][c1];
    this.sprites[r1][c1] = this.sprites[r2][c2];
    this.sprites[r2][c2] = tempSprite;

    // Update sprite metadata
    if (this.sprites[r1][c1]) {
      (this.sprites[r1][c1] as any)._puyoRow = r1;
      (this.sprites[r1][c1] as any)._puyoCol = c1;
      (this.sprites[r1][c1] as any)._baseY = this.cellY(r1);
    }
    if (this.sprites[r2][c2]) {
      (this.sprites[r2][c2] as any)._puyoRow = r2;
      (this.sprites[r2][c2] as any)._puyoCol = c2;
      (this.sprites[r2][c2] as any)._baseY = this.cellY(r2);
    }

    // Check for matches
    const clearable = findAllClearable(this.board);
    if (clearable.length === 0) {
      // No match → swap back with "fail" animation
      this.sfx.noMatch();
      await delay(150);
      await this.animateSwap(r1, c1, r2, c2);

      // Swap back board data
      const temp2 = this.board[r1][c1];
      this.board[r1][c1] = this.board[r2][c2];
      this.board[r2][c2] = temp2;

      const tempSprite2 = this.sprites[r1][c1];
      this.sprites[r1][c1] = this.sprites[r2][c2];
      this.sprites[r2][c2] = tempSprite2;

      if (this.sprites[r1][c1]) {
        (this.sprites[r1][c1] as any)._puyoRow = r1;
        (this.sprites[r1][c1] as any)._puyoCol = c1;
        (this.sprites[r1][c1] as any)._baseY = this.cellY(r1);
      }
      if (this.sprites[r2][c2]) {
        (this.sprites[r2][c2] as any)._puyoRow = r2;
        (this.sprites[r2][c2] as any)._puyoCol = c2;
        (this.sprites[r2][c2] as any)._baseY = this.cellY(r2);
      }

      this.busy = false;
      return;
    }

    // Match found! Start chain resolution
    this.chainCount = 0;

    // Pop all clearable groups
    await this.popClearable(clearable);

    // Chain loop
    let chaining = true;
    while (chaining) {
      const moves = applyGravity(this.board);
      if (moves.length > 0) {
        await this.animateGravity(moves);
      }

      const moreClearable = findAllClearable(this.board);
      if (moreClearable.length > 0) {
        await this.popClearable(moreClearable);
      } else {
        chaining = false;
      }
    }

    // Refill empty spaces
    const newPuyos = this.refillBoard();
    await this.animateRefill(newPuyos);

    // Check if refill created new matches (auto-chain)
    let postRefillChaining = true;
    while (postRefillChaining) {
      const postClearable = findAllClearable(this.board);
      if (postClearable.length > 0) {
        await this.popClearable(postClearable);
        const moves = applyGravity(this.board);
        if (moves.length > 0) {
          await this.animateGravity(moves);
        }
        const newPuyos2 = this.refillBoard();
        if (newPuyos2.length > 0) {
          await this.animateRefill(newPuyos2);
        }
      } else {
        postRefillChaining = false;
      }
    }

    this.chainCount = 0;
    this.onChainChange?.(0);
    this.busy = false;
  }

  async animateSwap(r1: number, c1: number, r2: number, c2: number) {
    const sprite1 = this.sprites[r1][c1];
    const sprite2 = this.sprites[r2][c2];

    const promises: Promise<void>[] = [];

    if (sprite1) {
      (sprite1 as any)._animating = true;
      promises.push(
        tweenTo(
          sprite1 as any,
          { x: this.cellX(c2), y: this.cellY(r2) },
          200,
          easeOutQuad
        ).then(() => {
          (sprite1 as any)._animating = false;
        })
      );
    }

    if (sprite2) {
      (sprite2 as any)._animating = true;
      promises.push(
        tweenTo(
          sprite2 as any,
          { x: this.cellX(c1), y: this.cellY(r1) },
          200,
          easeOutQuad
        ).then(() => {
          (sprite2 as any)._animating = false;
        })
      );
    }

    await Promise.all(promises);
  }

  async popClearable(
    clearable: { type: PuyoType; cells: { row: number; col: number }[] }[]
  ) {
    this.chainCount++;
    const allCells = clearable.flatMap((g) => g.cells);
    const totalCleared = allCells.length;
    const pointsPer =
      10 * totalCleared * (this.chainCount > 1 ? this.chainCount * 4 : 1);
    this.score += pointsPer;
    this.onScoreChange?.(this.score);
    this.onChainChange?.(this.chainCount);

    // Check if any tanuki in the clearable groups
    const hasTanuki = clearable.some((g) => g.type === "tanuki");
    if (hasTanuki) {
      this.sfx.coin();
    } else {
      this.sfx.pop(this.chainCount);
    }

    // Phase 1: Flash white + scale up
    const flashPromises = allCells.map(({ row, col }) => {
      const sprite = this.sprites[row][col];
      if (!sprite) return Promise.resolve();
      (sprite as any)._animating = true;
      sprite.tint = 0xffffff;
      return tweenTo(
        sprite.scale as any,
        { x: 1.3, y: 1.3 },
        120,
        easeOutBack
      );
    });
    await Promise.all(flashPromises);

    // Phase 2: Flash colored
    allCells.forEach(({ row, col }) => {
      const sprite = this.sprites[row][col];
      const type = this.board[row][col];
      if (sprite && type) sprite.tint = THEME_COLORS[type];
    });
    await delay(80);

    // Phase 3: Flash white again
    allCells.forEach(({ row, col }) => {
      const sprite = this.sprites[row][col];
      if (sprite) sprite.tint = 0xffffff;
    });
    await delay(80);

    // Phase 4: Pop (scale to 0 + fade + particles)
    const popPromises = allCells.map(({ row, col }) => {
      const sprite = this.sprites[row][col];
      if (!sprite) return Promise.resolve();
      const type = this.board[row][col];

      if (type === "tanuki") {
        // Coin particles for tanuki!
        this.spawnCoinParticles(
          this.cellX(col),
          this.cellY(row),
          12
        );
      } else {
        spawnParticles(
          this.effectContainer,
          this.cellX(col),
          this.cellY(row),
          type ? THEME_COLORS[type] : 0xffffff,
          8
        );
      }

      return Promise.all([
        tweenTo(sprite.scale as any, { x: 0, y: 0 }, 250, easeInQuad),
        tweenTo(sprite as any, { alpha: 0 }, 250, easeInQuad),
      ]);
    });
    await Promise.all(popPromises);

    // Remove sprites and clear board
    allCells.forEach(({ row, col }) => {
      const sprite = this.sprites[row][col];
      if (sprite) {
        sprite.destroy();
        this.sprites[row][col] = null;
      }
      this.board[row][col] = null;
    });

    // Show chain text
    if (this.chainCount > 0) {
      this.showChainText(this.chainCount);
      if (this.chainCount > 1) this.sfx.chain(this.chainCount);
    }

    await delay(100);
  }

  async animateGravity(
    moves: { type: PuyoType; fromR: number; fromC: number; toR: number }[]
  ) {
    const promises = moves.map(({ fromR, fromC, toR }) => {
      const sprite = this.sprites[fromR][fromC];
      if (!sprite) return Promise.resolve();

      this.sprites[toR][fromC] = sprite;
      this.sprites[fromR][fromC] = null;
      (sprite as any)._puyoRow = toR;
      (sprite as any)._baseY = this.cellY(toR);

      const distance = toR - fromR;
      const duration = 100 + distance * 60;

      return tweenTo(
        sprite as any,
        { y: this.cellY(toR) },
        duration,
        easeInQuad
      ).then(() => {
        this.sfx.land();
        (sprite as any)._animating = true;
        return tweenTo(
          sprite.scale as any,
          { x: 1.2, y: 0.8 },
          80,
          easeOutQuad
        )
          .then(() =>
            tweenTo(
              sprite.scale as any,
              { x: 0.9, y: 1.1 },
              100,
              easeOutQuad
            )
          )
          .then(() =>
            tweenTo(
              sprite.scale as any,
              { x: 1, y: 1 },
              120,
              easeOutBounce
            )
          )
          .then(() => {
            (sprite as any)._animating = false;
          });
      });
    });
    await Promise.all(promises);
  }

  refillBoard(): { type: PuyoType; row: number; col: number }[] {
    const newPuyos: { type: PuyoType; row: number; col: number }[] = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (this.board[r][c] === null) {
          const type = TYPES[Math.floor(Math.random() * TYPES.length)];
          this.board[r][c] = type;
          newPuyos.push({ type, row: r, col: c });
        }
      }
    }
    return newPuyos;
  }

  async animateRefill(
    newPuyos: { type: PuyoType; row: number; col: number }[]
  ) {
    newPuyos.sort((a, b) => a.row - b.row);
    if (newPuyos.length > 0) this.sfx.refill();

    const promises = newPuyos.map(({ type, row, col }, i) => {
      const sprite = this.createSprite(type, row, col);
      sprite.alpha = 0;
      sprite.y = -CELL;
      sprite.scale.set(0.6);
      this.sprites[row][col] = sprite;

      return delay(i * 30).then(() =>
        Promise.all([
          tweenTo(
            sprite as any,
            { y: this.cellY(row), alpha: 1 },
            350,
            easeOutBounce
          ),
          tweenTo(sprite.scale as any, { x: 1, y: 1 }, 350, easeOutBack),
        ]).then(() => {
          (sprite as any)._baseY = this.cellY(row);
          (sprite as any)._animating = false;
        })
      );
    });

    await Promise.all(promises);
  }

  showChainText(chain: number) {
    const textStyle = new TextStyle({
      fontFamily: "'M PLUS Rounded 1c', sans-serif",
      fontSize: 48,
      fontWeight: "900",
      fill: "#ffffff",
      stroke: { color: "#F5A623", width: 5 },
      dropShadow: {
        color: "#E8950A",
        blur: 8,
        distance: 2,
        alpha: 0.6,
      },
    });

    const text = new Text({
      text: `${chain} れんさ！`,
      style: textStyle,
    });
    text.anchor.set(0.5);
    text.x = BOARD_W / 2;
    text.y = BOARD_H / 2;
    text.alpha = 0;
    text.scale.set(0.3);
    this.effectContainer.addChild(text);

    tweenTo(text as any, { alpha: 1 }, 150, easeOutQuad);
    tweenTo(text.scale as any, { x: 1.2, y: 1.2 }, 200, easeOutBack)
      .then(() =>
        tweenTo(text.scale as any, { x: 1, y: 1 }, 150, easeOutQuad)
      )
      .then(() => delay(400))
      .then(() =>
        Promise.all([
          tweenTo(text as any, { alpha: 0 }, 300, easeInQuad),
          tweenTo(text as any, { y: text.y - 40 }, 300, easeInQuad),
        ])
      )
      .then(() => text.destroy());
  }

  /** Spawn gold coin particles for tanuki pop */
  spawnCoinParticles(x: number, y: number, count: number) {
    // Gold coin circles
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 150 + Math.random() * 200;
      const size = 4 + Math.random() * 5;

      const g = new Graphics();

      // Coin body (gold gradient look)
      g.circle(0, 0, size).fill({ color: 0xffd700, alpha: 1 });
      g.circle(0, 0, size * 0.7).fill({ color: 0xffec80, alpha: 0.8 });

      // Small ¥ mark on larger coins
      if (size > 6 && i % 3 === 0) {
        const yenStyle = new TextStyle({
          fontFamily: "'M PLUS Rounded 1c', sans-serif",
          fontSize: size * 1.2,
          fontWeight: "900",
          fill: "#B08860",
        });
        const yen = new Text({ text: "¥", style: yenStyle });
        yen.anchor.set(0.5);
        g.addChild(yen);
      }

      g.x = x;
      g.y = y;
      this.effectContainer.addChild(g);

      particles.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100, // bias upward
        life: 0,
        maxLife: 500 + Math.random() * 300,
      });
    }

    // Sparkle stars
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 20;
      const g = new Graphics();

      // Star shape (4 points)
      const sz = 2 + Math.random() * 3;
      g.star(0, 0, 4, sz, sz * 0.4).fill({ color: 0xfffacd, alpha: 1 });

      g.x = x + Math.cos(angle) * dist;
      g.y = y + Math.sin(angle) * dist;
      this.effectContainer.addChild(g);

      particles.push({
        g,
        vx: Math.cos(angle) * 60,
        vy: Math.sin(angle) * 60 - 50,
        life: 0,
        maxLife: 350 + Math.random() * 200,
      });
    }
  }

  destroy() {
    this.destroyed = true;
    this.deselect();
    particles.forEach((p) => {
      try {
        p.g.destroy();
      } catch (_e) {
        /* ignore */
      }
    });
    particles = [];
    activeTweens = [];
    if (this.initialized) {
      try {
        this.app.destroy(true, { children: true });
      } catch (_e) {
        // PixiJS destroy can throw if not fully initialized
      }
    }
    this.sfx.dispose();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ═══════════════════════════════════════
// React Component
// ═══════════════════════════════════════
// Canvas size constants (match BOARD_W/H + PAD)
const CANVAS_W = BOARD_W + BOARD_PAD * 2;
const CANVAS_H = BOARD_H + BOARD_PAD * 2;

export function DemoScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<PuyoDemo | null>(null);
  const [score, setScore] = useState(0);
  const [chain, setChain] = useState(0);
  const [loading, setLoading] = useState(true);

  // Auto-scale canvas to fit available space
  const scaleCanvas = useCallback(() => {
    const wrapper = boardWrapperRef.current;
    const canvas = containerRef.current?.querySelector("canvas");
    if (!wrapper || !canvas) return;

    const rect = wrapper.getBoundingClientRect();
    const scaleX = rect.width / CANVAS_W;
    const scaleY = rect.height / CANVAS_H;
    const scale = Math.min(scaleX, scaleY, 1);

    canvas.style.transform = `scale(${scale})`;
    canvas.style.transformOrigin = "center center";
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const demo = new PuyoDemo();
    demoRef.current = demo;
    demo.onScoreChange = setScore;
    demo.onChainChange = setChain;

    demo
      .init(containerRef.current)
      .then(() => {
        if (!demo.destroyed) {
          setLoading(false);
          requestAnimationFrame(scaleCanvas);
        }
      })
      .catch((err) => {
        console.error("PuyoDemo init error:", err);
      });

    return () => {
      demo.destroy();
      demoRef.current = null;
    };
  }, [scaleCanvas]);

  // Observe wrapper size for responsive scaling
  useEffect(() => {
    const wrapper = boardWrapperRef.current;
    if (!wrapper || loading) return;

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(scaleCanvas);
    });
    observer.observe(wrapper);
    window.addEventListener("resize", scaleCanvas);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scaleCanvas);
    };
  }, [loading, scaleCanvas]);

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.titleAccent}>Suwa</span>Puyo
        </h1>
        <p className={styles.subtitle}>すわぷよ — MVP Demo</p>
      </div>

      {/* Score & Chain */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>SCORE</span>
          <span className={styles.statValue}>{score.toLocaleString()}</span>
        </div>
        {chain > 0 && (
          <div className={`${styles.stat} ${styles.chainStat}`}>
            <span className={styles.statLabel}>CHAIN</span>
            <span className={styles.chainValue}>🔥 x{chain}</span>
          </div>
        )}
      </div>

      {/* Game Board - flex:1 takes remaining space */}
      <div ref={boardWrapperRef} className={styles.boardWrapper}>
        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading...</p>
          </div>
        )}
        <div ref={containerRef} className={styles.boardContainer} />
      </div>

      {/* Character Info */}
      <div className={styles.charInfo}>
        {TYPES.map((type) => (
          <div key={type} className={styles.charCard}>
            <img
              src={SPRITE_PATHS[type]}
              alt={CHAR_NAMES[type]}
              className={styles.charIcon}
            />
            <div className={styles.charDetails}>
              <span className={styles.charName}>{CHAR_NAMES[type]}</span>
              <span
                className={styles.charPop}
                style={{ color: THEME_COLORS_HEX[type] }}
              >
                {MIN_POP[type]}個で消滅
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <p className={styles.instructions}>
        キャラをタップして選択 → 矢印で隣と入れ替え → つながったら消える！
      </p>
    </div>
  );
}
