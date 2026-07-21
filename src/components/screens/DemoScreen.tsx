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
import { TaisouMission } from "../../exercise/TaisouMission";
import { useTaisouMissionTimer } from "../../exercise/useTaisouMissionTimer";
import { CHARACTERS } from "../../config/characters";
import { buddyImageObjectUrl, ensureDemoBuddy, getBuddy, markSummoned } from "../../shared/buddyStore";
import { getProgress, markFirstSummoned, type PuyoSlotId } from "../../shared/progressStore";
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

const CHAR_NAMES: Record<PuyoType, string> = {
  ghost: "わのの",
  tooth: "わーわー",
  blob: "すーすー",
  tanuki: "たぬぺい",
};

const SPRITE_PATHS: Record<PuyoType, string> = {
  ghost: "/content/01_すわぷよ/02_ゲームスプライト/04_わのの/01_待機.png",
  tooth: "/content/01_すわぷよ/02_ゲームスプライト/02_わーわー/01_待機.png",
  blob: "/content/01_すわぷよ/02_ゲームスプライト/01_すーすー/01_待機.png",
  tanuki: "/content/01_すわぷよ/02_ゲームスプライト/03_たぬぺい/01_待機.png",
};

interface PuyoSkin {
  name: string;
  imageUrl: string;
  objectUrl?: string;
}

type PuyoSkinMap = Record<PuyoType, PuyoSkin>;

const DEFAULT_PUYO_SKINS: PuyoSkinMap = {
  ghost: { name: CHAR_NAMES.ghost, imageUrl: SPRITE_PATHS.ghost },
  tooth: { name: CHAR_NAMES.tooth, imageUrl: SPRITE_PATHS.tooth },
  blob: { name: CHAR_NAMES.blob, imageUrl: SPRITE_PATHS.blob },
  tanuki: { name: CHAR_NAMES.tanuki, imageUrl: SPRITE_PATHS.tanuki },
};

const SLOT_TO_TYPE: Record<PuyoSlotId, PuyoType> = {
  ghost: "ghost",
  tooth: "tooth",
  blob: "blob",
  tanuki: "tanuki",
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

function tweenObject(obj: object): Record<string, number> {
  return obj as unknown as Record<string, number>;
}

// ═══════════════════════════════════════
// Particle system
// ═══════════════════════════════════════
interface Particle {
  g: Container;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

let particles: Particle[] = [];

interface BuddyVisual {
  id: string;
  label: string;
  imageUrl: string;
  scale: number;
  shouldSummonFull: boolean;
  objectUrl?: string;
  onSummoned?: () => void;
}

interface PuyoSpriteMeta {
  row: number;
  col: number;
  type: PuyoType;
  baseY: number;
  idlePhase: number;
  animating: boolean;
  // sprite.width=CELL-4 で決まる基準スケール。キャラ画像スキンは原寸が大きく
  // 基準スケールが1でないため、選択/消去/リフィルは必ずこの基準×係数でtweenする。
  // (絶対値1.1等にtweenすると原寸1.1倍=数倍に膨張するバグの元)
  baseScaleX: number;
  baseScaleY: number;
}

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
// blob:/data: URL は pixi の Assets.load が拡張子/MIMEを判別できず
// null テクスチャを返して new Sprite() を落とす。お絵描き相棒(self)や
// data URL 画像はこのヘルパで Image 経由デコードして Texture 化する。
async function loadImageTexture(url: string): Promise<Texture> {
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    return Texture.from(img);
  }
  return Assets.load<Texture>(url);
}

// ═══════════════════════════════════════
class PuyoDemo {
  app: Application;
  board: (PuyoType | null)[][] = [];
  sprites: (Sprite | null)[][] = [];
  spriteMeta = new WeakMap<Sprite, PuyoSpriteMeta>();
  textures: Record<string, Texture> = {};
  boardContainer!: Container;
  effectContainer!: Container;
  uiContainer!: Container;
  cheerLayer!: Container;
  boardBg!: Graphics;
  buddyVisual: BuddyVisual | null;
  buddySprite: Sprite | null = null;
  buddyTexture: Texture | null = null;
  buddySpeech: Text | null = null;
  puyoSkins: PuyoSkinMap;
  lastBigCheerChain = 0;
  busy = false;
  paused = false;
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

  constructor(buddyVisual: BuddyVisual | null, puyoSkins: PuyoSkinMap) {
    this.app = new Application();
    this.buddyVisual = buddyVisual;
    this.puyoSkins = puyoSkins;
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
      try {
        this.textures[type] = await loadImageTexture(this.puyoSkins[type].imageUrl);
      } catch (error) {
        // 1体分の読込失敗でゲーム全体を落とさない。デフォルトスプライトへ退避。
        console.warn(`puyo skin load failed (${type}), fallback to default`, error);
        this.textures[type] = await loadImageTexture(SPRITE_PATHS[type]);
      }
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

    this.cheerLayer = new Container();
    this.app.stage.addChild(this.cheerLayer);
    void this.setupBuddyLayer();

    // Ticker
    this.app.ticker.add((ticker) => {
      const dt = ticker.deltaMS;
      this.time += dt;
      updateTweens(dt);
      updateParticles(dt);
      this.updateIdleAnimation();
      this.updateSelectionPulse();
      this.updateBuddyAnimation();
    });

    this.initialized = true;
  }

  async setupBuddyLayer() {
    const visual = this.buddyVisual;
    if (visual === null) {
      return;
    }
    try {
      const texture = await loadImageTexture(visual.imageUrl);
      if (this.destroyed) {
        return;
      }
      this.buddyTexture = texture;
      const sprite = new Sprite({ texture });
      sprite.anchor.set(0.5, 1);
      const maxSize = visual.id === "self" ? 92 : 72;
      const ratio = Math.min(maxSize / sprite.texture.width, maxSize / sprite.texture.height, 1.2) * visual.scale;
      sprite.scale.set(ratio);
      sprite.x = BOARD_PAD + BOARD_W - 38;
      sprite.y = BOARD_PAD + BOARD_H - 12;
      sprite.alpha = visual.shouldSummonFull ? 0 : 1;
      this.buddySprite = sprite;
      this.cheerLayer.addChild(sprite);
      if (visual.shouldSummonFull) {
        await this.playSummon();
        visual.onSummoned?.();
      }
    } catch (error) {
      console.debug("buddy visual load failed", error);
    }
  }

  updateBuddyAnimation() {
    const sprite = this.buddySprite;
    if (sprite === null) {
      return;
    }
    sprite.y = BOARD_PAD + BOARD_H - 12 + Math.sin(this.time * 0.003) * 5;
    sprite.rotation = Math.sin(this.time * 0.002) * 0.045;
  }

  async playSummon() {
    const sprite = this.buddySprite;
    if (sprite === null) {
      return;
    }
    const targetY = BOARD_PAD + BOARD_H - 12;
    const targetX = BOARD_PAD + BOARD_W - 38;
    const shadow = new Graphics();
    shadow.ellipse(targetX, targetY - 4, 34, 8).fill({ color: 0x5a4630, alpha: 0.18 });
    shadow.alpha = 0;
    this.cheerLayer.addChildAt(shadow, 0);
    sprite.y = -40;
    sprite.x = targetX - 10;
    sprite.alpha = 0;
    spawnParticles(this.cheerLayer, targetX, 42, 0xffd166, 14);
    await Promise.all([
      tweenTo(sprite as unknown as Record<string, number>, { y: targetY, x: targetX, alpha: 1 }, 800, easeOutQuad),
      tweenTo(shadow as unknown as Record<string, number>, { alpha: 1 }, 300, easeOutQuad),
    ]);
    this.sfx.land();
    const baseScaleX = sprite.scale.x;
    const baseScaleY = sprite.scale.y;
    await tweenTo(sprite.scale as unknown as Record<string, number>, { x: baseScaleX * 1.16, y: baseScaleY * 0.82 }, 100, easeOutQuad);
    await tweenTo(sprite.scale as unknown as Record<string, number>, { x: baseScaleX * 0.9, y: baseScaleY * 1.18 }, 100, easeOutBack);
    await tweenTo(sprite.scale as unknown as Record<string, number>, { x: baseScaleX, y: baseScaleY }, 120, easeOutBounce);
    this.showBuddySpeech("あそぼ！");
    await delay(600);
    shadow.destroy();
  }

  showBuddySpeech(text: string) {
    if (this.buddySpeech !== null) {
      this.buddySpeech.destroy();
      this.buddySpeech = null;
    }
    const speech = new Text({
      text,
      style: new TextStyle({
        fontFamily: "'M PLUS Rounded 1c', sans-serif",
        fontSize: 20,
        fontWeight: "900",
        fill: "#4a3728",
        stroke: { color: "#ffffff", width: 5 },
      }),
    });
    speech.anchor.set(0.5);
    speech.x = BOARD_PAD + BOARD_W - 92;
    speech.y = BOARD_PAD + BOARD_H - 96;
    speech.alpha = 0;
    this.buddySpeech = speech;
    this.cheerLayer.addChild(speech);
    tweenTo(speech as unknown as Record<string, number>, { alpha: 1, y: speech.y - 8 }, 120, easeOutQuad)
      .then(() => delay(460))
      .then(() => tweenTo(speech as unknown as Record<string, number>, { alpha: 0 }, 180, easeInQuad))
      .then(() => {
        speech.destroy();
        if (this.buddySpeech === speech) {
          this.buddySpeech = null;
        }
      });
  }

  cheerBuddy(chain: number) {
    const sprite = this.buddySprite;
    if (sprite === null) {
      return;
    }
    if (chain >= 2) {
      if (this.lastBigCheerChain === chain) {
        return;
      }
      this.lastBigCheerChain = chain;
      const baseScaleX = sprite.scale.x;
      const baseScaleY = sprite.scale.y;
      spawnParticles(this.cheerLayer, sprite.x, sprite.y - 48, 0xffd166, Math.min(10 + chain * 3, 24));
      this.showBuddySpeech("すごい！");
      void tweenTo(sprite as unknown as Record<string, number>, { y: sprite.y - 46 }, 140, easeOutQuad)
        .then(() => tweenTo(sprite as unknown as Record<string, number>, { y: BOARD_PAD + BOARD_H - 12 }, 260, easeOutBounce));
      void tweenTo(sprite.scale as unknown as Record<string, number>, { x: baseScaleX * 1.18, y: baseScaleY * 1.18 }, 120, easeOutBack)
        .then(() => tweenTo(sprite.scale as unknown as Record<string, number>, { x: baseScaleX, y: baseScaleY }, 180, easeOutQuad));
      return;
    }
    void tweenTo(sprite as unknown as Record<string, number>, { y: sprite.y - 18 }, 80, easeOutQuad)
      .then(() => tweenTo(sprite as unknown as Record<string, number>, { y: BOARD_PAD + BOARD_H - 12 }, 140, easeOutBounce));
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

  updateSpriteMeta(sprite: Sprite | null, patch: Partial<PuyoSpriteMeta>) {
    if (sprite === null) {
      return;
    }
    const current = this.spriteMeta.get(sprite);
    if (current === undefined) {
      return;
    }
    this.spriteMeta.set(sprite, { ...current, ...patch });
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
      texture: this.textures[type] ?? Texture.WHITE,
    });
    sprite.anchor.set(0.5);
    sprite.x = this.cellX(col);
    sprite.y = this.cellY(row);
    sprite.width = CELL - 4;
    sprite.height = CELL - 4;
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    sprite.alpha = 0;

    this.spriteMeta.set(sprite, {
      row,
      col,
      type,
      baseY: sprite.y,
      idlePhase: Math.random() * Math.PI * 2,
      animating: false,
      baseScaleX: sprite.scale.x,
      baseScaleY: sprite.scale.y,
    });

    // Click handler - reads current position from metadata (not closure)
    sprite.on("pointerdown", () => {
      const meta = this.spriteMeta.get(sprite);
      if (meta === undefined) {
        return;
      }
      const currentRow = meta.row;
      const currentCol = meta.col;
      this.handleClick(currentRow, currentCol);
    });

    this.boardContainer.addChild(sprite);

    // Fade in
    tweenTo(
      tweenObject(sprite),
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
        const meta = sprite === null ? undefined : this.spriteMeta.get(sprite);
        if (!sprite || meta === undefined || meta.animating) continue;

        const phase = meta.idlePhase;
        const baseY = meta.baseY;
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
    if (this.busy || this.paused) return;

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

    // Scale up selected sprite slightly (基準スケール×1.1。絶対1.1は膨張バグ)
    const sprite = this.sprites[row][col];
    if (sprite) {
      const meta = this.spriteMeta.get(sprite);
      const bx = meta?.baseScaleX ?? sprite.scale.x;
      const by = meta?.baseScaleY ?? sprite.scale.y;
      tweenTo(tweenObject(sprite.scale), { x: bx * 1.1, y: by * 1.1 }, 150, easeOutBack);
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

    // Scale back selected sprite (基準スケールに戻す。絶対1は膨張バグ)
    if (this.selectedRow >= 0 && this.selectedCol >= 0) {
      const sprite = this.sprites[this.selectedRow]?.[this.selectedCol];
      if (sprite) {
        const meta = this.spriteMeta.get(sprite);
        const bx = meta?.baseScaleX ?? 1;
        const by = meta?.baseScaleY ?? 1;
        tweenTo(tweenObject(sprite.scale), { x: bx, y: by }, 150, easeOutQuad);
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
    this.updateSpriteMeta(this.sprites[r1][c1], { row: r1, col: c1, baseY: this.cellY(r1) });
    this.updateSpriteMeta(this.sprites[r2][c2], { row: r2, col: c2, baseY: this.cellY(r2) });

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

      this.updateSpriteMeta(this.sprites[r1][c1], { row: r1, col: c1, baseY: this.cellY(r1) });
      this.updateSpriteMeta(this.sprites[r2][c2], { row: r2, col: c2, baseY: this.cellY(r2) });

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
      this.updateSpriteMeta(sprite1, { animating: true });
      promises.push(
        tweenTo(
          tweenObject(sprite1),
          { x: this.cellX(c2), y: this.cellY(r2) },
          200,
          easeOutQuad
        ).then(() => {
          this.updateSpriteMeta(sprite1, { animating: false });
        })
      );
    }

    if (sprite2) {
      this.updateSpriteMeta(sprite2, { animating: true });
      promises.push(
        tweenTo(
          tweenObject(sprite2),
          { x: this.cellX(c1), y: this.cellY(r1) },
          200,
          easeOutQuad
        ).then(() => {
          this.updateSpriteMeta(sprite2, { animating: false });
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

    // Check character-specific sounds
    const hasTanuki = clearable.some((g) => g.type === "tanuki");
    const hasTooth = clearable.some((g) => g.type === "tooth");
    const hasBlob = clearable.some((g) => g.type === "blob");
    if (hasTanuki) {
      this.sfx.coin();
    } else if (hasTooth) {
      this.sfx.toothPop();
    } else if (hasBlob) {
      this.sfx.blobPop();
    } else {
      this.sfx.pop(this.chainCount);
    }

    // Phase 1: Flash white + scale up
    const flashPromises = allCells.map(({ row, col }) => {
      const sprite = this.sprites[row][col];
      if (!sprite) return Promise.resolve();
      this.updateSpriteMeta(sprite, { animating: true });
      sprite.tint = 0xffffff;
      const meta = this.spriteMeta.get(sprite);
      const bx = meta?.baseScaleX ?? sprite.scale.x;
      const by = meta?.baseScaleY ?? sprite.scale.y;
      return tweenTo(
        tweenObject(sprite.scale),
        { x: bx * 1.3, y: by * 1.3 },
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
      } else if (type === "blob") {
        // Strawberry burst for blob (すーすー)!
        this.spawnStrawberryParticles(
          this.cellX(col),
          this.cellY(row),
          10
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
        tweenTo(tweenObject(sprite.scale), { x: 0, y: 0 }, 250, easeInQuad),
        tweenTo(tweenObject(sprite), { alpha: 0 }, 250, easeInQuad),
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
      this.cheerBuddy(this.chainCount);
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
      this.updateSpriteMeta(sprite, { row: toR, baseY: this.cellY(toR) });

      const distance = toR - fromR;
      const duration = 100 + distance * 60;

      return tweenTo(
        tweenObject(sprite),
        { y: this.cellY(toR) },
        duration,
        easeInQuad
      ).then(() => {
        this.sfx.land();
        this.updateSpriteMeta(sprite, { animating: true });
        const meta = this.spriteMeta.get(sprite);
        const bx = meta?.baseScaleX ?? sprite.scale.x;
        const by = meta?.baseScaleY ?? sprite.scale.y;
        return tweenTo(
          tweenObject(sprite.scale),
          { x: bx * 1.2, y: by * 0.8 },
          80,
          easeOutQuad
        )
          .then(() =>
            tweenTo(
              tweenObject(sprite.scale),
              { x: bx * 0.9, y: by * 1.1 },
              100,
              easeOutQuad
            )
          )
          .then(() =>
            tweenTo(
              tweenObject(sprite.scale),
              { x: bx, y: by },
              120,
              easeOutBounce
            )
          )
          .then(() => {
            this.updateSpriteMeta(sprite, { animating: false });
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
      const bx = sprite.scale.x; // 基準スケール(width=CELL-4で決定)
      const by = sprite.scale.y;
      sprite.alpha = 0;
      sprite.y = -CELL;
      sprite.scale.set(bx * 0.6, by * 0.6); // 基準×0.6から入る。絶対0.6→1は膨張バグ
      this.sprites[row][col] = sprite;

      return delay(i * 30).then(() =>
        Promise.all([
          tweenTo(
            tweenObject(sprite),
            { y: this.cellY(row), alpha: 1 },
            350,
            easeOutBounce
          ),
          tweenTo(tweenObject(sprite.scale), { x: bx, y: by }, 350, easeOutBack),
        ]).then(() => {
          this.updateSpriteMeta(sprite, { baseY: this.cellY(row), animating: false });
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

    tweenTo(tweenObject(text), { alpha: 1 }, 150, easeOutQuad);
    tweenTo(tweenObject(text.scale), { x: 1.2, y: 1.2 }, 200, easeOutBack)
      .then(() =>
        tweenTo(tweenObject(text.scale), { x: 1, y: 1 }, 150, easeOutQuad)
      )
      .then(() => delay(400))
      .then(() =>
        Promise.all([
          tweenTo(tweenObject(text), { alpha: 0 }, 300, easeInQuad),
          tweenTo(tweenObject(text), { y: text.y - 40 }, 300, easeInQuad),
        ])
      )
      .then(() => text.destroy());
  }

  /** Spawn money emoji particles for tanuki pop 💰🪙💵 */
  spawnCoinParticles(x: number, y: number, count: number) {
    const moneyEmoji = ["💰", "🪙", "💵", "💲", "$", "💰", "🪙", "💵"];

    // Big money emoji flying outward
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 120 + Math.random() * 180;

      const g = new Container();

      const emoji = moneyEmoji[i % moneyEmoji.length];
      const fontSize = 16 + Math.random() * 14;

      const textObj = new Text({
        text: emoji,
        style: new TextStyle({
          fontSize,
          fontFamily: "sans-serif",
        }),
      });
      textObj.anchor.set(0.5);
      g.addChild(textObj);

      g.x = x;
      g.y = y;
      this.effectContainer.addChild(g);

      particles.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        life: 0,
        maxLife: 700 + Math.random() * 400,
      });
    }

    // Extra: floating "+$" text rising up
    const plusText = new Text({
      text: "+$$$",
      style: new TextStyle({
        fontFamily: "'M PLUS Rounded 1c', sans-serif",
        fontSize: 22,
        fontWeight: "900",
        fill: "#FFD700",
        stroke: { color: "#B08860", width: 3 },
      }),
    });
    plusText.anchor.set(0.5);
    plusText.x = x;
    plusText.y = y;
    this.effectContainer.addChild(plusText);

    tweenTo(tweenObject(plusText), { y: y - 60, alpha: 0 }, 900, easeOutQuad).then(
      () => plusText.destroy()
    );
  }

  /** 🍓 Strawberry burst particles for blob (すーすー) */
  spawnStrawberryParticles(x: number, y: number, count: number) {
    const berryEmoji = ["🍓", "🍓", "💕", "🍓", "❤️", "🍓", "💗", "🍓"];

    // Strawberries flying outward in burst pattern
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 100 + Math.random() * 200;

      const g = new Container();

      const emoji = berryEmoji[i % berryEmoji.length];
      const fontSize = 14 + Math.random() * 12;

      const textObj = new Text({
        text: emoji,
        style: new TextStyle({
          fontSize,
          fontFamily: "sans-serif",
        }),
      });
      textObj.anchor.set(0.5);
      g.addChild(textObj);

      g.x = x;
      g.y = y;
      // Start small and burst outward
      g.scale.set(0.3);
      this.effectContainer.addChild(g);

      // Scale up quickly for "burst" feel
      tweenTo(tweenObject(g.scale), { x: 1.2, y: 1.2 }, 150, easeOutBack);

      particles.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        life: 0,
        maxLife: 600 + Math.random() * 400,
      });
    }

    // Extra: floating "💕" heart rising up
    const heartText = new Text({
      text: "💕",
      style: new TextStyle({
        fontFamily: "'M PLUS Rounded 1c', sans-serif",
        fontSize: 24,
      }),
    });
    heartText.anchor.set(0.5);
    heartText.x = x;
    heartText.y = y;
    this.effectContainer.addChild(heartText);

    tweenTo(tweenObject(heartText), { y: y - 65, alpha: 0 }, 900, easeOutQuad).then(
      () => heartText.destroy()
    );
  }

  pauseForMission(): void {
    this.paused = true;
    this.app.ticker.stop();
  }

  resumeAfterMission(): void {
    if (this.destroyed) return;
    this.paused = false;
    this.app.ticker.start();
  }

  destroy() {
    this.destroyed = true;
    this.deselect();
    particles.forEach((p) => {
      try {
        p.g.destroy();
      } catch {
        /* ignore */
      }
    });
    particles = [];
    activeTweens = [];
    if (this.buddySpeech !== null) {
      this.buddySpeech.destroy();
      this.buddySpeech = null;
    }
    if (this.buddySprite !== null) {
      this.buddySprite.destroy();
      this.buddySprite = null;
    }
    if (this.buddyTexture !== null) {
      this.buddyTexture.destroy(true);
      this.buddyTexture = null;
    }
    if (this.buddyVisual?.objectUrl !== undefined) {
      URL.revokeObjectURL(this.buddyVisual.objectUrl);
    }
    for (const skin of Object.values(this.puyoSkins)) {
      if (skin.objectUrl !== undefined) {
        URL.revokeObjectURL(skin.objectUrl);
      }
    }
    if (this.initialized) {
      try {
        this.app.destroy(true, { children: true });
      } catch {
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

export function DemoScreen({ taisouRequested = false, onTaisouRequestHandled }: { taisouRequested?: boolean; onTaisouRequestHandled?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<PuyoDemo | null>(null);
  const [score, setScore] = useState(0);
  const [chain, setChain] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showTaisou, setShowTaisou] = useState(() => {
    return false;
  });
  const [selectionVersion, setSelectionVersion] = useState(0);
  const [gameError, setGameError] = useState<string | null>(null);
  const missionVisible = showTaisou || taisouRequested;
  const missionVisibleRef = useRef(missionVisible);
  const openTaisouMission = useCallback(() => setShowTaisou(true), []);

  useEffect(() => {
    missionVisibleRef.current = missionVisible;
  }, [missionVisible]);

  // プレイ中60秒ごと。overlay中・画面外・読み込み/キャラ選択中は時計を進めない。
  useTaisouMissionTimer(!missionVisible && !loading, openTaisouMission);

  useEffect(() => {
    const demo = demoRef.current;
    if (missionVisible) demo?.pauseForMission();
    else demo?.resumeAfterMission();
  }, [missionVisible]);

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

    let cancelled = false;
    let demo: PuyoDemo | null = null;
    async function prepareVisuals(): Promise<{ buddyVisual: BuddyVisual | null; skins: PuyoSkinMap }> {
      const progress = getProgress();
      const buddy = await getBuddy();
      const selfRecord = buddy ?? (Object.values(progress.selected_puyo_character_ids).includes("self") || progress.selected_buddy === "self" ? await ensureDemoBuddy() : null);
      const skins: PuyoSkinMap = { ...DEFAULT_PUYO_SKINS };
      for (const [slotId, characterId] of Object.entries(progress.selected_puyo_character_ids) as [PuyoSlotId, string][]) {
        const type = SLOT_TO_TYPE[slotId];
        if (characterId === "self" && selfRecord !== null) {
          const objectUrl = buddyImageObjectUrl(selfRecord);
          skins[type] = {
            name: selfRecord.label,
            imageUrl: objectUrl,
            objectUrl,
          };
          continue;
        }
        const character = CHARACTERS.find((item) => item.id === characterId);
        if (character !== undefined) {
          skins[type] = { name: character.name, imageUrl: character.image };
        }
      }

      if (progress.selected_buddy === "self") {
        const record = selfRecord ?? (await ensureDemoBuddy());
        const objectUrl = buddyImageObjectUrl(record);
        return {
          skins,
          buddyVisual: {
            id: "self",
            label: record.label,
            imageUrl: objectUrl,
            scale: record.scale,
            shouldSummonFull: progress.first_summoned_at === undefined && record.firstSummonedAt === undefined,
            objectUrl,
            onSummoned: () => {
              markFirstSummoned();
              void markSummoned();
            },
          },
        };
      }
      const character = CHARACTERS.find((item) => item.id === progress.selected_buddy);
      if (character === undefined) {
        return { buddyVisual: null, skins };
      }
      return {
        skins,
        buddyVisual: {
          id: character.id,
          label: character.name,
          imageUrl: character.image,
          scale: 1,
          shouldSummonFull: false,
        },
      };
    }

    void prepareVisuals().then(({ buddyVisual, skins }) => {
      if (cancelled || containerRef.current === null) {
        if (buddyVisual?.objectUrl !== undefined) {
          URL.revokeObjectURL(buddyVisual.objectUrl);
        }
        for (const skin of Object.values(skins)) {
          if (skin.objectUrl !== undefined) {
            URL.revokeObjectURL(skin.objectUrl);
          }
        }
        return;
      }
      setGameError(null);
      demo = new PuyoDemo(buddyVisual, skins);
      demoRef.current = demo;
      demo.onScoreChange = setScore;
      demo.onChainChange = setChain;

      demo
        .init(containerRef.current)
        .then(() => {
          const currentDemo = demo;
          if (currentDemo !== null && !currentDemo.destroyed) {
            if (missionVisibleRef.current) currentDemo.pauseForMission();
            setLoading(false);
            requestAnimationFrame(scaleCanvas);
          }
        })
        .catch((err: unknown) => {
          console.error("PuyoDemo init error:", err);
          setGameError(err instanceof Error ? err.message : "game_init_failed");
          setLoading(false);
        });
    });

    return () => {
      cancelled = true;
      demo?.destroy();
      demoRef.current = null;
    };
  }, [scaleCanvas, selectionVersion]);

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

  useEffect(() => {
    if (!loading) {
      requestAnimationFrame(scaleCanvas);
    }
  }, [loading, scaleCanvas]);

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.viewPane} ${styles.viewPaneActive}`}>
          {/* Score & Chain */}
          <div className={styles.statsBar}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>SCORE</span>
              <span className={styles.statValue}>{score.toLocaleString()}</span>
            </div>
            {chain > 0 && (
              <div className={`${styles.stat} ${styles.chainStat}`}>
                <span className={styles.statLabel}>CHAIN</span>
                <span className={styles.chainValue}>x{chain}</span>
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
            {gameError !== null && (
              <div className={styles.loading}>
                <p>ゲームの初期化に失敗しました</p>
                <button type="button" onClick={() => {
                  setGameError(null);
                  setLoading(true);
                  setSelectionVersion((current) => current + 1);
                }}>
                  もう一度読み込む
                </button>
              </div>
            )}
            <div ref={containerRef} className={styles.boardContainer} />
          </div>

      </div>
      {missionVisible ? <TaisouMission onComplete={() => {
        setShowTaisou(false);
        onTaisouRequestHandled?.();
      }} onSkip={() => {
        setShowTaisou(false);
        onTaisouRequestHandled?.();
      }} /> : null}
    </div>
  );
}
