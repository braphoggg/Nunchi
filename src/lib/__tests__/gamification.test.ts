import { describe, it, expect } from "vitest";
import {
  computeMessageXP,
  updateStreak,
  computeRank,
  computeRankProgress,
  getNextRank,
  createDefaultGamificationData,
  isValidGamificationData,
  getLocalDateString,
  XP_VALUES,
  RANK_LADDER,
} from "../gamification";
import type { StreakData } from "@/types";

// ─── computeMessageXP ───────────────────────────────────────────────

describe("computeMessageXP", () => {
  it("returns null for 0% Korean (pure English)", () => {
    expect(computeMessageXP(0)).toBeNull();
  });

  it("returns null for 9% Korean (below threshold)", () => {
    expect(computeMessageXP(0.09)).toBeNull();
  });

  it("returns message_korean (5 XP) for exactly 10% Korean", () => {
    const result = computeMessageXP(0.1);
    expect(result).toEqual({ action: "message_korean", amount: 5 });
  });

  it("returns message_korean (5 XP) for 50% Korean", () => {
    const result = computeMessageXP(0.5);
    expect(result).toEqual({ action: "message_korean", amount: 5 });
  });

  it("returns message_korean (5 XP) for 79% Korean", () => {
    const result = computeMessageXP(0.79);
    expect(result).toEqual({ action: "message_korean", amount: 5 });
  });

  it("returns message_full_korean (15 XP) for exactly 80% Korean", () => {
    const result = computeMessageXP(0.8);
    expect(result).toEqual({ action: "message_full_korean", amount: 15 });
  });

  it("returns message_full_korean (15 XP) for 100% Korean", () => {
    const result = computeMessageXP(1.0);
    expect(result).toEqual({ action: "message_full_korean", amount: 15 });
  });

  it("returns null for empty string ratio (0)", () => {
    expect(computeMessageXP(0)).toBeNull();
  });
});

// ─── updateStreak ────────────────────────────────────────────────────

describe("updateStreak", () => {
  const baseStreak: StreakData = {
    currentStreak: 3,
    longestStreak: 5,
    lastPracticeDate: "2025-01-15",
  };

  it("returns same streak when practicing same day", () => {
    const result = updateStreak(baseStreak, "2025-01-15");
    expect(result).toBe(baseStreak); // exact same reference
  });

  it("increments currentStreak when practicing the next day", () => {
    const result = updateStreak(baseStreak, "2025-01-16");
    expect(result.currentStreak).toBe(4);
    expect(result.lastPracticeDate).toBe("2025-01-16");
  });

  it("updates longestStreak when currentStreak surpasses it", () => {
    const streak: StreakData = {
      currentStreak: 5,
      longestStreak: 5,
      lastPracticeDate: "2025-01-15",
    };
    const result = updateStreak(streak, "2025-01-16");
    expect(result.currentStreak).toBe(6);
    expect(result.longestStreak).toBe(6);
  });

  it("does NOT update longestStreak when currentStreak is still lower", () => {
    const result = updateStreak(baseStreak, "2025-01-16");
    expect(result.currentStreak).toBe(4);
    expect(result.longestStreak).toBe(5); // unchanged
  });

  it("resets currentStreak to 1 when gap is 2+ days", () => {
    const result = updateStreak(baseStreak, "2025-01-18"); // 3 days later
    expect(result.currentStreak).toBe(1);
    expect(result.lastPracticeDate).toBe("2025-01-18");
  });

  it("resets currentStreak to 1 when gap is a week", () => {
    const result = updateStreak(baseStreak, "2025-01-22");
    expect(result.currentStreak).toBe(1);
  });

  it("sets currentStreak to 1 on first practice (empty lastPracticeDate)", () => {
    const fresh: StreakData = {
      currentStreak: 0,
      longestStreak: 0,
      lastPracticeDate: "",
    };
    const result = updateStreak(fresh, "2025-06-01");
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.lastPracticeDate).toBe("2025-06-01");
  });

  it("handles year boundary correctly (Jan 1 after Dec 31)", () => {
    const yearEnd: StreakData = {
      currentStreak: 10,
      longestStreak: 10,
      lastPracticeDate: "2024-12-31",
    };
    const result = updateStreak(yearEnd, "2025-01-01");
    expect(result.currentStreak).toBe(11);
    expect(result.longestStreak).toBe(11);
  });
});

// ─── computeRank ─────────────────────────────────────────────────────

describe("computeRank", () => {
  it("returns new_resident for 0 XP, 0 vocab", () => {
    expect(computeRank(0, 0).id).toBe("new_resident");
  });

  it("returns new_resident for 100 XP but only 5 vocab (needs BOTH)", () => {
    expect(computeRank(100, 5).id).toBe("new_resident");
  });

  it("returns new_resident for 50 XP and 10 vocab (XP too low)", () => {
    expect(computeRank(50, 10).id).toBe("new_resident");
  });

  it("returns quiet_tenant for 100 XP and 10 vocab (exact threshold)", () => {
    expect(computeRank(100, 10).id).toBe("quiet_tenant");
  });

  it("returns regular for 500 XP and 30 vocab", () => {
    expect(computeRank(500, 30).id).toBe("regular");
  });

  it("returns trusted_neighbor for 1500 XP and 75 vocab", () => {
    expect(computeRank(1500, 75).id).toBe("trusted_neighbor");
  });

  it("returns floor_senior for 5000 XP and 150 vocab", () => {
    expect(computeRank(5000, 150).id).toBe("floor_senior");
  });
});

// ─── computeRankProgress ────────────────────────────────────────────

describe("computeRankProgress", () => {
  it("returns 0 at rank start (0 XP, 0 vocab)", () => {
    expect(computeRankProgress(0, 0)).toBe(0);
  });

  it("returns ~0.5 when halfway to next rank", () => {
    // Next rank (quiet_tenant) needs 100 XP and 10 vocab
    // 50/100 = 0.5 XP progress, 5/10 = 0.5 vocab progress → min = 0.5
    const progress = computeRankProgress(50, 5);
    expect(progress).toBeCloseTo(0.5);
  });

  it("returns MIN of XP progress and vocab progress (bottleneck)", () => {
    // 80 XP / 100 = 0.8 XP progress, 3/10 = 0.3 vocab progress → min = 0.3
    const progress = computeRankProgress(80, 3);
    expect(progress).toBeCloseTo(0.3);
  });

  it("returns 1.0 at floor_senior (max rank)", () => {
    expect(computeRankProgress(5000, 150)).toBe(1.0);
    expect(computeRankProgress(9999, 999)).toBe(1.0);
  });

  it("returns 0 at exact threshold of current rank (just promoted)", () => {
    // Just became quiet_tenant (100 XP, 10 vocab)
    // Progress to regular (500 XP, 30 vocab): XP = 0/400 = 0, vocab = 0/20 = 0
    expect(computeRankProgress(100, 10)).toBe(0);
  });
});

// ─── getNextRank ─────────────────────────────────────────────────────

describe("getNextRank", () => {
  it("returns quiet_tenant for a new resident", () => {
    const next = getNextRank(0, 0);
    expect(next).not.toBeNull();
    expect(next!.id).toBe("quiet_tenant");
  });

  it("returns floor_senior for a trusted neighbor", () => {
    const next = getNextRank(1500, 75);
    expect(next).not.toBeNull();
    expect(next!.id).toBe("floor_senior");
  });

  it("returns null for floor_senior (already max)", () => {
    expect(getNextRank(5000, 150)).toBeNull();
  });
});

// ─── createDefaultGamificationData ──────────────────────────────────

describe("createDefaultGamificationData", () => {
  it("returns object with all zeroed fields", () => {
    const data = createDefaultGamificationData();
    expect(data.xp.totalXP).toBe(0);
    expect(data.xp.history).toEqual([]);
    expect(data.streak.currentStreak).toBe(0);
    expect(data.streak.longestStreak).toBe(0);
    expect(data.streak.lastPracticeDate).toBe("");
    expect(data.stats.totalMessages).toBe(0);
    expect(data.stats.totalFlashcardSessions).toBe(0);
    expect(data.stats.totalTranslations).toBe(0);
    expect(data.stats.messagesWithoutTranslate).toBe(0);
  });

  it("returns a fresh object each call (not shared reference)", () => {
    const a = createDefaultGamificationData();
    const b = createDefaultGamificationData();
    expect(a).not.toBe(b);
    expect(a.xp).not.toBe(b.xp);
    expect(a.xp.history).not.toBe(b.xp.history);
  });
});

// ─── isValidGamificationData ────────────────────────────────────────

describe("isValidGamificationData", () => {
  it("returns true for valid default data", () => {
    expect(isValidGamificationData(createDefaultGamificationData())).toBe(true);
  });

  it("returns false for null", () => {
    expect(isValidGamificationData(null)).toBe(false);
  });

  it("returns false when xp.totalXP is a string", () => {
    const data = createDefaultGamificationData();
    (data.xp as any).totalXP = "one hundred";
    expect(isValidGamificationData(data)).toBe(false);
  });

  it("returns false when streak.currentStreak is negative", () => {
    const data = createDefaultGamificationData();
    data.streak.currentStreak = -1;
    expect(isValidGamificationData(data)).toBe(false);
  });

  it("returns false when stats is missing required fields", () => {
    const data = createDefaultGamificationData();
    delete (data.stats as any).totalMessages;
    expect(isValidGamificationData(data)).toBe(false);
  });
});

// ─── getLocalDateString ─────────────────────────────────────────────

describe("getLocalDateString", () => {
  it("returns YYYY-MM-DD format for a known date", () => {
    // Use a date object to avoid timezone issues
    const date = new Date(2025, 0, 15); // Jan 15, 2025 (month is 0-indexed)
    expect(getLocalDateString(date)).toBe("2025-01-15");
  });

  it("uses local timezone (pads month and day)", () => {
    const date = new Date(2025, 5, 3); // June 3, 2025
    expect(getLocalDateString(date)).toBe("2025-06-03");
  });
});
