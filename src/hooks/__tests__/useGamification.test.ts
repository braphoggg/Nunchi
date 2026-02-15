import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGamification } from "../useGamification";
import { createDefaultGamificationData } from "@/lib/gamification";
import { validateGamificationData } from "@/lib/security";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useGamification", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with defaults and awards XP for Korean message", () => {
    const { result, unmount } = renderHook(() => useGamification(0));

    // Initial state
    expect(result.current.totalXP).toBe(0);
    expect(result.current.currentStreak).toBe(0);
    expect(result.current.rank.id).toBe("new_resident");

    // Send a fully Korean message (100% Korean = 15 XP)
    act(() => {
      result.current.recordMessage("안녕하세요");
    });

    expect(result.current.totalXP).toBe(15);
    expect(result.current.recentXPGain).not.toBeNull();
    expect(result.current.recentXPGain!.amount).toBe(15);
    expect(result.current.recentXPGain!.action).toBe("message_full_korean");
    expect(result.current.currentStreak).toBe(1);

    // Toast auto-clears after 2s
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(result.current.recentXPGain).toBeNull();

    unmount();
  });

  it("awards XP for flashcard session with perfect bonus", () => {
    const { result, unmount } = renderHook(() => useGamification(0));

    act(() => {
      result.current.recordFlashcardComplete({
        again: 0,
        good: 3,
        easy: 2,
        total: 5,
      });
    });

    // 20 (base) + 10 (perfect) = 30
    expect(result.current.totalXP).toBe(30);
    expect(result.current.recentXPGain).not.toBeNull();
    expect(result.current.recentXPGain!.amount).toBe(30);

    unmount();
  });

  it("awards XP for saving words", () => {
    const { result, unmount } = renderHook(() => useGamification(0));

    act(() => {
      result.current.recordWordSaved(3);
    });

    // 3 * 3 = 9 XP
    expect(result.current.totalXP).toBe(9);

    unmount();
  });

  it("resets messagesWithoutTranslate on translation and awards no_translate XP at milestones", () => {
    const { result, unmount } = renderHook(() => useGamification(0));

    // Send 5 English messages (no Korean XP, but no_translate milestone)
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.recordMessage("hello there");
      });
    }

    // After 5 messages without translate → 8 XP for no_translate
    expect(result.current.totalXP).toBe(8);

    // Now use translate — should reset the counter
    act(() => {
      result.current.recordTranslation();
    });

    expect(result.current.stats.messagesWithoutTranslate).toBe(0);
    expect(result.current.stats.totalTranslations).toBe(1);

    unmount();
  });

  it("computes rank based on vocabCount prop", () => {
    // Pre-load some XP in localStorage
    const data = createDefaultGamificationData();
    data.xp.totalXP = 150;
    localStorageMock.setItem("nunchi-gamification", JSON.stringify(data));

    const { result, unmount } = renderHook(() => useGamification(15));

    // 150 XP + 15 vocab → qualifies for quiet_tenant (100 XP, 10 vocab)
    expect(result.current.rank.id).toBe("quiet_tenant");
    expect(result.current.nextRank).not.toBeNull();
    expect(result.current.nextRank!.id).toBe("regular");

    unmount();
  });

  it("validates localStorage data on load (rejects corrupted data)", () => {
    localStorageMock.setItem("nunchi-gamification", '{"xp":{"totalXP":-999},"streak":{},"stats":{}}');

    const { result, unmount } = renderHook(() => useGamification(0));

    // Should fall back to defaults
    expect(result.current.totalXP).toBe(0);
    expect(result.current.currentStreak).toBe(0);

    unmount();
  });
});
