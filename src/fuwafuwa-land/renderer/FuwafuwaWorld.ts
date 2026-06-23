import { Application, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import type { FuwafuwaConfig } from "../config";
import type { Artwork, DisplayState } from "../types";
import { createBody, type MotionBody, updateBody } from "./artworkMotion";
import { SAMPLE_CHARACTERS } from "./sampleCharacters";

interface WorldItem {
  id: string;
  container: Container;
  body: MotionBody;
  kind: "artwork" | "sample";
  artwork?: Artwork;
  texture?: Texture;
  featured?: boolean;
}

interface WaawaaRainItem {
  sprite: Sprite;
  body: MotionBody;
  targetY: number;
  spinSpeed: number;
  scale: number;
  landed: boolean;
}

const WAAWAA_SAMPLE_ID = "sample-tooth";
const SECRET_MODE_TEXT_SPIN_MS = 1000;
const SECRET_MODE_TEXT_HOLD_MS = 2000;

function isSampleId(id: string): boolean {
  return id.startsWith("sample-");
}

export class FuwafuwaWorld {
  private app: Application | null = null;
  private readonly items = new Map<string, WorldItem>();
  private readonly loadingIds = new Set<string>();
  private readonly config: FuwafuwaConfig;
  private background: Sprite | null = null;
  private paused = false;
  private fpsListener: ((fps: number) => void) | null = null;
  private waawaaTapCount = 0;
  private lastWaawaaTapAt = 0;
  private waawaaMode = false;
  private readonly waawaaAudio: HTMLAudioElement;
  private readonly waawaaRain: WaawaaRainItem[] = [];

  constructor(config: FuwafuwaConfig) {
    this.config = config;
    this.waawaaAudio = new Audio(config.secretMode.audioUrl);
    this.waawaaAudio.preload = "auto";
  }

  async mount(parent: HTMLElement): Promise<void> {
    const app = new Application();
    await app.init({ resizeTo: parent, background: this.config.background.color, antialias: true });
    parent.appendChild(app.canvas);
    if (this.config.background.imageUrl !== undefined) {
      const texture = await this.loadTexture(this.config.background.imageUrl);
      const background = new Sprite(texture);
      background.anchor.set(0.5);
      app.stage.addChild(background);
      this.background = background;
      this.layoutBackground();
    }
    app.ticker.add((ticker) => {
      this.tick(ticker.deltaMS);
      this.fpsListener?.(app.ticker.FPS);
    });
    this.app = app;
  }

  destroy(): void {
    const canvas = this.app?.canvas;
    this.background?.destroy();
    this.background = null;
    this.clearWaawaaRain();
    this.items.forEach((item) => item.container.destroy({ children: true }));
    this.items.clear();
    this.loadingIds.clear();
    this.app?.destroy(true);
    canvas?.parentElement?.removeChild(canvas);
    this.app = null;
  }

  onFps(listener: (fps: number) => void): void {
    this.fpsListener = listener;
  }

  async sync(artworks: Artwork[], state: DisplayState, getImageURL: (id: string) => Promise<string>): Promise<void> {
    if (this.app === null) {
      return;
    }
    this.paused = state.mode === "paused";
    const ids = state.visibleArtworkIds.slice(0, state.maxVisibleCount);
    const visible = new Set(ids);
    this.items.forEach((item, id) => {
      if (!visible.has(id) && !id.startsWith("sample-")) {
        this.app?.stage.removeChild(item.container);
        item.container.destroy({ children: true });
        this.items.delete(id);
      }
    });
    this.ensureSamples();
    if (ids.length === 0) {
      return;
    }
    await Promise.all(
      ids.map(async (id) => {
        if (this.items.has(id) || this.loadingIds.has(id)) {
          return;
        }
        this.loadingIds.add(id);
        const artwork = artworks.find((item) => item.id === id);
        if (artwork === undefined) {
          this.loadingIds.delete(id);
          return;
        }
        this.addPlaceholder(id, artwork, state.featuredArtworkId === id);
        try {
          const url = await getImageURL(id);
          const texture = await this.loadTexture(url);
          this.addSprite(id, texture, artwork, state.featuredArtworkId === id);
        } catch {
          this.addPlaceholder(id, artwork, state.featuredArtworkId === id);
        } finally {
          this.loadingIds.delete(id);
        }
      }),
    );
    this.items.forEach((item, id) => {
      if (isSampleId(id)) {
        item.container.alpha = 0.92;
        item.container.scale.set(0.92);
        return;
      }
      const featured = state.featuredArtworkId === id;
      item.container.alpha = state.featuredArtworkId !== undefined && !featured ? 0.72 : 1;
      const artwork = artworks.find((candidate) => candidate.id === id);
      item.artwork = artwork;
      item.featured = featured;
      const displayScale = artwork?.displayScale ?? 1;
      item.container.scale.set((featured ? 2.2 : 1.7) * displayScale);
    });
  }

  private addSprite(id: string, texture: Texture, artwork: Artwork, featured: boolean): void {
    if (this.app === null) {
      return;
    }
    const current = this.items.get(id);
    if (current !== undefined) {
      current.artwork = artwork;
      current.texture = texture;
      current.featured = featured;
      this.populateSprite(current.container, texture, artwork, featured);
      return;
    }
    if (texture.width < 12 || texture.height < 12) {
      this.addPlaceholder(id, artwork, featured);
      return;
    }
    const container = new Container();
    this.populateSprite(container, texture, artwork, featured);
    container.scale.set((featured ? 2.2 : 1.7) * artwork.displayScale);
    this.app.stage.addChild(container);
    this.items.set(id, { id, container, body: this.createArtworkBody(), kind: "artwork", artwork, texture, featured });
  }

  private populateSprite(container: Container, texture: Texture, artwork: Artwork, featured: boolean): void {
    container.removeChildren().forEach((child) => child.destroy({ children: true }));
    if (this.waawaaMode) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.scale.set((featured ? 250 : 190) / Math.max(texture.width, texture.height, 1));
      container.addChild(sprite);
      void this.replaceArtworkSpriteWithWaawaa(sprite, featured);
      return;
    }
    const card = new Graphics().roundRect(-108, -88, 216, 176, this.config.card.cornerRadius).fill(0xffffff).stroke({ color: 0xb7d7e8, width: 4 });
    const sprite = new Sprite(texture);
    const label = new Text({ text: artwork.givenName ?? artwork.displayLabel, style: { fill: 0x223344, fontSize: 20, fontWeight: "800" } });
    sprite.anchor.set(0.5);
    const maxEdge = featured ? 260 : 190;
    const textureEdge = Math.max(texture.width, texture.height, 1);
    const scale = maxEdge / textureEdge;
    sprite.scale.set(scale);
    label.anchor.set(0.5, 0);
    label.y = Math.min(88, texture.height * scale * 0.5 + 10);
    container.addChild(card, sprite, label);
  }

  private async replaceArtworkSpriteWithWaawaa(sprite: Sprite, featured: boolean): Promise<void> {
    const waawaaSample = SAMPLE_CHARACTERS.find((candidate) => candidate.id === WAAWAA_SAMPLE_ID);
    if (waawaaSample === undefined) {
      return;
    }
    try {
      const texture = await this.loadTexture(waawaaSample.imageUrl);
      if (!this.waawaaMode || sprite.destroyed) {
        return;
      }
      sprite.texture = texture;
      sprite.scale.set((featured ? 250 : 190) / Math.max(texture.width, texture.height, 1));
    } catch {
      return;
    }
  }

  private async loadTexture(url: string): Promise<Texture> {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return Texture.from(image);
  }

  private addPlaceholder(id: string, artwork: Artwork, featured: boolean): void {
    if (this.app === null) {
      return;
    }
    if (this.items.has(id)) {
      return;
    }
    const container = new Container();
    if (this.waawaaMode) {
      void this.populateSample(container, WAAWAA_SAMPLE_ID);
      container.scale.set((featured ? 2.2 : 1.7) * artwork.displayScale);
      this.app.stage.addChild(container);
      this.items.set(id, { id, container, body: this.createArtworkBody(), kind: "artwork", artwork, featured });
      return;
    }
    const card = new Graphics().roundRect(-96, -80, 192, 160, this.config.card.cornerRadius).fill(0xfffbeb).stroke({ color: 0xffb703, width: 4 });
    const mark = new Text({ text: artwork.displayLabel, style: { fill: 0x3a2f23, fontSize: 24, fontWeight: "800" } });
    const label = new Text({ text: artwork.givenName ?? "ふわふわ", style: { fill: 0x3a2f23, fontSize: 18, fontWeight: "700" } });
    mark.anchor.set(0.5);
    label.anchor.set(0.5);
    label.y = 42;
    container.addChild(card, mark, label);
    container.scale.set((featured ? 2.2 : 1.7) * artwork.displayScale);
    this.app.stage.addChild(container);
    this.items.set(id, { id, container, body: this.createArtworkBody(), kind: "artwork", artwork, featured });
  }

  private ensureSamples(): void {
    if (this.app === null) {
      return;
    }
    const hasAllSamples = SAMPLE_CHARACTERS.every((sample) => this.items.has(sample.id));
    if (hasAllSamples) {
      return;
    }
    SAMPLE_CHARACTERS.forEach((sample) => {
      if (this.items.has(sample.id)) {
        return;
      }
      const container = new Container();
      this.applySampleTapBehavior(container, sample.id);
      this.app?.stage.addChild(container);
      if (this.app !== null) {
        this.items.set(sample.id, { id: sample.id, container, body: createBody(this.app.screen.width, this.app.screen.height, this.config), kind: "sample" });
      }
      void this.populateSample(container, sample.id);
    });
  }

  private async populateSample(container: Container, sampleId: string): Promise<void> {
    container.removeChildren().forEach((child) => child.destroy({ children: true }));
    const sample = SAMPLE_CHARACTERS.find((candidate) => candidate.id === sampleId) ?? SAMPLE_CHARACTERS[0];
    const visualSample = this.waawaaMode ? SAMPLE_CHARACTERS.find((candidate) => candidate.id === WAAWAA_SAMPLE_ID) ?? sample : sample;
    if (!this.waawaaMode) {
      const text = new Text({ text: sample.label, style: { fill: 0x283747, fontSize: 22, fontWeight: "800" } });
      text.anchor.set(0.5, 0);
      text.y = 62;
      container.addChild(text);
    }
    try {
      const texture = await this.loadTexture(visualSample.imageUrl);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      const scale = (this.waawaaMode ? this.getWaawaaCharacterSize("sample") : 112) / Math.max(texture.width, texture.height, 1);
      sprite.scale.set(scale);
      container.addChildAt(sprite, 0);
    } catch {
      const graphics = new Graphics().roundRect(-60, -44, 120, 88, 28).fill(0xffffff).stroke({ color: 0xffb703, width: 4 });
      container.addChildAt(graphics, 0);
    }
  }

  private handleWaawaaTap(): void {
    const now = performance.now();
    this.waawaaTapCount = now - this.lastWaawaaTapAt > this.config.secretMode.tapWindowMs ? 1 : this.waawaaTapCount + 1;
    this.lastWaawaaTapAt = now;
    this.playWaawaaAudio();
    if (this.waawaaTapCount < this.config.secretMode.tapCount) {
      return;
    }
    this.waawaaTapCount = 0;
    this.waawaaMode = !this.waawaaMode;
    if (!this.waawaaMode) {
      this.clearWaawaaRain();
    }
    this.refreshItemsForWaawaaMode();
    void this.showWaawaaModeBurst();
  }

  private playWaawaaAudio(): void {
    this.waawaaAudio.currentTime = 0;
    void this.waawaaAudio.play().catch(() => undefined);
  }

  private refreshItemsForWaawaaMode(): void {
    this.items.forEach((item) => {
      if (item.kind === "sample") {
        this.applySampleTapBehavior(item.container, item.id);
        void this.populateSample(item.container, item.id);
        return;
      }
      if (item.artwork !== undefined && item.texture !== undefined) {
        this.populateSprite(item.container, item.texture, item.artwork, item.featured ?? false);
      }
    });
  }

  private applySampleTapBehavior(container: Container, sampleId: string): void {
    container.removeAllListeners("pointertap");
    const canTap = sampleId === this.config.secretMode.triggerSampleId || this.waawaaMode;
    container.eventMode = canTap ? "static" : "none";
    container.cursor = canTap ? "pointer" : "default";
    if (canTap) {
      container.on("pointertap", () => this.handleWaawaaTap());
    }
  }

  private async showWaawaaModeBurst(): Promise<void> {
    if (this.app === null) {
      return;
    }
    const text = new Text({
      text: this.config.secretMode.modeText,
      style: { fill: 0xfff7d6, fontSize: this.getSecretModeTextSize(), fontWeight: "900", stroke: { color: 0xe11d48, width: 8 } },
    });
    text.anchor.set(0.5);
    text.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
    const textFitScale = Math.min(1, (this.app.screen.width * 0.88) / Math.max(text.width, 1));
    this.app.stage.addChild(text);
    const turningOn = this.waawaaMode;
    if (turningOn) {
      this.growAllCharacters();
    }
    const startedAt = performance.now();
    const animate = () => {
      if (this.app === null) {
        return;
      }
      const elapsed = performance.now() - startedAt;
      const spinProgress = Math.min(1, elapsed / SECRET_MODE_TEXT_SPIN_MS);
      text.rotation = spinProgress < 1 ? spinProgress * Math.PI * 6 : 0;
      const animatedScale = spinProgress < 1 ? 0.35 + Math.sin(spinProgress * Math.PI) * 1.4 + spinProgress * 0.7 : 2.1;
      text.scale.set(animatedScale * textFitScale);
      text.alpha = 1;
      if (elapsed >= SECRET_MODE_TEXT_SPIN_MS + SECRET_MODE_TEXT_HOLD_MS) {
        this.app.ticker.remove(animate);
        text.destroy();
        if (turningOn && this.waawaaMode) {
          void this.spawnWaawaaRain();
        }
      }
    };
    this.app.ticker.add(animate);
  }

  private growAllCharacters(): void {
    if (this.app === null) {
      return;
    }
    const startedAt = performance.now();
    const baseScales = Array.from(this.items.values()).map((item) => ({ item, scale: item.container.scale.x }));
    const animate = () => {
      if (this.app === null) {
        return;
      }
      const progress = Math.min(1, (performance.now() - startedAt) / 1100);
      const punch = Math.sin(progress * Math.PI) * 0.32 + progress * 0.16;
      baseScales.forEach(({ item, scale }) => item.container.scale.set(scale * (1 + punch)));
      if (progress >= 1) {
        this.app.ticker.remove(animate);
      }
    };
    this.app.ticker.add(animate);
  }

  private async spawnWaawaaRain(): Promise<void> {
    if (this.app === null || !this.waawaaMode) {
      return;
    }
    this.clearWaawaaRain();
    const waawaaSample = SAMPLE_CHARACTERS.find((candidate) => candidate.id === WAAWAA_SAMPLE_ID);
    if (waawaaSample === undefined) {
      return;
    }
    try {
      const texture = await this.loadTexture(waawaaSample.imageUrl);
      if (this.app === null || !this.waawaaMode) {
        return;
      }
      const width = this.app.screen.width;
      const height = this.app.screen.height;
      for (let index = 0; index < this.config.secretMode.rainCount; index += 1) {
        const sprite = new Sprite(texture);
        const scale = (this.getWaawaaCharacterSize("rain") * (0.72 + Math.random() * 0.42)) / Math.max(texture.width, texture.height, 1);
        const x = width * (0.08 + Math.random() * 0.84);
        const targetY = height * (0.16 + Math.random() * 0.62);
        sprite.anchor.set(0.5);
        sprite.position.set(x, -80 - Math.random() * height * 0.55);
        sprite.scale.set(scale);
        sprite.rotation = Math.random() * Math.PI * 2;
        this.app.stage.addChild(sprite);
        this.waawaaRain.push({
          sprite,
          body: {
            x,
            y: targetY,
            vx: (Math.random() - 0.5) * this.config.motion.driftSpeed * 1.8,
            vy: (Math.random() - 0.5) * this.config.motion.driftSpeed * 1.8,
            phase: Math.random() * Math.PI * 2,
            rotation: (Math.random() - 0.5) * this.config.motion.rotationJitter * 2,
          },
          targetY,
          spinSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.012 + Math.random() * 0.018),
          scale,
          landed: false,
        });
      }
    } catch {
      return;
    }
  }

  private clearWaawaaRain(): void {
    this.waawaaRain.forEach((item) => item.sprite.destroy());
    this.waawaaRain.length = 0;
  }

  private tick(deltaMs: number): void {
    if (this.app === null || this.paused) {
      return;
    }
    this.layoutBackground();
    const bounds = { width: this.app.screen.width, height: this.app.screen.height };
    const speedAdjustedDelta = this.waawaaMode ? deltaMs * this.config.secretMode.speedMultiplier : deltaMs;
    this.items.forEach((item) => {
      item.body = updateBody(item.body, speedAdjustedDelta, bounds, this.config);
      item.container.x = item.body.x;
      item.container.y = item.body.y + Math.sin(item.body.phase) * this.config.motion.bobAmplitude;
      item.container.rotation = this.waawaaMode ? item.container.rotation + speedAdjustedDelta * 0.006 : Math.sin(item.body.phase * 0.7) * item.body.rotation;
    });
    this.tickWaawaaRain(speedAdjustedDelta, bounds);
  }

  private getSecretModeTextSize(): number {
    if (this.app === null) {
      return 72;
    }
    return Math.max(38, Math.min(82, this.app.screen.width * 0.12));
  }

  private getWaawaaCharacterSize(kind: "sample" | "rain"): number {
    if (this.app === null) {
      return kind === "sample" ? 132 : 92;
    }
    const base = Math.min(this.app.screen.width, this.app.screen.height);
    if (kind === "sample") {
      return Math.max(86, Math.min(132, base * 0.14));
    }
    return Math.max(48, Math.min(94, base * 0.1));
  }

  private tickWaawaaRain(deltaMs: number, bounds: { width: number; height: number }): void {
    this.waawaaRain.forEach((item) => {
      if (!item.landed) {
        item.sprite.y += deltaMs * (0.5 + Math.random() * 0.08);
        item.sprite.rotation += deltaMs * item.spinSpeed;
        item.sprite.scale.set(item.scale * (1 + Math.sin(item.sprite.y * 0.018) * 0.08));
        if (item.sprite.y >= item.targetY) {
          item.landed = true;
          item.sprite.y = item.targetY;
          item.body.x = item.sprite.x;
          item.body.y = item.sprite.y;
        }
        return;
      }
      item.body = updateBody(item.body, deltaMs, bounds, this.config);
      item.sprite.x = item.body.x;
      item.sprite.y = item.body.y + Math.sin(item.body.phase) * this.config.motion.bobAmplitude * 0.8;
      item.sprite.rotation += deltaMs * item.spinSpeed * 0.18;
      item.sprite.scale.set(item.scale);
    });
  }

  private createArtworkBody(): MotionBody {
    if (this.app === null) {
      return createBody(1, 1, this.config);
    }
    const body = createBody(this.app.screen.width, this.app.screen.height, this.config);
    return {
      ...body,
      x: this.app.screen.width * (0.42 + Math.random() * 0.16),
      y: this.app.screen.height * (0.28 + Math.random() * 0.2),
    };
  }

  private layoutBackground(): void {
    if (this.app === null || this.background === null) {
      return;
    }
    const textureWidth = Math.max(1, this.background.texture.width);
    const textureHeight = Math.max(1, this.background.texture.height);
    const scale = Math.max(this.app.screen.width / textureWidth, this.app.screen.height / textureHeight);
    this.background.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
    this.background.scale.set(scale);
  }
}
