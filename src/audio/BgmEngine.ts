/**
 * BgmEngine - Web Audio API完全合成のループBGM(08_設計書 §1)。
 * 音源ファイルなし・著作権リスクゼロ。lookaheadスケジューラ方式
 * (setIntervalで先読みし、AudioContext時刻に正確に予約する定番パターン)。
 * 4曲はすべてオリジナル作曲(雰囲気参照のみ、既存旋律の複製なし)。
 */
import { BGM_TRACK_IDS, DEFAULT_BGM_VOLUME, type BgmTrackId } from "../fuwafuwa-land/types";

export type BgmMusicId = Exclude<BgmTrackId, "off">;
export type BgmPercKind = "kick" | "hat" | "taiko" | "woodblock";

export interface BgmToneNote {
  /** ループ先頭からの拍位置(0始まり) */
  beat: number;
  /** 周波数Hz */
  freq: number;
  /** 拍単位の長さ */
  durBeats: number;
  gain: number;
  wave: OscillatorType;
}

export interface BgmPercNote {
  beat: number;
  kind: BgmPercKind;
  gain: number;
}

export interface BgmTrackData {
  id: BgmMusicId;
  title: string;
  bpm: number;
  beatsPerBar: number;
  bars: number;
  /** 裏拍8分を遅らせる量(拍単位)。0でストレート */
  swing: number;
  tones: BgmToneNote[];
  percs: BgmPercNote[];
}

// ---- 音名→周波数 ----------------------------------------------------------

const NOTE_SEMITONES: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

function noteFreq(name: string): number {
  const match = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (match === null) {
    throw new Error(`invalid_note_name: ${name}`);
  }
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  const semitonesFromA4 = NOTE_SEMITONES[match[1]] + accidental + (Number(match[3]) - 4) * 12;
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

type LaneNote = [beat: number, note: string, durBeats: number, gainOverride?: number];

function lane(wave: OscillatorType, gain: number, notes: LaneNote[]): BgmToneNote[] {
  return notes.map(([beat, note, durBeats, gainOverride]) => ({ beat, freq: noteFreq(note), durBeats, gain: gainOverride ?? gain, wave }));
}

function chord(beat: number, notes: string[], durBeats: number, gain: number, wave: OscillatorType): BgmToneNote[] {
  return notes.map((note) => ({ beat, freq: noteFreq(note), durBeats, gain, wave }));
}

function perc(kind: BgmPercKind, gain: number, beats: number[]): BgmPercNote[] {
  return beats.map((beat) => ({ beat, kind, gain }));
}

function barBeats(beatsPerBar: number, bars: number, localBeats: number[]): number[] {
  const result: number[] = [];
  for (let bar = 0; bar < bars; bar += 1) {
    localBeats.forEach((local) => result.push(bar * beatsPerBar + local));
  }
  return result;
}

// ---- 楽曲データ ------------------------------------------------------------

/** ふわふわマーチ: 昭和歌謡×行進曲調。C長調・スウィング8分・I-vi-ii-V */
function buildFuwafuwaMarch(): BgmTrackData {
  const melody = lane("square", 0.042, [
    // A: 呼びかけフレーズ
    [0, "E5", 0.5], [0.5, "C5", 0.5], [1, "D5", 0.5], [1.5, "E5", 0.5], [2, "G5", 1], [3, "E5", 1],
    [4, "A4", 0.5], [4.5, "B4", 0.5], [5, "C5", 1], [6, "E5", 1], [7, "C5", 1],
    [8, "D5", 0.5], [8.5, "E5", 0.5], [9, "F5", 1], [10, "A5", 1], [11, "F5", 0.5], [11.5, "E5", 0.5],
    [12, "D5", 1], [13, "B4", 1], [14, "G4", 1.5], [15.5, "G4", 0.5],
    // A': 応答フレーズ(主音へ帰着)
    [16, "E5", 0.5], [16.5, "C5", 0.5], [17, "D5", 0.5], [17.5, "E5", 0.5], [18, "G5", 1], [19, "A5", 1],
    [20, "A5", 1], [21, "E5", 1], [22, "C5", 1], [23, "E5", 1],
    [24, "F5", 0.5], [24.5, "E5", 0.5], [25, "D5", 1], [26, "A4", 1], [27, "D5", 1],
    [28, "B4", 0.5], [28.5, "A4", 0.5], [29, "B4", 0.5], [29.5, "C5", 0.5], [30, "D5", 2],
  ]);
  const bassNotes: Array<[string, string, string, string]> = [
    ["C3", "E3", "G3", "E3"], ["A2", "C3", "E3", "C3"], ["D3", "F3", "A3", "F3"], ["G2", "B2", "D3", "B2"],
    ["C3", "E3", "G3", "E3"], ["A2", "C3", "E3", "C3"], ["D3", "F3", "A3", "F3"], ["G2", "B2", "D3", "B2"],
  ];
  const bass = lane(
    "triangle",
    0.07,
    bassNotes.flatMap((walk, bar): LaneNote[] => walk.map((note, index): LaneNote => [bar * 4 + index, note, 0.9])),
  );
  const stabChords = [
    ["C4", "E4", "G4"], ["A3", "C4", "E4"], ["D4", "F4", "A4"], ["B3", "D4", "G4"],
    ["C4", "E4", "G4"], ["A3", "C4", "E4"], ["D4", "F4", "A4"], ["B3", "D4", "G4"],
  ];
  const stabs = stabChords.flatMap((notes, bar) => [
    ...chord(bar * 4 + 1.5, notes, 0.25, 0.022, "triangle"),
    ...chord(bar * 4 + 3.5, notes, 0.25, 0.022, "triangle"),
  ]);
  return {
    id: "fuwafuwa_march",
    title: "ふわふわマーチ",
    bpm: 132,
    beatsPerBar: 4,
    bars: 8,
    swing: 0.17,
    tones: [...melody, ...bass, ...stabs],
    percs: [
      ...perc("kick", 0.1, barBeats(4, 8, [0])),
      ...perc("kick", 0.075, barBeats(4, 8, [2])),
      ...perc("hat", 0.02, barBeats(4, 8, [0, 1, 2, 3])),
      ...perc("hat", 0.012, barBeats(4, 8, [0.5, 1.5, 2.5, 3.5])),
    ],
  };
}

/** ひだまりさんぽ: F長調・のんびりI-IV-V-IV・サイン波リード */
function buildHidamariSanpo(): BgmTrackData {
  const melody = lane("sine", 0.06, [
    [0, "A4", 1], [1, "G4", 1], [2, "F4", 2],
    [4, "Bb4", 1.5], [5.5, "C5", 0.5], [6, "D5", 2],
    [8, "E5", 1], [9, "D5", 1], [10, "C5", 2],
    [12, "D5", 1], [13, "C5", 1], [14, "A4", 2],
    [16, "F4", 1], [17, "G4", 1], [18, "A4", 2],
    [20, "Bb4", 1], [21, "C5", 1], [22, "D5", 2],
    [24, "C5", 1], [25, "D5", 1], [26, "E5", 2],
    [28, "D5", 1], [29, "C5", 1], [30, "G4", 2],
  ]);
  const arpeggioChords = [
    ["F3", "A3", "C4", "A3"], ["Bb2", "D3", "F3", "D3"], ["C3", "E3", "G3", "E3"], ["Bb2", "D3", "F3", "D3"],
    ["F3", "A3", "C4", "A3"], ["Bb2", "D3", "F3", "D3"], ["C3", "E3", "G3", "E3"], ["Bb2", "D3", "F3", "D3"],
  ];
  const arpeggio = lane(
    "triangle",
    0.028,
    arpeggioChords.flatMap((notes, bar): LaneNote[] => {
      const doubled = [...notes, ...notes];
      return doubled.map((note, index): LaneNote => [bar * 4 + index * 0.5, note, 0.45]);
    }),
  );
  const roots = ["F2", "Bb2", "C3", "Bb2", "F2", "Bb2", "C3", "Bb2"];
  const bass = lane("sine", 0.07, roots.map((note, bar): LaneNote => [bar * 4, note, 3.6]));
  return {
    id: "hidamari_sanpo",
    title: "ひだまりさんぽ",
    bpm: 96,
    beatsPerBar: 4,
    bars: 8,
    swing: 0,
    tones: [...melody, ...arpeggio, ...bass],
    percs: perc("kick", 0.04, barBeats(4, 8, [0])),
  };
}

/** おまつりばやし: Aマイナーペンタ・太鼓強め・掛け合いフレーズ */
function buildOmatsuri(): BgmTrackData {
  const melody = lane("square", 0.034, [
    // 呼び(コール)
    [0, "A4", 0.5], [0.5, "C5", 0.5], [1, "D5", 0.5], [1.5, "E5", 1.5],
    // 応え(レスポンス)
    [4, "G5", 0.5], [4.5, "E5", 0.5], [5, "D5", 0.5], [5.5, "C5", 0.5], [6, "A4", 1.5],
    // 呼び(高音)
    [8, "E5", 0.5], [8.5, "G5", 0.5], [9, "A5", 0.5], [9.5, "G5", 1.5],
    // 応え(締め)
    [12, "E5", 0.5], [12.5, "D5", 0.5], [13, "C5", 0.5], [13.5, "D5", 0.5], [14, "A4", 2],
  ]);
  const bass = lane("sine", 0.06, [
    [0, "A2", 2], [2, "A2", 2],
    [4, "A2", 2], [6, "G2", 2],
    [8, "A2", 2], [10, "A2", 2],
    [12, "G2", 2], [14, "A2", 2],
  ]);
  return {
    id: "omatsuri",
    title: "おまつりばやし",
    bpm: 140,
    beatsPerBar: 4,
    bars: 4,
    swing: 0,
    tones: [...melody, ...bass],
    percs: [
      ...perc("taiko", 0.14, barBeats(4, 4, [0])),
      ...perc("taiko", 0.1, barBeats(4, 4, [1, 3])),
      ...perc("taiko", 0.12, barBeats(4, 4, [2])),
      ...perc("taiko", 0.08, barBeats(4, 4, [2.5])),
      ...perc("woodblock", 0.05, barBeats(4, 4, [0.5, 1.5, 2.5, 3.5])),
      ...perc("woodblock", 0.04, [7.75, 15.75]),
    ],
  };
}

/** ほしぞらワルツ: 3拍子・C長調・アルペジオ主体・子守唄コンター */
function buildHoshizoraWaltz(): BgmTrackData {
  const melody = lane("triangle", 0.055, [
    [0, "E5", 2], [2, "G5", 1],
    [3, "A5", 2], [5, "E5", 1],
    [6, "F5", 1], [7, "E5", 1], [8, "D5", 1],
    [9, "D5", 2], [11, "B4", 1],
    [12, "C5", 2], [14, "E5", 1],
    [15, "A4", 1], [16, "C5", 1], [17, "E5", 1],
    [18, "A5", 1], [19, "G5", 1], [20, "F5", 1],
    [21, "D5", 1], [22, "B4", 1], [23, "G4", 1],
  ]);
  const roots = ["C3", "A2", "F2", "G2", "C3", "A2", "F2", "G2"];
  const bass = lane("triangle", 0.065, roots.map((note, bar): LaneNote => [bar * 3, note, 0.9]));
  const arpeggioPairs: Array<[string, string]> = [
    ["E4", "G4"], ["C4", "E4"], ["A3", "C4"], ["B3", "D4"],
    ["E4", "G4"], ["C4", "E4"], ["A3", "C4"], ["B3", "D4"],
  ];
  const arpeggio = lane(
    "sine",
    0.03,
    arpeggioPairs.flatMap(([third, fifth], bar): LaneNote[] => [
      [bar * 3 + 1, third, 0.8],
      [bar * 3 + 2, fifth, 0.8],
    ]),
  );
  return {
    id: "hoshizora_waltz",
    title: "ほしぞらワルツ",
    bpm: 84,
    beatsPerBar: 3,
    bars: 8,
    swing: 0,
    tones: [...melody, ...bass, ...arpeggio],
    percs: [],
  };
}

export const BGM_TRACKS: Record<BgmMusicId, BgmTrackData> = {
  fuwafuwa_march: buildFuwafuwaMarch(),
  hidamari_sanpo: buildHidamariSanpo(),
  omatsuri: buildOmatsuri(),
  hoshizora_waltz: buildHoshizoraWaltz(),
};

export const BGM_MUSIC_IDS: readonly BgmMusicId[] = BGM_TRACK_IDS.filter((id): id is BgmMusicId => id !== "off");

// ---- エンジン --------------------------------------------------------------

interface ScheduledNote {
  beat: number;
  kind: "tone" | "perc";
  tone?: BgmToneNote;
  percNote?: BgmPercNote;
}

interface Playback {
  track: BgmTrackData;
  events: ScheduledNote[];
  index: number;
  loop: number;
  startTime: number;
  bus: GainNode;
}

/** バックグラウンドタブのsetIntervalスロットリング(1s)を跨げる先読み量 */
const SCHEDULE_AHEAD_S = 1.6;
const TICK_MS = 150;
const DUCK_RATIO = 0.4;
const GAIN_SMOOTH_S = 0.1;

export class BgmEngine {
  private ctx: AudioContext | null;
  private readonly ownsContext: boolean;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private trackId: BgmTrackId = "off";
  private volume = DEFAULT_BGM_VOLUME;
  private ducked = false;
  private playback: Playback | null = null;
  private disposed = false;

  constructor(context?: AudioContext) {
    this.ctx = context ?? null;
    this.ownsContext = context === undefined;
  }

  /** ユーザー操作(音ONなど)後に呼ぶ。AudioContextをresumeして再生を開始する */
  async unlock(): Promise<boolean> {
    if (this.disposed) {
      return false;
    }
    const ctx = this.ensureContext();
    if (ctx === null) {
      return false;
    }
    try {
      await ctx.resume();
    } catch {
      return false;
    }
    this.startPlaybackIfNeeded();
    return true;
  }

  /** 何度呼んでも安全。同じidなら何もしない */
  setTrack(id: BgmTrackId): void {
    if (this.disposed || this.trackId === id) {
      return;
    }
    this.trackId = id;
    this.stopPlayback();
    this.startPlaybackIfNeeded();
  }

  getTrack(): BgmTrackId {
    return this.trackId;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyMasterGain();
  }

  /** イベント中のダッキング(音量40%) */
  duck(on: boolean): void {
    if (this.ducked === on) {
      return;
    }
    this.ducked = on;
    this.applyMasterGain();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.stopPlayback();
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ownsContext && this.ctx !== null) {
      void this.ctx.close().catch(() => undefined);
    }
    this.ctx = null;
    this.master = null;
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx !== null) {
      return this.ctx;
    }
    const AudioContextClass = typeof window !== "undefined" ? window.AudioContext : undefined;
    if (AudioContextClass === undefined) {
      return null;
    }
    this.ctx = new AudioContextClass();
    return this.ctx;
  }

  private ensureMaster(ctx: AudioContext): GainNode {
    if (this.master === null) {
      this.master = ctx.createGain();
      this.master.gain.setValueAtTime(this.currentMasterGain(), ctx.currentTime);
      this.master.connect(ctx.destination);
    }
    return this.master;
  }

  private currentMasterGain(): number {
    return this.volume * (this.ducked ? DUCK_RATIO : 1);
  }

  private applyMasterGain(): void {
    if (this.ctx === null || this.master === null) {
      return;
    }
    this.master.gain.setTargetAtTime(this.currentMasterGain(), this.ctx.currentTime, GAIN_SMOOTH_S);
  }

  private startPlaybackIfNeeded(): void {
    if (this.disposed || this.trackId === "off" || this.playback !== null) {
      return;
    }
    const ctx = this.ctx;
    if (ctx === null || ctx.state !== "running") {
      return;
    }
    const track = BGM_TRACKS[this.trackId];
    const events: ScheduledNote[] = [
      ...track.tones.map((tone): ScheduledNote => ({ beat: tone.beat, kind: "tone", tone })),
      ...track.percs.map((percNote): ScheduledNote => ({ beat: percNote.beat, kind: "perc", percNote })),
    ].sort((left, right) => left.beat - right.beat);
    if (events.length === 0) {
      return;
    }
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(1, ctx.currentTime);
    bus.connect(this.ensureMaster(ctx));
    this.playback = { track, events, index: 0, loop: 0, startTime: ctx.currentTime + 0.08, bus };
    if (this.timer === null) {
      this.timer = setInterval(() => this.scheduleTick(), TICK_MS);
    }
    this.scheduleTick();
  }

  private stopPlayback(): void {
    const playback = this.playback;
    if (playback === null) {
      return;
    }
    this.playback = null;
    const ctx = this.ctx;
    if (ctx !== null) {
      // 予約済みノートごとフェードアウトして切替時の濁りを防ぐ
      playback.bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.06);
    }
    setTimeout(() => {
      try {
        playback.bus.disconnect();
      } catch {
        // already disconnected
      }
    }, 400);
    if (this.timer !== null && this.trackId === "off") {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private scheduleTick(): void {
    const ctx = this.ctx;
    const playback = this.playback;
    if (ctx === null || playback === null) {
      return;
    }
    const { track, events } = playback;
    const secPerBeat = 60 / track.bpm;
    const loopBeats = track.beatsPerBar * track.bars;
    const horizon = ctx.currentTime + SCHEDULE_AHEAD_S;
    // 無限ループ保険: 1tickで予約するイベント数上限
    for (let guard = 0; guard < 400; guard += 1) {
      const event = events[playback.index];
      let beatPosition = playback.loop * loopBeats + event.beat;
      const fraction = event.beat % 1;
      if (track.swing > 0 && Math.abs(fraction - 0.5) < 0.001) {
        beatPosition += track.swing;
      }
      const time = playback.startTime + beatPosition * secPerBeat;
      if (time > horizon) {
        return;
      }
      if (time >= ctx.currentTime - 0.05) {
        if (event.kind === "tone" && event.tone !== undefined) {
          this.scheduleTone(ctx, playback.bus, event.tone, time, secPerBeat);
        } else if (event.percNote !== undefined) {
          this.schedulePerc(ctx, playback.bus, event.percNote, time);
        }
      }
      playback.index += 1;
      if (playback.index >= events.length) {
        playback.index = 0;
        playback.loop += 1;
      }
    }
  }

  private scheduleTone(ctx: AudioContext, bus: GainNode, tone: BgmToneNote, time: number, secPerBeat: number): void {
    const durSec = Math.max(0.05, tone.durBeats * secPerBeat * 0.92);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = tone.wave;
    oscillator.frequency.setValueAtTime(tone.freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(tone.gain, time + 0.02);
    gain.gain.setValueAtTime(tone.gain, time + durSec * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + durSec);
    oscillator.connect(gain);
    gain.connect(bus);
    oscillator.start(time);
    oscillator.stop(time + durSec + 0.05);
  }

  private schedulePerc(ctx: AudioContext, bus: GainNode, percNote: BgmPercNote, time: number): void {
    if (percNote.kind === "hat") {
      this.scheduleNoiseHit(ctx, bus, time, percNote.gain, 0.045, 6000);
      return;
    }
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    if (percNote.kind === "kick") {
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(150, time);
      oscillator.frequency.exponentialRampToValueAtTime(48, time + 0.09);
      gain.gain.setValueAtTime(percNote.gain, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
      oscillator.stop(time + 0.15);
    } else if (percNote.kind === "taiko") {
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(105, time);
      oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.2);
      gain.gain.setValueAtTime(percNote.gain, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.26);
      oscillator.stop(time + 0.3);
    } else {
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(1700, time);
      oscillator.frequency.exponentialRampToValueAtTime(1100, time + 0.04);
      gain.gain.setValueAtTime(percNote.gain, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
      oscillator.stop(time + 0.08);
    }
    oscillator.connect(gain);
    gain.connect(bus);
    oscillator.start(time);
  }

  private scheduleNoiseHit(ctx: AudioContext, bus: GainNode, time: number, gainValue: number, durSec: number, highpassHz: number): void {
    if (this.noiseBuffer === null) {
      const length = Math.max(1, Math.floor(ctx.sampleRate * 0.2));
      this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) {
        data[index] = Math.random() * 2 - 1;
      }
    }
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = highpassHz;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + durSec);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    source.start(time);
    source.stop(time + durSec + 0.02);
  }
}
