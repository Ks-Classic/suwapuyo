/**
 * TaisouMusic - お口ミッション用のWebAudio合成音楽(SoundFXのパターン踏襲)。
 * 音源ファイルなし・全曲オリジナル。体操ごとに固有のイントロジングル(約1秒)と
 * 本編ループ(4〜8秒ループ)を持つ。譜面キーは mouthMissions の musicId と一致。
 * 正本: docs/70_すわぷよ・ユアタイム統合仕様/02_体験設計/08_…ミッション設計.md §6.1/6.2
 */

type Wave = OscillatorType | "noise";

interface SynthNote {
  /** 開始位置(ビート) */
  t: number;
  /** 長さ(ビート) */
  d: number;
  /** 周波数Hz。noise の場合はバンドパス中心(0でフィルタなし) */
  f: number;
  w?: Wave;
  /** 音量係数(既定1) */
  g?: number;
}

interface MissionTune {
  bpm: number;
  /** 裏拍を遅らせるスウィング量(ビートの割合 0〜0.35) */
  swing?: number;
  /** イントロジングル(約1秒) */
  intro: SynthNote[];
  /** 本編ループ1周 */
  loop: SynthNote[];
  /** ループ1周の長さ(ビート) */
  loopBeats: number;
}

function n(t: number, d: number, f: number, w: Wave = "square", g = 1): SynthNote {
  return { t, d, f, w, g };
}

// 音名メモ: C3=131 G3=196 C4=262 E4=330 G4=392 C5=523 E5=659 G5=784 C6=1047
const TUNES: Record<string, MissionTune> = {
  // 明るいマーチ(おおきくあーん): スクエア波リード+三角波オムパ・バス
  aan: {
    bpm: 120,
    loopBeats: 8,
    intro: [
      n(0, 0.5, 392), n(0.5, 0.5, 523), n(1, 0.5, 659), n(1.5, 1, 784, "square", 1.1),
      n(0, 0.5, 131, "triangle"), n(1, 0.5, 196, "triangle"), n(1.5, 0.3, 0, "noise", 0.5),
    ],
    loop: [
      n(0, 0.5, 659), n(0.5, 0.5, 659), n(1, 1, 784), n(2, 0.5, 659), n(2.5, 0.5, 523),
      n(3, 1, 587), n(4, 0.5, 698), n(4.5, 0.5, 698), n(5, 1, 880), n(6, 0.5, 784),
      n(6.5, 0.5, 659), n(7, 1, 523),
      n(0, 0.5, 131, "triangle"), n(1, 0.5, 196, "triangle"), n(2, 0.5, 131, "triangle"), n(3, 0.5, 196, "triangle"),
      n(4, 0.5, 175, "triangle"), n(5, 0.5, 220, "triangle"), n(6, 0.5, 196, "triangle"), n(7, 0.5, 196, "triangle"),
      n(0, 0.2, 0, "noise", 0.5), n(2, 0.2, 0, "noise", 0.4), n(4, 0.2, 0, "noise", 0.5), n(6, 0.2, 0, "noise", 0.4),
    ],
  },
  // スキップ調(にっこりいー): 付点リズムの三角波
  niko_ii: {
    bpm: 138,
    loopBeats: 8,
    intro: [
      n(0, 0.75, 523, "triangle"), n(0.75, 0.25, 659, "triangle"), n(1, 1, 784, "triangle", 1.1),
      n(1.6, 0.3, 1047, "sine", 0.6),
    ],
    loop: [
      n(0, 0.75, 523, "triangle"), n(0.75, 0.25, 659, "triangle"), n(1, 0.75, 784, "triangle"), n(1.75, 0.25, 659, "triangle"),
      n(2, 1, 880, "triangle"), n(3, 0.75, 784, "triangle"), n(3.75, 0.25, 659, "triangle"),
      n(4, 0.75, 698, "triangle"), n(4.75, 0.25, 587, "triangle"), n(5, 0.75, 659, "triangle"), n(5.75, 0.25, 523, "triangle"),
      n(6, 1, 587, "triangle"), n(7, 1, 523, "triangle"),
      n(0, 0.4, 131, "triangle", 0.8), n(2, 0.4, 196, "triangle", 0.8), n(4, 0.4, 175, "triangle", 0.8), n(6, 0.4, 196, "triangle", 0.8),
      n(1, 0.1, 0, "noise", 0.25), n(3, 0.1, 0, "noise", 0.25), n(5, 0.1, 0, "noise", 0.25), n(7, 0.1, 0, "noise", 0.25),
    ],
  },
  // コミカルなワルツ(たこさんうー): 3拍子のオム・パ・パ
  tako_uu: {
    bpm: 100,
    loopBeats: 6,
    intro: [
      n(0, 0.5, 784, "triangle"), n(0.5, 0.5, 659, "triangle"), n(1, 1, 523, "triangle", 1.1),
      n(0, 0.5, 131, "triangle"),
    ],
    loop: [
      n(0, 1, 131, "triangle"), n(1, 0.5, 330, "square", 0.35), n(1, 0.5, 392, "square", 0.35),
      n(2, 0.5, 330, "square", 0.35), n(2, 0.5, 392, "square", 0.35),
      n(3, 1, 196, "triangle"), n(4, 0.5, 349, "square", 0.35), n(4, 0.5, 494, "square", 0.35),
      n(5, 0.5, 349, "square", 0.35), n(5, 0.5, 494, "square", 0.35),
      n(0, 0.5, 784, "triangle"), n(0.5, 0.5, 659, "triangle"), n(1, 2, 523, "triangle"),
      n(3, 0.5, 587, "triangle"), n(3.5, 0.5, 494, "triangle"), n(4, 2, 392, "triangle"),
    ],
  },
  // ぽこぽこ打楽器(ぷくぷくほっぺ): ピッチ打楽器のポコポコ
  pukupuku: {
    bpm: 112,
    loopBeats: 8,
    intro: [
      n(0, 0.25, 523, "sine"), n(0.35, 0.25, 659, "sine"), n(0.7, 0.25, 784, "sine"), n(1.05, 0.4, 110, "sine", 1.2),
    ],
    loop: [
      n(0, 0.3, 110, "sine", 1.2), n(2, 0.3, 110, "sine", 1.2), n(4, 0.3, 98, "sine", 1.2), n(6, 0.3, 110, "sine", 1.2),
      n(0.5, 0.2, 1047, "sine", 0.7), n(1, 0.2, 880, "sine", 0.7), n(1.5, 0.2, 784, "sine", 0.7),
      n(2.5, 0.2, 1047, "sine", 0.7), n(3, 0.2, 1319, "sine", 0.6), n(3.5, 0.2, 880, "sine", 0.7),
      n(4.5, 0.2, 784, "sine", 0.7), n(5, 0.2, 659, "sine", 0.7), n(5.5, 0.2, 880, "sine", 0.7),
      n(6.5, 0.2, 1047, "sine", 0.7), n(7, 0.2, 784, "sine", 0.7), n(7.5, 0.2, 523, "sine", 0.7),
      n(0.5, 0.08, 6000, "noise", 0.15), n(1.5, 0.08, 6000, "noise", 0.15), n(2.5, 0.08, 6000, "noise", 0.15),
      n(3.5, 0.08, 6000, "noise", 0.15), n(4.5, 0.08, 6000, "noise", 0.15), n(5.5, 0.08, 6000, "noise", 0.15),
      n(6.5, 0.08, 6000, "noise", 0.15), n(7.5, 0.08, 6000, "noise", 0.15),
    ],
  },
  // おどけたブルース(べーっとした): シャッフルのブルーノート
  beee: {
    bpm: 96,
    swing: 0.3,
    loopBeats: 8,
    intro: [
      n(0, 0.5, 523), n(0.5, 0.5, 622), n(1, 0.8, 740, "square", 1.1), n(0, 0.5, 131, "triangle"),
    ],
    loop: [
      n(0, 0.5, 523), n(0.5, 0.5, 622), n(1, 1, 698), n(2.5, 0.5, 740), n(3, 1, 784),
      n(5, 0.5, 932), n(5.5, 0.5, 784), n(6, 0.5, 698), n(6.5, 0.5, 622), n(7, 1, 523),
      n(0, 0.8, 131, "triangle"), n(1, 0.8, 165, "triangle"), n(2, 0.8, 175, "triangle"), n(3, 0.8, 185, "triangle"),
      n(4, 0.8, 196, "triangle"), n(5, 0.8, 175, "triangle"), n(6, 0.8, 165, "triangle"), n(7, 0.8, 196, "triangle"),
      n(0.5, 0.1, 0, "noise", 0.2), n(1.5, 0.1, 0, "noise", 0.2), n(2.5, 0.1, 0, "noise", 0.2), n(3.5, 0.1, 0, "noise", 0.2),
      n(4.5, 0.1, 0, "noise", 0.2), n(5.5, 0.1, 0, "noise", 0.2), n(6.5, 0.1, 0, "noise", 0.2), n(7.5, 0.1, 0, "noise", 0.2),
    ],
  },
  // 軽快なピチカート(まばたきぱちぱち): 短いスタッカートの弦はじき
  pachipachi: {
    bpm: 132,
    loopBeats: 8,
    intro: [
      n(0, 0.15, 523, "triangle"), n(0.25, 0.15, 659, "triangle"), n(0.5, 0.15, 784, "triangle"), n(0.75, 0.3, 1047, "triangle", 1.1),
    ],
    loop: [
      n(0, 0.2, 523, "triangle"), n(0.5, 0.2, 659, "triangle"), n(1, 0.2, 784, "triangle"), n(1.5, 0.2, 1047, "triangle"),
      n(2, 0.2, 784, "triangle"), n(2.5, 0.2, 659, "triangle"), n(3, 0.4, 523, "triangle"),
      n(4, 0.2, 440, "triangle"), n(4.5, 0.2, 523, "triangle"), n(5, 0.2, 659, "triangle"), n(5.5, 0.2, 880, "triangle"),
      n(6, 0.2, 659, "triangle"), n(6.5, 0.2, 587, "triangle"), n(7, 0.4, 494, "triangle"),
      n(0, 0.15, 131, "triangle", 0.9), n(2, 0.15, 196, "triangle", 0.9), n(4, 0.15, 220, "triangle", 0.9), n(6, 0.15, 196, "triangle", 0.9),
    ],
  },
  // ジャズ風(かためウィンク): スウィングするii-V-I
  wink: {
    bpm: 126,
    swing: 0.33,
    loopBeats: 8,
    intro: [
      n(0, 0.5, 587, "triangle"), n(0.5, 0.5, 523, "triangle"), n(1, 0.8, 440, "triangle", 1.1), n(0, 0.6, 147, "triangle"),
    ],
    loop: [
      n(0, 0.5, 349, "triangle"), n(0.5, 0.5, 440, "triangle"), n(1, 0.5, 523, "triangle"), n(1.5, 0.5, 659, "triangle"),
      n(2, 0.5, 587, "triangle"), n(2.5, 0.5, 494, "triangle"), n(3, 0.5, 392, "triangle"), n(3.5, 0.5, 349, "triangle"),
      n(4, 1, 330, "triangle"), n(5.5, 0.5, 392, "triangle"), n(6, 1.5, 523, "triangle"),
      n(0, 0.8, 147, "triangle", 0.9), n(1, 0.8, 220, "triangle", 0.9), n(2, 0.8, 196, "triangle", 0.9), n(3, 0.8, 247, "triangle", 0.9),
      n(4, 0.8, 131, "triangle", 0.9), n(5, 0.8, 165, "triangle", 0.9), n(6, 0.8, 196, "triangle", 0.9), n(7, 0.8, 247, "triangle", 0.9),
      n(0.5, 0.08, 0, "noise", 0.18), n(1.5, 0.08, 0, "noise", 0.18), n(2.5, 0.08, 0, "noise", 0.18), n(3.5, 0.08, 0, "noise", 0.18),
      n(4.5, 0.08, 0, "noise", 0.18), n(5.5, 0.08, 0, "noise", 0.18), n(6.5, 0.08, 0, "noise", 0.18), n(7.5, 0.08, 0, "noise", 0.18),
    ],
  },
  // 王道体操曲(あいうべたいそう): ラジオ体操風マーチ+アルベルティ・バス
  aiube: {
    bpm: 126,
    loopBeats: 8,
    intro: [
      n(0, 0.3, 392), n(0.35, 0.3, 392), n(0.7, 0.3, 392), n(1.05, 0.7, 523, "square", 1.1),
      n(0, 0.3, 131, "triangle"), n(1.05, 0.5, 131, "triangle"),
    ],
    loop: [
      n(0, 0.5, 523), n(0.5, 0.5, 587), n(1, 0.5, 659), n(1.5, 0.5, 698), n(2, 1, 784), n(3, 1, 784),
      n(4, 0.5, 880), n(4.5, 0.5, 784), n(5, 0.5, 698), n(5.5, 0.5, 659), n(6, 1, 587), n(7, 1, 523),
      n(0, 0.4, 131, "triangle", 0.9), n(0.5, 0.4, 196, "triangle", 0.7), n(1, 0.4, 165, "triangle", 0.7), n(1.5, 0.4, 196, "triangle", 0.7),
      n(2, 0.4, 131, "triangle", 0.9), n(2.5, 0.4, 196, "triangle", 0.7), n(3, 0.4, 165, "triangle", 0.7), n(3.5, 0.4, 196, "triangle", 0.7),
      n(4, 0.4, 175, "triangle", 0.9), n(4.5, 0.4, 220, "triangle", 0.7), n(5, 0.4, 175, "triangle", 0.7), n(5.5, 0.4, 220, "triangle", 0.7),
      n(6, 0.4, 196, "triangle", 0.9), n(6.5, 0.4, 247, "triangle", 0.7), n(7, 0.4, 196, "triangle", 0.7), n(7.5, 0.4, 247, "triangle", 0.7),
    ],
  },
  // ラテン風(ほっぺふうせん): クラーベ+シンコペーションのモントゥーノ
  fuusen: {
    bpm: 116,
    loopBeats: 8,
    intro: [
      n(0, 0.15, 0, "noise", 0.5), n(0.5, 0.15, 0, "noise", 0.5), n(1, 0.5, 523, "triangle"), n(1.3, 0.5, 659, "triangle", 1.1),
    ],
    loop: [
      n(0, 0.5, 523, "triangle"), n(0.5, 0.5, 659, "triangle"), n(1.5, 0.5, 784, "triangle"), n(2, 0.5, 659, "triangle"),
      n(2.5, 0.5, 523, "triangle"), n(3.5, 0.5, 587, "triangle"), n(4, 0.5, 698, "triangle"), n(4.5, 0.5, 880, "triangle"),
      n(5.5, 0.5, 784, "triangle"), n(6, 0.5, 659, "triangle"), n(6.5, 1, 523, "triangle"),
      n(0, 0.7, 131, "triangle", 0.9), n(2.5, 0.5, 196, "triangle", 0.9), n(4, 0.7, 220, "triangle", 0.9), n(6.5, 0.5, 196, "triangle", 0.9),
      n(0, 0.1, 2400, "noise", 0.35), n(1.5, 0.1, 2400, "noise", 0.35), n(3, 0.1, 2400, "noise", 0.35),
      n(5, 0.1, 2400, "noise", 0.35), n(6, 0.1, 2400, "noise", 0.35),
    ],
  },
  // かわいいポップ(ちゅーのくち): キラキラの跳ねるポップ
  chu: {
    bpm: 132,
    loopBeats: 8,
    intro: [
      n(0, 0.25, 659, "triangle"), n(0.3, 0.25, 880, "triangle"), n(0.6, 0.25, 988, "triangle"), n(0.9, 0.5, 1319, "sine", 0.9),
    ],
    loop: [
      n(0, 0.5, 659, "triangle"), n(0.5, 0.5, 784, "triangle"), n(1, 0.5, 880, "triangle"), n(1.5, 0.5, 988, "triangle"),
      n(2, 0.5, 880, "triangle"), n(2.5, 0.5, 784, "triangle"), n(3, 1, 659, "triangle"),
      n(4, 0.5, 523, "triangle"), n(4.5, 0.5, 659, "triangle"), n(5, 0.5, 784, "triangle"), n(5.5, 0.5, 880, "triangle"),
      n(6, 1, 988, "triangle"), n(7, 1, 1047, "triangle"),
      n(3.5, 0.2, 2093, "sine", 0.4), n(7.5, 0.2, 2637, "sine", 0.4),
      n(0, 0.4, 131, "triangle", 0.9), n(1, 0.4, 220, "triangle", 0.8), n(2, 0.4, 131, "triangle", 0.9), n(3, 0.4, 220, "triangle", 0.8),
      n(4, 0.4, 175, "triangle", 0.9), n(5, 0.4, 220, "triangle", 0.8), n(6, 0.4, 196, "triangle", 0.9), n(7, 0.4, 196, "triangle", 0.8),
    ],
  },
};

/** 10体操が別譜面であることを検証するための安定した要約。 */
export function taisouTuneSignature(missionId: string): string | null {
  const tune = TUNES[missionId];
  if (tune === undefined) return null;
  return JSON.stringify({ bpm: tune.bpm, swing: tune.swing ?? 0, loopBeats: tune.loopBeats, intro: tune.intro, loop: tune.loop });
}

const LOOP_SCHEDULE_LOOKAHEAD_SEC = 0.3;

export class TaisouMusic {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private loopGain: GainNode | null = null;
  private loopTimer: number | null = null;
  private masterVolume = 0.3;

  private getCtx(): AudioContext | null {
    if (typeof window === "undefined" || typeof AudioContext === "undefined") {
      return null;
    }
    if (this.ctx === null) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer === null) {
      const length = Math.floor(ctx.sampleRate * 0.3);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  private scheduleTone(ctx: AudioContext, dest: AudioNode, start: number, dur: number, freq: number, wave: OscillatorType, gainScale: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(dest);
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, start);
    const peak = this.masterVolume * 0.4 * gainScale;
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private scheduleNoise(ctx: AudioContext, dest: AudioNode, start: number, dur: number, centerFreq: number, gainScale: number): void {
    const source = ctx.createBufferSource();
    source.buffer = this.getNoiseBuffer(ctx);
    const gain = ctx.createGain();
    if (centerFreq > 0) {
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(centerFreq, start);
      filter.Q.setValueAtTime(1.2, start);
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }
    gain.connect(dest);
    const peak = this.masterVolume * 0.5 * gainScale;
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    source.start(start);
    source.stop(start + dur + 0.02);
  }

  private scheduleNotes(notes: SynthNote[], bpm: number, swing: number, when: number, dest: AudioNode, ctx: AudioContext): void {
    const beatSec = 60 / bpm;
    for (const note of notes) {
      const isOffBeat = Math.abs((note.t % 1) - 0.5) < 0.01;
      const swingOffset = swing > 0 && isOffBeat ? swing * beatSec : 0;
      const start = when + note.t * beatSec + swingOffset;
      const dur = Math.max(note.d * beatSec, 0.05);
      if (note.w === "noise") {
        this.scheduleNoise(ctx, dest, start, dur, note.f, note.g ?? 1);
      } else {
        this.scheduleTone(ctx, dest, start, dur, note.f, note.w ?? "square", note.g ?? 1);
      }
    }
  }

  /** 体操固有のイントロジングル(かけ声フェーズで鳴らす、約1秒) */
  playIntro(missionId: string): void {
    const ctx = this.getCtx();
    if (ctx === null) {
      return;
    }
    const tune = TUNES[missionId] ?? TUNES.aan;
    this.scheduleNotes(tune.intro, tune.bpm, tune.swing ?? 0, ctx.currentTime + 0.02, ctx.destination, ctx);
  }

  /** 本編ループ音楽の開始(停止まで繰り返し) */
  startLoop(missionId: string): void {
    this.stopLoop();
    const ctx = this.getCtx();
    if (ctx === null) {
      return;
    }
    const tune = TUNES[missionId] ?? TUNES.aan;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.connect(ctx.destination);
    this.loopGain = gain;
    const barSec = tune.loopBeats * (60 / tune.bpm);
    let nextBarTime = ctx.currentTime + 0.05;
    const scheduleBar = (): void => {
      this.scheduleNotes(tune.loop, tune.bpm, tune.swing ?? 0, nextBarTime, gain, ctx);
      nextBarTime += barSec;
      const waitMs = Math.max((nextBarTime - ctx.currentTime - LOOP_SCHEDULE_LOOKAHEAD_SEC) * 1000, 50);
      this.loopTimer = window.setTimeout(scheduleBar, waitMs);
    };
    scheduleBar();
  }

  /** 本編ループ音楽の停止(フェードアウト) */
  stopLoop(): void {
    if (this.loopTimer !== null) {
      window.clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    const gain = this.loopGain;
    this.loopGain = null;
    if (gain !== null && this.ctx !== null) {
      const now = this.ctx.currentTime;
      gain.gain.setTargetAtTime(0.0001, now, 0.06);
      window.setTimeout(() => {
        try {
          gain.disconnect();
        } catch {
          // すでに切断済みなら無視
        }
      }, 500);
    }
  }

  /** 予告フェーズのドラムロール(約1.2秒、クレッシェンド) */
  playDrumroll(durationMs = 1200): void {
    const ctx = this.getCtx();
    if (ctx === null) {
      return;
    }
    const now = ctx.currentTime + 0.02;
    const hits = Math.floor(durationMs / 45);
    for (let i = 0; i < hits; i++) {
      const t = now + (i * durationMs) / 1000 / hits;
      const grow = 0.15 + (0.6 * i) / hits;
      this.scheduleNoise(ctx, ctx.destination, t, 0.05, 900, grow);
    }
    // 締めのシンバル
    this.scheduleNoise(ctx, ctx.destination, now + durationMs / 1000, 0.4, 5000, 0.8);
  }

  /** できた!の拍手ファンファーレ */
  playFanfare(): void {
    const ctx = this.getCtx();
    if (ctx === null) {
      return;
    }
    const now = ctx.currentTime + 0.02;
    const lead: [number, number][] = [
      [523, 0], [659, 0.13], [784, 0.26], [1047, 0.42],
    ];
    for (const [freq, offset] of lead) {
      this.scheduleTone(ctx, ctx.destination, now + offset, offset >= 0.42 ? 0.7 : 0.18, freq, "square", 1.1);
    }
    // 和音でジャーン
    for (const freq of [523, 659, 784]) {
      this.scheduleTone(ctx, ctx.destination, now + 0.42, 0.8, freq, "triangle", 0.6);
    }
    // 拍手(ノイズバースト)
    const claps = [0.5, 0.62, 0.76, 0.88, 1.02, 1.16, 1.3];
    for (const offset of claps) {
      this.scheduleNoise(ctx, ctx.destination, now + offset, 0.07, 1800, 0.55);
    }
  }

  dispose(): void {
    this.stopLoop();
    if (this.ctx !== null) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.noiseBuffer = null;
  }
}

// AudioContext はブラウザごとに生成上限があるためモジュール共有の1インスタンスを使う
let shared: TaisouMusic | null = null;

export function getTaisouMusic(): TaisouMusic {
  if (shared === null) {
    shared = new TaisouMusic();
  }
  return shared;
}
