/**
 * Adversarial break tests for useGamification hook
 *
 * Targets localStorage abuse & crash recovery (#10, #11):
 *   G1: Storage quota exceeded — setItem throws QuotaExceededError
 *   G2: Corrupt gamification JSON — invalid data in storage
 *   G4: XP manipulation: max cap — totalXP at 999999
 *   G5: Rapid XP injection — >20 events/min triggers rate freeze
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGamification } from "../useGamification";
import { createDefaultGamificationData } from "@/lib/gamification";

// ── localStorage mock ───────────────────────────────────────────────────────
let store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("BREAK: useGamification — localStorage abuse (#10, #11)", () => {
  beforeEach(() => {
    store = {};
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // G1: Storage quota exceeded — setItem throws
  // ─────────────────────────────────────────────────────────────────────────
  it("G1: QuotaExceededError on setItem does not crash hook — state still works in-memory", () => {
    // DOCUMENTED WEAKNESS #10: saveToStorage has a try/catch that silently
    // swallows the error. State still works in-memory but is never persisted.
    localStorageMock.setItem.mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    const { result, unmount } = renderHook(() => useGamification(0));

    // Should start with defaults
    expect(result.current.totalXP).toBe(0);

    // Record a message — XP should still update in-memory
    act(() => {
      result.current.recordMessage("안녕하세요");
    });

    // FINDING: Hook continues working in-memory despite storage failure.
    // XP is awarded but will be lost on page reload.
    expect(result.current.totalXP).toBe(15);

    unmount();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // G2: Corrupt gamification JSON — invalid data in localStorage
  // ─────────────────────────────────────────────────────────────────────────
  it("G2: corrupt JSON with totalXP as string 'NaN' falls back to defaults", () => {
    // Set corrupted gamification data before hook mounts
    store["nunchi-gamification"] = JSON.stringify({
      xp: { totalXP: "NaN", history: [] },
      streak: { currentStreak: -5, longestStreak: "invalid", lastActiveDate: null },
      stats: {},
    });

    const { result, unmount } = renderHook(() => useGamification(0));

    // FINDING: validateGamificationData (from security.ts) catches the
    // invalid shape and returns null, causing loadFromStorage to return defaults.
    expect(result.current.totalXP).toBe(0);
    expect(result.current.currentStreak).toBe(0);

    unmount();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // G4: XP manipulation: max cap — totalXP at 999999
  // ─────────────────────────────────────────────────────────────────────────
  it("G4: XP at max cap (999999) does not exceed limit when recording message", () => {
    // Pre-load gamification data with totalXP at the cap
    const data = createDefaultGamificationData();
    data.xp.totalXP = 999_999;
    store["nunchi-gamification"] = JSON.stringify(data);

    const { result, unmount } = renderHook(() => useGamification(0));

    // Send a fully Korean message (would normally award 15 XP)
    act(() => {
      result.current.recordMessage("안녕하세요");
    });

    // FINDING: addXPEvent uses Math.min(currentData.xp.totalXP + amount, LIMITS.MAX_XP)
    // which correctly caps at 999999. XP does not overflow.
    expect(result.current.totalXP).toBeLessThanOrEqual(999_999);
    expect(result.current.totalXP).toBe(999_999);

    unmount();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // G5: Rapid XP injection — isReasonableXPRate should freeze XP gain
  // ─────────────────────────────────────────────────────────────────────────
  it("G5: rapid XP injection (>20 events/min) freezes XP gain", () => {
    const { result, unmount } = renderHook(() => useGamification(0));

    // Fire 25 Korean messages rapidly — each awards 15 XP
    // After 20 events in 60s, isReasonableXPRate returns false and XP freezes
    for (let i = 0; i < 25; i++) {
      act(() => {
        result.current.recordMessage("한국어");
      });
    }

    // FINDING: isReasonableXPRate checks that no more than 20 XP events
    // occurred in the last 60 seconds. After the 20th event, further
    // recordMessage calls silently freeze XP (addXPEvent returns unchanged data).
    //
    // Each Korean message awards 15 XP. 20 events × 15 XP = 300 XP max.
    // Some messages may also trigger no_translate milestones (every 5 msgs = 8 XP).
    // But after 20 total events, XP gain stops.
    expect(result.current.totalXP).toBeLessThanOrEqual(20 * 15 + 4 * 8); // max 300 + 32 = 332
    expect(result.current.totalXP).toBeGreaterThan(0);

    // The 25th message should not have added XP beyond the cap
    const xpBefore = result.current.totalXP;
    act(() => {
      result.current.recordMessage("더 많은 한국어");
    });

    // FINDING: XP is frozen at the same value — the anti-abuse mechanism works.
    expect(result.current.totalXP).toBe(xpBefore);

    unmount();
  });
});
