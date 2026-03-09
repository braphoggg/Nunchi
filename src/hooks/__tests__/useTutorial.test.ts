import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTutorial } from "../useTutorial";
import { TUTORIAL_STEPS } from "@/lib/tutorial-steps";

// ─── localStorage mock ─────────────────────────────────────────────

let storage: Record<string, string> = {};

beforeEach(() => {
  storage = {};
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => storage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ─── initial state ─────────────────────────────────────────────────

describe("useTutorial — initial state", () => {
  it("starts inactive", () => {
    const { result } = renderHook(() => useTutorial());
    expect(result.current.isActive).toBe(false);
  });

  it("has null currentStep when inactive", () => {
    const { result } = renderHook(() => useTutorial());
    expect(result.current.currentStep).toBeNull();
  });

  it("currentStepIndex is 0", () => {
    const { result } = renderHook(() => useTutorial());
    expect(result.current.currentStepIndex).toBe(0);
  });

  it("totalSteps matches TUTORIAL_STEPS length", () => {
    const { result } = renderHook(() => useTutorial());
    expect(result.current.totalSteps).toBe(TUTORIAL_STEPS.length);
  });
});

// ─── startTutorial ─────────────────────────────────────────────────

describe("useTutorial — startTutorial", () => {
  it("activates the tutorial", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.startTutorial());
    expect(result.current.isActive).toBe(true);
  });

  it("sets currentStep to the first step", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.startTutorial());
    expect(result.current.currentStep).toEqual(TUTORIAL_STEPS[0]);
  });

  it("resets index to 0 even if called mid-tutorial", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.startTutorial());
    act(() => {
      result.current.nextStep();
      vi.advanceTimersByTime(300);
    });
    expect(result.current.currentStepIndex).toBe(1);
    act(() => result.current.startTutorial());
    expect(result.current.currentStepIndex).toBe(0);
  });
});

// ─── nextStep ──────────────────────────────────────────────────────

describe("useTutorial — nextStep", () => {
  it("advances to the next step", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.startTutorial());
    act(() => {
      result.current.nextStep();
      vi.advanceTimersByTime(300);
    });
    expect(result.current.currentStepIndex).toBe(1);
    expect(result.current.currentStep).toEqual(TUTORIAL_STEPS[1]);
  });

  it("finishes tutorial when advancing past last step", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.startTutorial());

    // Advance through all steps
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      act(() => {
        result.current.nextStep();
        vi.advanceTimersByTime(300);
      });
    }

    expect(result.current.isActive).toBe(false);
    expect(result.current.currentStep).toBeNull();
  });

  it("saves completion to localStorage when finishing", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.startTutorial());

    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      act(() => {
        result.current.nextStep();
        vi.advanceTimersByTime(300);
      });
    }

    expect(storage["nunchi-tutorial-completed"]).toBe("1");
  });

  it("debounces rapid calls (prevents double-advance)", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.startTutorial());

    // Call nextStep twice rapidly without timer advance
    act(() => {
      result.current.nextStep();
      result.current.nextStep(); // should be ignored
    });
    expect(result.current.currentStepIndex).toBe(1); // only advanced once

    act(() => vi.advanceTimersByTime(300));

    // Now it should accept another advance
    act(() => {
      result.current.nextStep();
      vi.advanceTimersByTime(300);
    });
    expect(result.current.currentStepIndex).toBe(2);
  });
});

// ─── prevStep ──────────────────────────────────────────────────────

describe("useTutorial — prevStep", () => {
  it("goes back to previous step", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.startTutorial());
    act(() => {
      result.current.nextStep();
      vi.advanceTimersByTime(300);
    });
    expect(result.current.currentStepIndex).toBe(1);

    act(() => result.current.prevStep());
    expect(result.current.currentStepIndex).toBe(0);
  });

  it("clamps at 0 and does not go negative", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.startTutorial());
    act(() => result.current.prevStep());
    expect(result.current.currentStepIndex).toBe(0);
    act(() => result.current.prevStep());
    expect(result.current.currentStepIndex).toBe(0);
  });
});

// ─── skipTutorial ──────────────────────────────────────────────────

describe("useTutorial — skipTutorial", () => {
  it("deactivates the tutorial immediately", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.startTutorial());
    expect(result.current.isActive).toBe(true);

    act(() => result.current.skipTutorial());
    expect(result.current.isActive).toBe(false);
    expect(result.current.currentStep).toBeNull();
  });

  it("saves completion to localStorage", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.startTutorial());
    act(() => result.current.skipTutorial());
    expect(storage["nunchi-tutorial-completed"]).toBe("1");
  });
});

// ─── notifyInteraction ─────────────────────────────────────────────

describe("useTutorial — notifyInteraction", () => {
  it("does nothing when tutorial is not active", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.notifyInteraction("welcome"));
    expect(result.current.isActive).toBe(false);
    expect(result.current.currentStepIndex).toBe(0);
  });

  it("does nothing when stepId does not match current step", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.startTutorial());
    act(() => result.current.notifyInteraction("nonexistent-step"));
    expect(result.current.currentStepIndex).toBe(0);
  });

  it("does not advance for observe-type steps (only interact)", () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.startTutorial());
    // First step is "welcome" which is type "observe"
    expect(TUTORIAL_STEPS[0].type).toBe("observe");
    act(() => result.current.notifyInteraction("welcome"));
    expect(result.current.currentStepIndex).toBe(0); // unchanged
  });
});
