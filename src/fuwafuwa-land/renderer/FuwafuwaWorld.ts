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

const WAAWAA_SAMPLE_ID = "sample-tooth";

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
    const cardColor = this.waawaaMode ? 0xfff7d6 : 0xffffff;
    const strokeColor = this.waawaaMode ? 0xe11d48 : 0xb7d7e8;
    const labelColor = this.waawaaMode ? 0xe11d48 : 0x223344;
    const card = new Graphics().roundRect(-108, -88, 216, 176, this.config.card.cornerRadius).fill(cardColor).stroke({ color: strokeColor, width: 4 });
    const sprite = new Sprite(texture);
    const label = new Text({ text: this.waawaaMode ? "わーわー" : artwork.givenName ?? artwork.displayLabel, style: { fill: labelColor, fontSize: 20, fontWeight: "800" } });
    sprite.anchor.set(0.5);
    const maxEdge = featured ? 260 : 190;
    const textureEdge = Math.max(texture.width, texture.height, 1);
    const scale = maxEdge / textureEdge;
    sprite.scale.set(scale);
    label.anchor.set(0.5, 0);
    label.y = Math.min(88, texture.height * scale * 0.5 + 10);
    container.addChild(card, sprite, label);
    if (this.waawaaMode) {
      void this.replaceArtworkSpriteWithWaawaa(sprite, featured);
    }
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
    const card = new Graphics()
      .roundRect(-96, -80, 192, 160, this.config.card.cornerRadius)
      .fill(this.waawaaMode ? 0xfff7d6 : 0xfffbeb)
      .stroke({ color: this.waawaaMode ? 0xe11d48 : 0xffb703, width: 4 });
    const mark = new Text({ text: this.waawaaMode ? "わーわー" : artwork.displayLabel, style: { fill: this.waawaaMode ? 0xe11d48 : 0x3a2f23, fontSize: 24, fontWeight: "800" } });
    const label = new Text({ text: this.waawaaMode ? "わーわー" : artwork.givenName ?? "ふわふわ", style: { fill: this.waawaaMode ? 0xe11d48 : 0x3a2f23, fontSize: 18, fontWeight: "700" } });
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
      if (sample.id === this.config.secretMode.triggerSampleId) {
        container.eventMode = "static";
        container.cursor = "pointer";
        container.on("pointertap", () => this.handleWaawaaTap());
      }
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
    const labelText = this.waawaaMode ? "わーわー" : sample.label;
    const text = new Text({ text: labelText, style: { fill: this.waawaaMode ? 0xe11d48 : 0x283747, fontSize: 22, fontWeight: "800" } });
    text.anchor.set(0.5, 0);
    text.y = 62;
    container.addChild(text);
    try {
      const texture = await this.loadTexture(visualSample.imageUrl);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      const scale = (this.waawaaMode ? 132 : 112) / Math.max(texture.width, texture.height, 1);
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
    this.refreshItemsForWaawaaMode();
    this.showWaawaaModeBurst();
  }

  private playWaawaaAudio(): void {
    this.waawaaAudio.currentTime = 0;
    void this.waawaaAudio.play().catch(() => undefined);
  }

  private refreshItemsForWaawaaMode(): void {
    this.items.forEach((item) => {
      if (item.kind === "sample") {
        void this.populateSample(item.container, item.id);
        return;
      }
      if (item.artwork !== undefined && item.texture !== undefined) {
        this.populateSprite(item.container, item.texture, item.artwork, item.featured ?? false);
      }
    });
  }

  private showWaawaaModeBurst(): void {
    if (this.app === null) {
      return;
    }
    const text = new Text({
      text: this.config.secretMode.modeText,
      style: { fill: 0xfff7d6, fontSize: 72, fontWeight: "900", stroke: { color: 0xe11d48, width: 8 } },
    });
    text.anchor.set(0.5);
    text.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
    this.app.stage.addChild(text);
    const startedAt = performance.now();
    const animate = () => {
      if (this.app === null) {
        return;
      }
      const progress = Math.min(1, (performance.now() - startedAt) / 1800);
      text.rotation = progress * Math.PI * 4;
      text.scale.set(0.4 + Math.sin(progress * Math.PI) * 1.4 + progress * 0.4);
      text.alpha = progress > 0.72 ? Math.max(0, 1 - (progress - 0.72) / 0.28) : 1;
      if (progress >= 1) {
        this.app.ticker.remove(animate);
        text.destroy();
      }
    };
    this.app.ticker.add(animate);
  }

  private tick(deltaMs: number): void {
    if (this.app === null || this.paused) {
      return;
    }
    this.layoutBackground();
    const bounds = { width: this.app.screen.width, height: this.app.screen.height };
    this.items.forEach((item) => {
      item.body = updateBody(item.body, deltaMs, bounds, this.config);
      item.container.x = item.body.x;
      item.container.y = item.body.y + Math.sin(item.body.phase) * this.config.motion.bobAmplitude;
      item.container.rotation = Math.sin(item.body.phase * 0.7) * item.body.rotation;
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
