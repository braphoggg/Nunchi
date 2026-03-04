import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSoundEngine } from "../useSoundEngine";

// Mock AudioContext as a class since jsdom doesn't implement it.
// The singleton in audio-context.ts calls `new AudioContext()`.
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockResume = vi.fn().mockResolvedValue(undefined);
const mockConnect = vi.fn().mockReturnValue({ connect: vi.fn().mockReturnValue({ connect: vi.fn() }) });
const mockStart = vi.fn();
const mockStop = vi.fn();

const mockGainParam = {
  value: 1,
  cancelScheduledValues: vi.fn(),
  setValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
};

class MockAudioContext {
  sampleRate = 44100;
  currentTime = 0;
  state = "running" as AudioContextState;
  destination = {};
  close = mockClose;
  resume = mockResume;
  createBuffer = vi.fn(() => ({
    getChannelData: vi.fn(() => new Float32Array(1764)),
  }));
  createBufferSource = vi.fn(() => ({
    buffer: null,
    loop: false,
    connect: mockConnect,
    start: mockStart,
    stop: mockStop,
    onended: null as (() => void) | null,
    disconnect: vi.fn(),
  }));
  createBiquadFilter = vi.fn(() => ({
    type: "lowpass",
    frequency: { ...mockGainParam },
    Q: { value: 0 },
    connect: vi.fn().mockReturnValue({ connect: vi.fn().mockReturnValue({ connect: vi.fn() }) }),
    disconnect: vi.fn(),
  }));
  createOscillator = vi.fn(() => ({
    type: "sine",
    frequency: { ...mockGainParam },
    connect: mockConnect,
    start: mockStart,
    stop: mockStop,
    onended: null as (() => void) | null,
    disconnect: vi.fn(),
  }));
  createGain = vi.fn(() => ({
    gain: { ...mockGainParam },
    connect: vi.fn().mockReturnValue({ connect: vi.fn().mockReturnValue({ connect: vi.fn() }) }),
    disconnect: vi.fn(),
  }));
}

vi.stubGlobal("AudioContext", MockAudioContext);

// Clear singleton between tests by resetting the module
beforeEach(async () => {
  // Reset localStorage sound state
  localStorage.removeItem("nunchi-sound-muted");
  localStorage.removeItem("nunchi-sound-volume");
  // Reset the audio-context singleton by re-importing
  const mod = await import("@/lib/sound/audio-context");
  mod.disposeAudioContext();
});

describe("useSoundEngine", () => {
  it("returns the expected interface", () => {
    const { result } = renderHook(() => useSoundEngine());
    expect(typeof result.current.playKeyClick).toBe("function");
    expect(typeof result.current.playAmbientHum).toBe("function");
    expect(typeof result.current.toggleMute).toBe("function");
    expect(typeof result.current.muted).toBe("boolean");
    // New API
    expect(typeof result.current.startAmbient).toBe("function");
    expect(typeof result.current.playMessageSend).toBe("function");
    expect(typeof result.current.playJamoPress).toBe("function");
    expect(typeof result.current.playCardFlip).toBe("function");
    expect(typeof result.current.playXPDing).toBe("function");
    expect(typeof result.current.playGoshiwonEvent).toBe("function");
    expect(typeof result.current.volume).toBe("number");
    expect(typeof result.current.setVolume).toBe("function");
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

  it("starts with default volume of 80", () => {
    const { result } = renderHook(() => useSoundEngine());
    expect(result.current.volume).toBe(80);
  });

  it("setVolume updates volume state", () => {
    const { result } = renderHook(() => useSoundEngine());
    act(() => {
      result.current.setVolume(50);
    });
    expect(result.current.volume).toBe(50);
  });

  it("setVolume clamps to 0-100 range", () => {
    const { result } = renderHook(() => useSoundEngine());
    act(() => {
      result.current.setVolume(150);
    });
    expect(result.current.volume).toBe(100);
    act(() => {
      result.current.setVolume(-10);
    });
    expect(result.current.volume).toBe(0);
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
