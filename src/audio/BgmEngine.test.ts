import { afterEach, describe, expect, it, vi } from "vitest";
import { BGM_MUSIC_IDS, BGM_TRACKS, BgmEngine } from "./BgmEngine";

function makeAudioContext() {
  const gains: Array<{ gain: { setValueAtTime: ReturnType<typeof vi.fn>; setTargetAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> } }> = [];
  const context = {
    state: "running",
    currentTime: 1,
    sampleRate: 44_100,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    createGain: vi.fn(() => {
      const node = { connect: vi.fn(), disconnect: vi.fn(), gain: { setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } };
      gains.push(node);
      return node;
    }),
    createOscillator: vi.fn(() => ({ type: "sine", frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
    createBuffer: vi.fn(() => ({ getChannelData: vi.fn(() => new Float32Array(32)) })),
    createBufferSource: vi.fn(() => ({ buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
    createBiquadFilter: vi.fn(() => ({ type: "highpass", frequency: { value: 0 }, connect: vi.fn() })),
  };
  return { context: context as unknown as AudioContext, gains };
}

describe("BgmEngine", () => {
  afterEach(() => vi.useRealTimers());

  it("defines four distinct generated tracks", () => {
    expect(BGM_MUSIC_IDS).toHaveLength(4);
    expect(new Set(BGM_MUSIC_IDS.map((id) => BGM_TRACKS[id].bpm)).size).toBe(4);
    expect(BGM_MUSIC_IDS.every((id) => BGM_TRACKS[id].tones.length > 0)).toBe(true);
  });

  it("keeps the selected track before unlock and ducks the master bus to 40%", async () => {
    vi.useFakeTimers();
    const { context, gains } = makeAudioContext();
    const engine = new BgmEngine(context);
    engine.setTrack("fuwafuwa_march");
    engine.setVolume(0.5);

    expect(engine.getTrack()).toBe("fuwafuwa_march");
    await engine.unlock();
    engine.duck(true);
    engine.duck(false);

    const master = gains[1];
    expect(master.gain.setTargetAtTime).toHaveBeenCalledWith(0.2, 1, 0.1);
    expect(master.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.5, 1, 0.1);
    engine.dispose();
  });
});
