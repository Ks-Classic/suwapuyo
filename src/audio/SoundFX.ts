/**
 * SoundFX - Programmatic game sound effects using Web Audio API
 * No external audio files needed - all sounds are generated in real-time
 */
export class SoundFX {
  private ctx: AudioContext | null = null;
  private masterVolume = 0.35;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /** Short bright blip when selecting a puyo */
  select() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(990, now + 0.06);

    gain.gain.setValueAtTime(this.masterVolume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** Deselect sound - soft descending blip */
  deselect() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);

    gain.gain.setValueAtTime(this.masterVolume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Whoosh sound for swap animation */
  swap() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.18);

    gain.gain.setValueAtTime(this.masterVolume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Bubbly pop sound, pitch increases with chain step */
  pop(chainStep: number = 1) {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    const baseFreq = 440 * Math.pow(1.12, chainStep - 1);

    // Multiple oscillators for bubbly texture
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const offset = i * 0.035;
      const freq = baseFreq * (1 + i * 0.25);

      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, now + offset);
      osc.frequency.exponentialRampToValueAtTime(
        freq * 0.4,
        now + offset + 0.2
      );

      gain.gain.setValueAtTime(
        (this.masterVolume * 0.45) / (i + 1),
        now + offset
      );
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25);

      osc.start(now + offset);
      osc.stop(now + offset + 0.25);
    }
  }

  /** Ascending arpeggio for chain announcements */
  chain(chainNumber: number) {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // C major scale fragments, higher chains = more notes
    const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
    const count = Math.min(chainNumber + 2, notes.length);

    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(notes[i], now + i * 0.055);

      gain.gain.setValueAtTime(this.masterVolume * 0.35, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + i * 0.055 + 0.18
      );

      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.18);
    }
  }

  /** Two descending tones for failed swap */
  noMatch() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "square";
      const baseHz = 280 - i * 70;
      osc.frequency.setValueAtTime(baseHz, now + i * 0.1);
      osc.frequency.exponentialRampToValueAtTime(
        baseHz * 0.6,
        now + i * 0.1 + 0.12
      );

      gain.gain.setValueAtTime(this.masterVolume * 0.15, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + i * 0.1 + 0.15
      );

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.15);
    }
  }

  /** Low thud for landing / bounce */
  land() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

    gain.gain.setValueAtTime(this.masterVolume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Sparkle for refill / new puyos appearing */
  refill() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      const freq = 1200 + i * 200 + Math.random() * 100;
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      osc.frequency.exponentialRampToValueAtTime(
        freq * 0.8,
        now + i * 0.04 + 0.1
      );

      gain.gain.setValueAtTime(this.masterVolume * 0.15, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + i * 0.04 + 0.12
      );

      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.12);
    }
  }

  dispose() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
