import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSoundEngine } from "../useSoundEngine";

// Mock AudioContext since jsdom doesn't implement it
const mockClose = vi.fn();
const mockConnect = vi.fn().mockReturnValue({ connect: vi.fn() });
const mockStart = vi.fn();
const mockStop = vi.fn();

vi.stubGlobal(
  "AudioContext",
  vi.fn(() => ({
    sampleRate: 44100,
    currentTime: 0,
    destination: {},
    close: mockClose,
    createBuffer: vi.fn(() => ({
      getChannelData: vi.fn(() => new Float32Array(1764)),
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: mockConnect,
      start: mockStart,
    })),
    createBiquadFilter: vi.fn(() => ({
      type: "lowpass",
      frequency: { value: 0 },
      connect: vi.fn(),
    })),
    createOscillator: vi.fn(() => ({
      type: "sine",
      frequency: { value: 0 },
      connect: mockConnect,
      start: mockStart,
      stop: mockStop,
    })),
    createGain: vi.fn(() => ({
      gain: {
        value: 0,
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    })),
  }))
);

describe("useSoundEngine", () => {
  it("returns the expected interface", () => {
    const { result } = renderHook(() => useSoundEngine());
    expect(typeof result.current.playKeyClick).toBe("function");
    expect(typeof result.current.playAmbientHum).toBe("function");
    expect(typeof result.current.toggleMute).toBe("function");
    expect(typeof result.current.muted).toBe("boolean");
  });

  it("starts unmuted", () => {
    const { result } = renderHook(() => useSoundEngine());
    expect(result.current.muted).toBe(false);
  });

  it("toggleMute switches muted state", () => {
    const { result } = renderHook(() => useSoundEngine());
    expect(result.current.muted).toBe(false);

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.muted).toBe(true);

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.muted).toBe(false);
  });

  it("playKeyClick does not throw", () => {
    const { result } = renderHook(() => useSoundEngine());
    expect(() => result.current.playKeyClick()).not.toThrow();
  });

  it("playAmbientHum does not throw", () => {
    const { result } = renderHook(() => useSoundEngine());
    expect(() => result.current.playAmbientHum()).not.toThrow();
  });
});
