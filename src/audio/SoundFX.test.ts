import { afterEach, describe, expect, it, vi } from "vitest";

import { SoundFX } from "./SoundFX";

describe("SoundFX.toothPop", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses a generated non-verbal effect without fetching recorded audio", () => {
    const oscillators: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> = [];
    const createOscillator = vi.fn(() => {
      const oscillator = {
        connect: vi.fn(),
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        start: vi.fn(),
        stop: vi.fn(),
        type: "sine" as OscillatorType,
      };
      oscillators.push(oscillator);
      return oscillator;
    });
    const context = {
      close: vi.fn(),
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
      })),
      createOscillator,
      currentTime: 1,
      destination: {},
      resume: vi.fn(),
      state: "running",
    };
    const AudioContextMock = function AudioContextMock() {
      return context;
    } as unknown as typeof AudioContext;
    const fetchMock = vi.fn();
    vi.stubGlobal("AudioContext", AudioContextMock);
    vi.stubGlobal("fetch", fetchMock);

    new SoundFX().toothPop();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(createOscillator).toHaveBeenCalledTimes(2);
    expect(oscillators.every(({ start, stop }) => start.mock.calls.length === 1 && stop.mock.calls.length === 1)).toBe(true);
  });
});
