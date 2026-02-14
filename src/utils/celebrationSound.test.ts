// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { playCelebrationSound } from "./celebrationSound";

describe("playCelebrationSound", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates oscillators and plays notes", () => {
    const mockOsc = {
      connect: vi.fn(),
      frequency: { value: 0 },
      type: "sine",
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockGain = {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };

    const mockCtx = {
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn().mockReturnValue(mockOsc),
      createGain: vi.fn().mockReturnValue(mockGain),
    };

    vi.stubGlobal("AudioContext", function () {
      return mockCtx;
    });

    playCelebrationSound();

    // 8 notes in the arpeggio
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(8);
    expect(mockCtx.createGain).toHaveBeenCalledTimes(8);
    expect(mockOsc.start).toHaveBeenCalledTimes(8);
    expect(mockOsc.stop).toHaveBeenCalledTimes(8);
  });

  it("does not throw when AudioContext is unavailable", () => {
    vi.stubGlobal("AudioContext", function () {
      throw new Error("Not available");
    });

    expect(() => playCelebrationSound()).not.toThrow();
  });
});
