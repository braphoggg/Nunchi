import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ─── mocks ────────────────────────────────────────────────────────

const mockDismissEvent = vi.fn();
vi.mock("../useGoshiwonEvents", () => ({
  useGoshiwonEvents: vi.fn(() => ({
    activeEvent: null,
    dismissEvent: mockDismissEvent,
  })),
}));

vi.mock("../useNightProgression", () => ({
  useNightProgression: vi.fn(() => ({
    stage: 0,
    styleOverrides: {},
  })),
}));

vi.mock("@/lib/message-utils", () => ({
  getTextContent: vi.fn((m: { content: string }) =>
    typeof m.content === "string" ? m.content : "",
  ),
}));

vi.mock("@/lib/mood-engine", () => ({
  computeKoreanRatio: vi.fn(() => 0),
  getMoodLevel: vi.fn(() => "neutral"),
}));

import { useAtmosphere } from "../useAtmosphere";
import { useGoshiwonEvents } from "../useGoshiwonEvents";
import { useNightProgression } from "../useNightProgression";
import { getMoodLevel, computeKoreanRatio } from "@/lib/mood-engine";

// ─── helpers ──────────────────────────────────────────────────────

function makeSoundEngine() {
  return {
    startAmbient: vi.fn(),
    stopAmbient: vi.fn(),
    setNightStage: vi.fn(),
    setMoodLevel: vi.fn(),
    startTyping: vi.fn(),
    stopTyping: vi.fn(),
    playMessageReceive: vi.fn(),
    playXPDing: vi.fn(),
    playGoshiwonEvent: vi.fn(),
    playTutorialStep: vi.fn(),
    // Other methods from useSoundEngine not used by useAtmosphere
    playClick: vi.fn(),
    playSuccess: vi.fn(),
    playError: vi.fn(),
    playVocabSave: vi.fn(),
    playVocabDelete: vi.fn(),
    muted: false,
    volume: 80,
    setMuted: vi.fn(),
    setVolume: vi.fn(),
  } as unknown as ReturnType<typeof import("../useSoundEngine").useSoundEngine>;
}

function makeTutorial(overrides: Partial<{ isActive: boolean; currentStepIndex: number }> = {}) {
  return {
    isActive: false,
    currentStepIndex: 0,
    currentStep: null,
    totalSteps: 5,
    startTutorial: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    skipTutorial: vi.fn(),
    completeInteraction: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof import("../useTutorial").useTutorial>;
}

type UIMessage = { id: string; role: "user" | "assistant"; content: string; parts: unknown[] };

function makeMessage(role: "user" | "assistant", content: string): UIMessage {
  return { id: Math.random().toString(), role, content, parts: [{ type: "text", text: content }] };
}

function defaultOpts(overrides: Record<string, unknown> = {}) {
  return {
    messages: [] as UIMessage[],
    isLoading: false,
    recentXPGain: null as { amount: number; action: string } | null,
    sound: makeSoundEngine(),
    tutorial: makeTutorial(),
    ...overrides,
  };
}

// ─── tests ────────────────────────────────────────────────────────

describe("useAtmosphere", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to defaults
    vi.mocked(useGoshiwonEvents).mockReturnValue({
      activeEvent: null,
      dismissEvent: mockDismissEvent,
    });
    vi.mocked(useNightProgression).mockReturnValue({
      stage: 0,
      styleOverrides: {},
    });
    vi.mocked(getMoodLevel).mockReturnValue("neutral");
    vi.mocked(computeKoreanRatio).mockReturnValue(0);
  });

  it("returns neutral mood when messages are empty", () => {
    const opts = defaultOpts();
    const { result } = renderHook(() => useAtmosphere(opts));
    expect(result.current.currentMood).toBe("neutral");
  });

  it("starts ambient on mount", () => {
    const opts = defaultOpts();
    renderHook(() => useAtmosphere(opts));
    expect(opts.sound.startAmbient).toHaveBeenCalledTimes(1);
  });

  it("stops ambient on unmount", () => {
    const opts = defaultOpts();
    const { unmount } = renderHook(() => useAtmosphere(opts));
    unmount();
    expect(opts.sound.stopAmbient).toHaveBeenCalledTimes(1);
  });

  it("calls startTyping when isLoading is true", () => {
    const opts = defaultOpts({ isLoading: true });
    renderHook(() => useAtmosphere(opts));
    expect(opts.sound.startTyping).toHaveBeenCalled();
  });

  it("calls stopTyping when isLoading becomes false (cleanup)", () => {
    const sound = makeSoundEngine();
    const { rerender } = renderHook(
      ({ isLoading }) => useAtmosphere(defaultOpts({ isLoading, sound })),
      { initialProps: { isLoading: true } },
    );
    rerender({ isLoading: false });
    expect(sound.stopTyping).toHaveBeenCalled();
  });

  it("plays message receive sound when new assistant message arrives", () => {
    const sound = makeSoundEngine();
    const msgs: UIMessage[] = [makeMessage("user", "hello")];
    const { rerender } = renderHook(
      ({ messages, isLoading }) =>
        useAtmosphere(defaultOpts({ messages, isLoading, sound })),
      { initialProps: { messages: msgs, isLoading: false } },
    );

    // Simulate assistant message arriving (isLoading was true, now false with new msg)
    const newMsgs = [...msgs, makeMessage("assistant", "안녕하세요")];
    rerender({ messages: newMsgs, isLoading: false });
    expect(sound.playMessageReceive).toHaveBeenCalled();
  });

  it("does NOT play receive sound when new user message arrives", () => {
    const sound = makeSoundEngine();
    const msgs: UIMessage[] = [makeMessage("assistant", "안녕")];
    const { rerender } = renderHook(
      ({ messages, isLoading }) =>
        useAtmosphere(defaultOpts({ messages, isLoading, sound })),
      { initialProps: { messages: msgs, isLoading: false } },
    );

    const newMsgs = [...msgs, makeMessage("user", "hello")];
    rerender({ messages: newMsgs, isLoading: false });
    expect(sound.playMessageReceive).not.toHaveBeenCalled();
  });

  it("plays XP ding when recentXPGain changes to non-null", () => {
    const sound = makeSoundEngine();
    const { rerender } = renderHook(
      ({ xp }) =>
        useAtmosphere(defaultOpts({ recentXPGain: xp, sound })),
      { initialProps: { xp: null as { amount: number; action: string } | null } },
    );

    rerender({ xp: { amount: 10, action: "message" } });
    expect(sound.playXPDing).toHaveBeenCalled();
  });

  it("does NOT play XP ding when recentXPGain is null", () => {
    const sound = makeSoundEngine();
    renderHook(() =>
      useAtmosphere(defaultOpts({ recentXPGain: null, sound })),
    );
    expect(sound.playXPDing).not.toHaveBeenCalled();
  });

  it("syncs night stage with sound engine", () => {
    vi.mocked(useNightProgression).mockReturnValue({
      stage: 2,
      styleOverrides: { filter: "brightness(0.8)" },
    });
    const sound = makeSoundEngine();
    renderHook(() => useAtmosphere(defaultOpts({ sound })));
    expect(sound.setNightStage).toHaveBeenCalledWith(2);
  });

  it("syncs mood level with sound engine", () => {
    vi.mocked(getMoodLevel).mockReturnValue("warm");
    const sound = makeSoundEngine();
    const msgs = [makeMessage("user", "안녕하세요")];
    renderHook(() => useAtmosphere(defaultOpts({ messages: msgs, sound })));
    expect(sound.setMoodLevel).toHaveBeenCalledWith("warm");
  });

  it("plays tutorial step sound when tutorial progresses past step 0", () => {
    const sound = makeSoundEngine();
    const tutorial = makeTutorial({ isActive: true, currentStepIndex: 1 });
    renderHook(() => useAtmosphere(defaultOpts({ sound, tutorial })));
    expect(sound.playTutorialStep).toHaveBeenCalled();
  });

  it("does NOT play tutorial step sound when tutorial is inactive", () => {
    const sound = makeSoundEngine();
    const tutorial = makeTutorial({ isActive: false, currentStepIndex: 2 });
    renderHook(() => useAtmosphere(defaultOpts({ sound, tutorial })));
    expect(sound.playTutorialStep).not.toHaveBeenCalled();
  });

  it("does NOT play tutorial step sound on step 0", () => {
    const sound = makeSoundEngine();
    const tutorial = makeTutorial({ isActive: true, currentStepIndex: 0 });
    renderHook(() => useAtmosphere(defaultOpts({ sound, tutorial })));
    expect(sound.playTutorialStep).not.toHaveBeenCalled();
  });

  it("returns nightStage and styleOverrides from useNightProgression", () => {
    vi.mocked(useNightProgression).mockReturnValue({
      stage: 3,
      styleOverrides: { opacity: 0.5 },
    });
    const { result } = renderHook(() => useAtmosphere(defaultOpts()));
    expect(result.current.nightStage).toBe(3);
    expect(result.current.styleOverrides).toEqual({ opacity: 0.5 });
  });

  it("plays goshiwon event sound when activeEvent is present", () => {
    vi.mocked(useGoshiwonEvents).mockReturnValue({
      activeEvent: { id: "e1", korean: "소리", english: "a door creaks" },
      dismissEvent: mockDismissEvent,
    });
    const sound = makeSoundEngine();
    renderHook(() => useAtmosphere(defaultOpts({ sound })));
    expect(sound.playGoshiwonEvent).toHaveBeenCalledWith("a door creaks");
  });

  it("returns dismissEvent from useGoshiwonEvents", () => {
    const { result } = renderHook(() => useAtmosphere(defaultOpts()));
    expect(result.current.dismissEvent).toBe(mockDismissEvent);
  });
});
