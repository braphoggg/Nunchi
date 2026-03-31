import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAchievements } from "../useAchievements";

// Mock useDbSync to no-op (no auth in tests)
vi.mock("@/hooks/useDbSync", () => ({
  useDbSync: vi.fn(),
}));

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    session: null,
    isLoading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const STORAGE_KEY = "nunchi-achievements";

/** Full context with safe defaults — nothing unlocks */
function makeCtx(overrides: Partial<{
  totalXP: number;
  vocabCount: number;
  currentStreak: number;
  longestStreak: number;
  totalMessages: number;
  totalFlashcardSessions: number;
  totalTranslations: number;
  messagesWithoutTranslate: number;
  rankId: string;
  fullKoreanMessageCount: number;
  nightStage: number;
  perfectQuizCount: number;
  perfectFlashcardCount: number;
}> = {}) {
  return {
    totalXP: 0,
    vocabCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalMessages: 0,
    totalFlashcardSessions: 0,
    totalTranslations: 0,
    messagesWithoutTranslate: 0,
    rankId: "new_resident",
    fullKoreanMessageCount: 0,
    nightStage: 0,
    perfectQuizCount: 0,
    perfectFlashcardCount: 0,
    ...overrides,
  };
}

describe("useAchievements", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ─── defaults ───────────────────────────────────────────────

  it("returns default empty progress on first load", () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.progress.unlockedIds).toEqual([]);
    expect(result.current.progress.unlockTimestamps).toEqual({});
    expect(result.current.recentAchievement).toBeNull();
  });

  // ─── persistence ────────────────────────────────────────────

  it("loads saved achievements from localStorage", () => {
    const saved = {
      unlockedIds: ["first_word"],
      unlockTimestamps: { first_word: "2025-01-01T00:00:00.000Z" },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => useAchievements());
    expect(result.current.progress.unlockedIds).toContain("first_word");
  });

  it("falls back to defaults on corrupted localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "not-json{{{");
    const { result } = renderHook(() => useAchievements());
    expect(result.current.progress.unlockedIds).toEqual([]);
  });

  it("falls back to defaults on invalid data shape", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ wrong: "shape" }));
    const { result } = renderHook(() => useAchievements());
    expect(result.current.progress.unlockedIds).toEqual([]);
  });

  it("persists changes to localStorage", () => {
    const { result } = renderHook(() => useAchievements());

    // Trigger an achievement check with enough context to unlock something
    act(() => {
      result.current.checkAndUnlock(makeCtx({ vocabCount: 1 }));
    });

    // Check localStorage was updated (if any achievement was unlocked)
    const stored = localStorage.getItem(STORAGE_KEY);
    if (result.current.progress.unlockedIds.length > 0) {
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.unlockedIds.length).toBeGreaterThan(0);
    }
  });

  // ─── checkAndUnlock ─────────────────────────────────────────

  it("checkAndUnlock does not unlock achievements when criteria not met", () => {
    const { result } = renderHook(() => useAchievements());

    act(() => {
      result.current.checkAndUnlock(makeCtx());
    });

    expect(result.current.progress.unlockedIds).toEqual([]);
  });

  it("checkAndUnlock unlocks 'first_word' when vocabCount >= 1", () => {
    const { result } = renderHook(() => useAchievements());

    act(() => {
      result.current.checkAndUnlock(makeCtx({ vocabCount: 1 }));
    });

    expect(result.current.progress.unlockedIds).toContain("first_word");
  });

  it("does not re-unlock already unlocked achievements", () => {
    const saved = {
      unlockedIds: ["first_word"],
      unlockTimestamps: { first_word: "2025-01-01T00:00:00.000Z" },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => useAchievements());

    const beforeTimestamp = result.current.progress.unlockTimestamps.first_word;

    act(() => {
      result.current.checkAndUnlock(makeCtx({ vocabCount: 5 }));
    });

    // Timestamp should not have changed
    expect(result.current.progress.unlockTimestamps.first_word).toBe(beforeTimestamp);
  });

  // ─── toast queue ────────────────────────────────────────────

  it("queues achievement toast when new achievement is unlocked", () => {
    const { result } = renderHook(() => useAchievements());

    act(() => {
      result.current.checkAndUnlock(makeCtx({ vocabCount: 1 }));
    });

    // Toast is shown after a 100ms timeout
    act(() => {
      vi.advanceTimersByTime(200);
    });

    if (result.current.progress.unlockedIds.includes("first_word")) {
      expect(result.current.recentAchievement).not.toBeNull();
      expect(result.current.recentAchievement?.id).toBe("first_word");
    }
  });

  it("auto-dismisses toast after 3 seconds", () => {
    const { result } = renderHook(() => useAchievements());

    act(() => {
      result.current.checkAndUnlock(makeCtx({ vocabCount: 1 }));
    });

    act(() => vi.advanceTimersByTime(200));
    expect(result.current.recentAchievement).not.toBeNull();

    // After 3 seconds the toast should dismiss
    act(() => vi.advanceTimersByTime(3100));
    expect(result.current.recentAchievement).toBeNull();
  });

  // ─── localStorage error handling ────────────────────────────

  it("survives localStorage.setItem throwing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const { result } = renderHook(() => useAchievements());

    act(() => {
      result.current.checkAndUnlock(makeCtx({ vocabCount: 1 }));
    });

    // Should not throw — state still updates in memory
    expect(result.current.progress.unlockedIds).toContain("first_word");
  });
});
