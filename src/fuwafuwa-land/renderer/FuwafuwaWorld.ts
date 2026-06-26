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

interface BattleActor {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseScale: number;
  eliminated: boolean;
  eliminatedAt?: number;
  seed: number;
}

interface BattleEffect {
  container: Container;
  startedAt: number;
  durationMs: number;
}

interface BattleState {
  id: string;
  startedAt: number;
  lastCollisionSoundAt: number;
  nextEliminationAt: number;
  winnerAt: number;
  endAt: number;
  participants: string[];
  actors: Map<string, BattleActor>;
  eliminatedIds: Set<string>;
  winnerId?: string;
  title: Text;
  subtitle: Text;
  effects: BattleEffect[];
  crown?: Container;
  flag?: Container;
  spotlight?: Graphics;
}

const WAAWAA_SAMPLE_ID = "sample-waawaa";
const SECRET_MODE_TEXT_SPIN_MS = 1000;
const SECRET_MODE_TEXT_HOLD_MS = 2000;

function isSampleId(id: string): boolean {
  return id.startsWith("sample-");
}

function isTransparentArtwork(artwork: Artwork): boolean {
  return artwork.imageBlobKey.toLowerCase().endsWith(".png") || artwork.source === "digital";
}

export class FuwafuwaWorld {
  private app: Application | null = null;
  private readonly items = new Map<string, WorldItem>();
  private readonly loadingIds = new Set<string>();
  private desiredVisibleIds = new Set<string>();
  private readonly config: FuwafuwaConfig;
  private background: Sprite | null = null;
  private paused = false;
  private fpsListener: ((fps: number) => void) | null = null;
  private characterTapListener: ((characterId: string) => void) | null = null;
  private waawaaTapCount = 0;
  private lastWaawaaTapAt = 0;
  private waawaaMode = false;
  private readonly waawaaAudio: HTMLAudioElement;
  private audioContext: AudioContext | null = null;
  private readonly waawaaRain: WaawaaRainItem[] = [];
  private battleState: BattleState | null = null;

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
    this.clearBattleState();
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

  onCharacterTap(listener: (characterId: string) => void): void {
    this.characterTapListener = listener;
  }

  async unlockAudio(): Promise<boolean> {
    const context = this.ensureAudioContext();
    if (context === null) {
      return false;
    }
    await context.resume();
    this.playSparkleSound(1);
    return true;
  }

  startBattleEvent(eventId: string): void {
    if (this.app === null || this.battleState?.id === eventId) {
      return;
    }
    this.clearBattleState();
    const participants = Array.from(this.items.keys());
    if (participants.length === 0) {
      return;
    }
    const bounds = { width: this.app.screen.width, height: this.app.screen.height };
    const actors = new Map<string, BattleActor>();
    participants.forEach((id, index) => {
      const item = this.items.get(id);
      const angle = index * ((Math.PI * 2) / Math.max(1, participants.length));
      const x = item?.container.x === undefined || item.container.x === 0 ? bounds.width / 2 + Math.cos(angle) * 180 : item.container.x;
      const y = item?.container.y === undefined || item.container.y === 0 ? bounds.height / 2 + Math.sin(angle) * 110 : item.container.y;
      actors.set(id, {
        id,
        x,
        y,
        vx: Math.cos(angle + Math.PI / 2) * 0.34,
        vy: Math.sin(angle + Math.PI / 2) * 0.34,
        radius: isSampleId(id) ? 52 : 62,
        baseScale: item?.container.scale.x ?? 1,
        eliminated: false,
        seed: Math.random() * 1000,
      });
    });
    const title = new Text({
      text: "ふわふわバトル",
      style: { fill: 0xfff7d6, fontSize: this.getSecretModeTextSize(), fontWeight: "900", stroke: { color: 0xe11d48, width: 8 } },
    });
    const subtitle = new Text({
      text: "ぽよんとぶつかって、さいごの1人へ",
      style: { fill: 0x17324d, fontSize: Math.max(18, this.getSecretModeTextSize() * 0.32), fontWeight: "900", stroke: { color: 0xffffff, width: 5 } },
    });
    title.anchor.set(0.5);
    subtitle.anchor.set(0.5);
    title.position.set(this.app.screen.width / 2, this.app.screen.height * 0.18);
    subtitle.position.set(this.app.screen.width / 2, this.app.screen.height * 0.18 + this.getSecretModeTextSize() * 0.8);
    this.app.stage.addChild(title, subtitle);
    const now = performance.now();
    this.battleState = {
      id: eventId,
      startedAt: now,
      lastCollisionSoundAt: 0,
      nextEliminationAt: now + 4400,
      winnerAt: now + this.config.events.battleDurationMs * 0.72,
      endAt: now + this.config.events.battleDurationMs,
      participants,
      actors,
      eliminatedIds: new Set<string>(),
      title,
      subtitle,
      effects: [],
    };
    this.playBattleIntroSound();
  }

  stopDisplayEvent(): void {
    this.clearBattleState();
  }

  async sync(artworks: Artwork[], state: DisplayState, getImageURL: (id: string) => Promise<string>): Promise<void> {
    if (this.app === null) {
      return;
    }
    this.paused = state.mode === "paused";
    const ids = state.visibleArtworkIds.slice(0, state.maxVisibleCount);
    const visible = new Set(ids);
    this.desiredVisibleIds = visible;
    this.items.forEach((item, id) => {
      if (!visible.has(id)) {
        this.app?.stage.removeChild(item.container);
        item.container.destroy({ children: true });
        this.items.delete(id);
      }
    });
    this.ensureSamples(ids.filter(isSampleId));
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
          if (!this.desiredVisibleIds.has(id)) {
            return;
          }
          this.addSprite(id, texture, artwork, state.featuredArtworkId === id);
        } catch {
          if (!this.desiredVisibleIds.has(id)) {
            return;
          }
          this.addPlaceholder(id, artwork, state.featuredArtworkId === id);
        } finally {
          this.loadingIds.delete(id);
        }
      }),
    );
    this.items.forEach((item, id) => {
      if (isSampleId(id)) {
        const artwork = artworks.find((candidate) => candidate.id === id);
        item.container.alpha = 0.92;
        item.container.scale.set(0.92 * ((artwork?.displayScale ?? 0.6) / 0.6));
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
    this.applyCharacterTapBehavior(container, id);
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
    if (isTransparentArtwork(artwork)) {
      const sprite = new Sprite(texture);
      const label = new Text({ text: artwork.givenName ?? artwork.displayLabel, style: { fill: 0x223344, fontSize: 20, fontWeight: "800" } });
      sprite.anchor.set(0.5);
      const maxEdge = featured ? 280 : 210;
      const scale = maxEdge / Math.max(texture.width, texture.height, 1);
      sprite.scale.set(scale);
      label.anchor.set(0.5, 0);
      label.y = Math.min(96, texture.height * scale * 0.5 + 8);
      container.addChild(sprite, label);
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
      this.applyCharacterTapBehavior(container, id);
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
    this.applyCharacterTapBehavior(container, id);
    container.scale.set((featured ? 2.2 : 1.7) * artwork.displayScale);
    this.app.stage.addChild(container);
    this.items.set(id, { id, container, body: this.createArtworkBody(), kind: "artwork", artwork, featured });
  }

  private ensureSamples(sampleIds: string[]): void {
    if (this.app === null) {
      return;
    }
    sampleIds.forEach((sampleId) => {
      const sample = SAMPLE_CHARACTERS.find((candidate) => candidate.id === sampleId);
      if (sample === undefined) {
        return;
      }
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
      const scale = (this.waawaaMode ? this.getWaawaaCharacterSize() : 112) / Math.max(texture.width, texture.height, 1);
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
    void this.tryPlayAudio(this.waawaaAudio);
  }

  private async tryPlayAudio(audio: HTMLAudioElement): Promise<boolean> {
    try {
      audio.currentTime = 0;
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioContext !== null) {
      return this.audioContext;
    }
    const AudioContextClass = window.AudioContext;
    if (AudioContextClass === undefined) {
      return null;
    }
    this.audioContext = new AudioContextClass();
    return this.audioContext;
  }

  private playTone(frequency: number, durationMs: number, gainValue: number, type: OscillatorType, delayMs = 0): void {
    const context = this.ensureAudioContext();
    if (context === null) {
      return;
    }
    const start = context.currentTime + delayMs / 1000;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.72), start + durationMs / 1000);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + durationMs / 1000 + 0.03);
  }

  private playBattleIntroSound(): void {
    [523, 659, 784, 1046].forEach((frequency, index) => this.playTone(frequency, 160, 0.055, "triangle", index * 85));
  }

  private playCollisionSound(strength: number): void {
    const frequency = 260 + Math.min(1, strength) * 260;
    this.playTone(frequency, 110, 0.035 + Math.min(1, strength) * 0.035, "sine");
    this.playTone(frequency * 1.5, 80, 0.018, "triangle", 22);
  }

  private playEliminationSound(): void {
    this.playTone(392, 180, 0.05, "triangle");
    this.playTone(220, 210, 0.04, "sine", 80);
  }

  private playSparkleSound(volume = 1): void {
    [880, 1174, 1568].forEach((frequency, index) => this.playTone(frequency, 170, 0.028 * volume, "triangle", index * 70));
  }

  private playVictorySound(): void {
    [523, 659, 784, 1046, 1318].forEach((frequency, index) => this.playTone(frequency, 260, 0.06, "triangle", index * 120));
    this.playTone(196, 720, 0.05, "sine", 80);
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
    const canTap = sampleId === this.config.secretMode.triggerSampleId || this.waawaaMode || this.characterTapListener !== null;
    container.eventMode = canTap ? "static" : "none";
    container.cursor = canTap ? "pointer" : "default";
    if (canTap) {
      container.on("pointertap", () => {
        if (sampleId === this.config.secretMode.triggerSampleId || this.waawaaMode) {
          this.handleWaawaaTap();
          return;
        }
        this.characterTapListener?.(sampleId);
      });
    }
  }

  private applyCharacterTapBehavior(container: Container, characterId: string): void {
    container.removeAllListeners("pointertap");
    const canTap = this.characterTapListener !== null;
    container.eventMode = canTap ? "static" : "none";
    container.cursor = canTap ? "pointer" : "default";
    if (canTap) {
      container.on("pointertap", () => this.characterTapListener?.(characterId));
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
        const scale = this.getWaawaaCharacterSize() / Math.max(texture.width, texture.height, 1);
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

  private clearBattleState(): void {
    if (this.battleState === null) {
      return;
    }
    this.battleState.title.destroy();
    this.battleState.subtitle.destroy();
    this.battleState.effects.forEach((effect) => effect.container.destroy({ children: true }));
    this.battleState.crown?.destroy();
    this.battleState.flag?.destroy();
    this.battleState.spotlight?.destroy();
    this.battleState.participants.forEach((id) => {
      const item = this.items.get(id);
      if (item !== undefined) {
        item.container.alpha = 1;
        item.container.visible = true;
        const actor = this.battleState?.actors.get(id);
        item.container.scale.set(actor?.baseScale ?? item.container.scale.x);
      }
    });
    this.battleState = null;
  }

  private tick(deltaMs: number): void {
    if (this.app === null || this.paused) {
      return;
    }
    this.layoutBackground();
    const bounds = { width: this.app.screen.width, height: this.app.screen.height };
    if (this.battleState !== null) {
      this.tickBattle(deltaMs, bounds);
      return;
    }
    const speedAdjustedDelta = this.waawaaMode ? deltaMs * this.config.secretMode.speedMultiplier : deltaMs;
    this.items.forEach((item) => {
      item.body = updateBody(item.body, speedAdjustedDelta, bounds, this.config);
      item.container.x = item.body.x;
      item.container.y = item.body.y + Math.sin(item.body.phase) * this.config.motion.bobAmplitude;
      item.container.rotation = this.waawaaMode ? item.container.rotation + speedAdjustedDelta * 0.006 : Math.sin(item.body.phase * 0.7) * item.body.rotation;
    });
    this.tickWaawaaRain(speedAdjustedDelta, bounds);
  }

  private tickBattle(deltaMs: number, bounds: { width: number; height: number }): void {
    if (this.app === null || this.battleState === null) {
      return;
    }
    const now = performance.now();
    const battle = this.battleState;
    if (now >= battle.endAt) {
      this.clearBattleState();
      return;
    }
    const activeActors = [...battle.actors.values()].filter((actor) => !actor.eliminated);
    if (now >= battle.nextEliminationAt && activeActors.length > 2 && now < battle.winnerAt) {
      const slowest = activeActors.reduce((picked, actor) => {
        const pickedSpeed = Math.hypot(picked.vx, picked.vy);
        const actorSpeed = Math.hypot(actor.vx, actor.vy);
        return actorSpeed < pickedSpeed ? actor : picked;
      }, activeActors[0]);
      this.eliminateActor(battle, slowest, now);
      battle.nextEliminationAt = now + 1100;
    }
    if (now >= battle.winnerAt && battle.winnerId === undefined) {
      const remainingActors = [...battle.actors.values()].filter((actor) => !actor.eliminated);
      const winner = remainingActors[Math.floor(Math.random() * remainingActors.length)] ?? remainingActors[0];
      battle.winnerId = winner?.id;
      remainingActors.forEach((actor) => {
        if (actor.id !== battle.winnerId) {
          this.eliminateActor(battle, actor, now);
        }
      });
      this.showBattleWinner(battle);
    }

    this.stepBattlePhysics(battle, deltaMs, bounds, now);
    this.renderBattleActors(battle, deltaMs, now);
    this.tickBattleEffects(battle, now);
    if (battle.winnerId !== undefined) {
      const winner = this.items.get(battle.winnerId);
      if (winner !== undefined) {
        battle.crown?.position.set(winner.container.x, winner.container.y - 115);
        battle.flag?.position.set(winner.container.x + 96, winner.container.y - 34);
        battle.spotlight?.position.set(winner.container.x, winner.container.y);
      }
    }
  }

  private stepBattlePhysics(battle: BattleState, deltaMs: number, bounds: { width: number; height: number }, now: number): void {
    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2 + bounds.height * 0.04;
    const activeActors = [...battle.actors.values()].filter((actor) => !actor.eliminated);
    activeActors.forEach((actor) => {
      const towardCenterX = centerX - actor.x;
      const towardCenterY = centerY - actor.y;
      const length = Math.max(1, Math.hypot(towardCenterX, towardCenterY));
      const swirl = Math.sin((now - battle.startedAt) * 0.002 + actor.seed) * 0.002;
      actor.vx += (towardCenterX / length) * 0.012 + (-towardCenterY / length) * swirl;
      actor.vy += (towardCenterY / length) * 0.012 + (towardCenterX / length) * swirl;
    });
    for (let leftIndex = 0; leftIndex < activeActors.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < activeActors.length; rightIndex += 1) {
        this.resolveBattleCollision(battle, activeActors[leftIndex], activeActors[rightIndex], now);
      }
    }
    battle.actors.forEach((actor) => {
      if (actor.eliminated) {
        actor.vy += 0.0018 * deltaMs;
      }
      actor.x += actor.vx * deltaMs;
      actor.y += actor.vy * deltaMs;
      actor.vx *= actor.eliminated ? 0.992 : 0.985;
      actor.vy *= actor.eliminated ? 0.992 : 0.985;
      const margin = actor.radius;
      if (actor.x < margin || actor.x > bounds.width - margin) {
        actor.x = Math.max(margin, Math.min(bounds.width - margin, actor.x));
        actor.vx *= -this.config.events.battleRestitution;
      }
      if (actor.y < margin || actor.y > bounds.height - margin) {
        actor.y = Math.max(margin, Math.min(bounds.height - margin, actor.y));
        actor.vy *= -this.config.events.battleRestitution;
      }
    });
  }

  private resolveBattleCollision(battle: BattleState, left: BattleActor, right: BattleActor, now: number): void {
    const dx = right.x - left.x;
    const dy = right.y - left.y;
    const distance = Math.max(0.01, Math.hypot(dx, dy));
    const minDistance = left.radius + right.radius;
    if (distance >= minDistance) {
      return;
    }
    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = minDistance - distance;
    left.x -= nx * overlap * 0.5;
    left.y -= ny * overlap * 0.5;
    right.x += nx * overlap * 0.5;
    right.y += ny * overlap * 0.5;
    const relativeVelocity = (right.vx - left.vx) * nx + (right.vy - left.vy) * ny;
    if (relativeVelocity > 0) {
      return;
    }
    const impulse = (-(1 + this.config.events.battleRestitution) * relativeVelocity) / 2;
    left.vx -= impulse * nx;
    left.vy -= impulse * ny;
    right.vx += impulse * nx;
    right.vy += impulse * ny;
    const strength = Math.min(1, Math.abs(relativeVelocity) * 1.7 + overlap / minDistance);
    this.addBattleBumpEffect((left.x + right.x) / 2, (left.y + right.y) / 2, strength);
    if (now - battle.lastCollisionSoundAt > 90) {
      this.playCollisionSound(strength);
      battle.lastCollisionSoundAt = now;
    }
  }

  private renderBattleActors(battle: BattleState, deltaMs: number, now: number): void {
    const progress = Math.min(1, (now - battle.startedAt) / this.config.events.battleDurationMs);
    battle.title.rotation = Math.sin((now - battle.startedAt) * 0.006) * 0.06;
    battle.title.scale.set(1 + Math.sin((now - battle.startedAt) * 0.008) * 0.07);
    battle.subtitle.alpha = progress > 0.5 ? Math.max(0, 1 - (progress - 0.5) / 0.2) : 1;
    battle.actors.forEach((actor) => {
      const item = this.items.get(actor.id);
      if (item === undefined) {
        return;
      }
      const eliminatedElapsed = actor.eliminatedAt === undefined ? 0 : now - actor.eliminatedAt;
      const winner = battle.winnerId === actor.id;
      const pulse = 1 + Math.sin((now + actor.seed) * 0.014) * 0.08;
      item.container.x = actor.x;
      item.container.y = actor.y + Math.sin((now + actor.seed) * 0.007) * 10;
      item.container.rotation += deltaMs * (winner ? 0.004 : actor.eliminated ? 0.018 : 0.011);
      item.container.alpha = actor.eliminated ? Math.max(0.12, 1 - eliminatedElapsed / 650) : 1;
      item.container.visible = !actor.eliminated || eliminatedElapsed < 900;
      item.container.scale.set(winner ? actor.baseScale * 2.25 * pulse : actor.eliminated ? actor.baseScale * Math.max(0.25, 1 - eliminatedElapsed / 700) : actor.baseScale * 1.28 * pulse);
    });
  }

  private eliminateActor(battle: BattleState, actor: BattleActor, now: number): void {
    if (actor.eliminated) {
      return;
    }
    actor.eliminated = true;
    actor.eliminatedAt = now;
    battle.eliminatedIds.add(actor.id);
    const angle = Math.atan2(actor.y - (this.app?.screen.height ?? 1) / 2, actor.x - (this.app?.screen.width ?? 1) / 2);
    actor.vx += Math.cos(angle) * 0.55;
    actor.vy += Math.sin(angle) * 0.55 - 0.35;
    this.addBattlePopEffect(actor.x, actor.y);
    this.playEliminationSound();
  }

  private showBattleWinner(battle: BattleState): void {
    if (this.app === null || battle.winnerId === undefined) {
      return;
    }
    battle.title.text = "きょうのチャンピオン!";
    battle.subtitle.text = "みんなでぽよん、さいごは主役!";
    battle.subtitle.alpha = 1;
    const spotlight = new Graphics().ellipse(0, 18, 155, 54).fill({ color: 0xfff7d6, alpha: 0.34 }).stroke({ color: 0xffb703, alpha: 0.6, width: 3 });
    const crown = this.createCrownGraphic();
    const flag = this.createWinnerFlag();
    this.app.stage.addChild(spotlight, crown, flag);
    battle.spotlight = spotlight;
    battle.crown = crown;
    battle.flag = flag;
    this.addConfettiBurst();
    this.playVictorySound();
  }

  private createCrownGraphic(): Container {
    const container = new Container();
    const crown = new Graphics()
      .poly([-54, 22, -44, -28, -18, 6, 0, -38, 18, 6, 44, -28, 54, 22])
      .fill(0xffc857)
      .stroke({ color: 0x9a5b00, width: 5 });
    const base = new Graphics().roundRect(-60, 18, 120, 24, 8).fill(0xffb703).stroke({ color: 0x9a5b00, width: 4 });
    const shine = new Graphics().circle(-18, -3, 7).circle(18, -3, 7).circle(0, -20, 8).fill(0xffffff);
    shine.alpha = 0.72;
    container.addChild(crown, base, shine);
    return container;
  }

  private createWinnerFlag(): Container {
    const container = new Container();
    const pole = new Graphics().roundRect(-4, -54, 8, 112, 4).fill(0x7c2d12);
    const cloth = new Graphics().poly([0, -54, 92, -38, 70, 2, 0, -12]).fill(0x14b8a6).stroke({ color: 0x0f766e, width: 4 });
    const text = new Text({ text: "優勝", style: { fill: 0xffffff, fontSize: 24, fontWeight: "900", stroke: { color: 0x0f766e, width: 4 } } });
    text.anchor.set(0.5);
    text.position.set(42, -25);
    container.addChild(pole, cloth, text);
    return container;
  }

  private addBattleBumpEffect(x: number, y: number, strength: number): void {
    if (this.app === null || this.battleState === null) {
      return;
    }
    const container = new Container();
    const radius = 18 + strength * 30;
    const ring = new Graphics().circle(0, 0, radius).stroke({ color: 0xffffff, width: 5, alpha: 0.95 });
    const star = new Graphics()
      .poly([0, -radius * 0.8, 7, -8, radius * 0.75, 0, 7, 8, 0, radius * 0.8, -7, 8, -radius * 0.75, 0, -7, -8])
      .fill(0xfff7d6);
    container.position.set(x, y);
    container.addChild(ring, star);
    this.app.stage.addChild(container);
    this.battleState.effects.push({ container, startedAt: performance.now(), durationMs: 420 });
  }

  private addBattlePopEffect(x: number, y: number): void {
    if (this.app === null || this.battleState === null) {
      return;
    }
    const container = new Container();
    for (let index = 0; index < 8; index += 1) {
      const angle = index * (Math.PI / 4);
      const piece = new Graphics().circle(Math.cos(angle) * 22, Math.sin(angle) * 22, 8).fill(index % 2 === 0 ? 0xffb703 : 0x14b8a6);
      container.addChild(piece);
    }
    const text = new Text({ text: "ぽよん", style: { fill: 0xe11d48, fontSize: 22, fontWeight: "900", stroke: { color: 0xffffff, width: 4 } } });
    text.anchor.set(0.5);
    container.addChild(text);
    container.position.set(x, y);
    this.app.stage.addChild(container);
    this.battleState.effects.push({ container, startedAt: performance.now(), durationMs: 680 });
  }

  private addConfettiBurst(): void {
    if (this.app === null || this.battleState === null) {
      return;
    }
    const container = new Container();
    const colors = [0xffb703, 0xe11d48, 0x14b8a6, 0x60a5fa, 0xffffff];
    for (let index = 0; index < 46; index += 1) {
      const x = (Math.random() - 0.5) * this.app.screen.width * 0.72;
      const y = (Math.random() - 0.5) * this.app.screen.height * 0.45;
      const piece = new Graphics().rect(-5, -3, 10, 6).fill(colors[index % colors.length]);
      piece.position.set(x, y);
      piece.rotation = Math.random() * Math.PI * 2;
      container.addChild(piece);
    }
    container.position.set(this.app.screen.width / 2, this.app.screen.height * 0.4);
    this.app.stage.addChild(container);
    this.battleState.effects.push({ container, startedAt: performance.now(), durationMs: 2400 });
  }

  private tickBattleEffects(battle: BattleState, now: number): void {
    battle.effects = battle.effects.filter((effect) => {
      const progress = Math.min(1, (now - effect.startedAt) / effect.durationMs);
      effect.container.alpha = 1 - progress;
      effect.container.scale.set(0.8 + progress * 1.4);
      effect.container.rotation += 0.018;
      if (progress >= 1) {
        effect.container.destroy({ children: true });
        return false;
      }
      return true;
    });
  }

  private getSecretModeTextSize(): number {
    if (this.app === null) {
      return 72;
    }
    return Math.max(38, Math.min(82, this.app.screen.width * 0.12));
  }

  private getWaawaaCharacterSize(): number {
    if (this.app === null) {
      return 132;
    }
    const base = Math.min(this.app.screen.width, this.app.screen.height);
    return Math.max(86, Math.min(132, base * 0.14));
  }

  private tickWaawaaRain(deltaMs: number, bounds: { width: number; height: number }): void {
    this.waawaaRain.forEach((item) => {
      if (!item.landed) {
        item.sprite.y += deltaMs * (0.5 + Math.random() * 0.08);
        item.sprite.rotation += deltaMs * item.spinSpeed;
        item.sprite.scale.set(item.scale);
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
