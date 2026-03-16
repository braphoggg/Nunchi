import { describe, it, expect } from "vitest";
import {
  ACHIEVEMENTS,
  checkAchievements,
  unlockAchievements,
  getAchievement,
  createDefaultAchievementProgress,
  isValidAchievementProgress,
  type AchievementCheckContext,
  type AchievementProgress,
} from "../achievements";

function makeContext(overrides: Partial<AchievementCheckContext> = {}): AchievementCheckContext {
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

describe("achievements", () => {
  describe("ACHIEVEMENTS", () => {
    it("has 20 achievement definitions", () => {
      expect(ACHIEVEMENTS).toHaveLength(20);
    });

    it("all achievements have unique IDs", () => {
      const ids = ACHIEVEMENTS.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("all achievements have required fields", () => {
      for (const a of ACHIEVEMENTS) {
        expect(a.id).toBeTruthy();
        expect(a.title).toBeTruthy();
        expect(a.titleKr).toBeTruthy();
        expect(a.description).toBeTruthy();
        expect(a.icon).toBeTruthy();
        expect(["vocabulary", "streak", "study", "immersion", "rank", "atmosphere"]).toContain(a.category);
        expect(typeof a.check).toBe("function");
      }
    });
  });

  describe("createDefaultAchievementProgress", () => {
    it("returns empty progress", () => {
      const progress = createDefaultAchievementProgress();
      expect(progress.unlockedIds).toEqual([]);
      expect(progress.unlockTimestamps).toEqual({});
    });
  });

  describe("checkAchievements", () => {
    it("returns empty array when no achievements earned", () => {
      const ctx = makeContext();
      const progress = createDefaultAchievementProgress();
      expect(checkAchievements(ctx, progress)).toEqual([]);
    });

    it("unlocks first_word when vocabCount >= 1", () => {
      const ctx = makeContext({ vocabCount: 1 });
      const progress = createDefaultAchievementProgress();
      const newIds = checkAchievements(ctx, progress);
      expect(newIds).toContain("first_word");
    });

    it("unlocks word_collector at 25 words", () => {
      const ctx = makeContext({ vocabCount: 25 });
      const progress = createDefaultAchievementProgress();
      const newIds = checkAchievements(ctx, progress);
      expect(newIds).toContain("word_collector");
    });

    it("unlocks bookworm at 50 words", () => {
      const ctx = makeContext({ vocabCount: 50 });
      const progress = createDefaultAchievementProgress();
      const newIds = checkAchievements(ctx, progress);
      expect(newIds).toContain("bookworm");
    });

    it("unlocks lexicon at 200 words", () => {
      const ctx = makeContext({ vocabCount: 200 });
      const progress = createDefaultAchievementProgress();
      expect(checkAchievements(ctx, progress)).toContain("lexicon");
    });

    it("unlocks streak achievements at correct thresholds", () => {
      expect(checkAchievements(makeContext({ longestStreak: 3 }), createDefaultAchievementProgress())).toContain("first_flame");
      expect(checkAchievements(makeContext({ longestStreak: 7 }), createDefaultAchievementProgress())).toContain("on_fire");
      expect(checkAchievements(makeContext({ longestStreak: 30 }), createDefaultAchievementProgress())).toContain("unstoppable");
    });

    it("unlocks study achievements", () => {
      expect(checkAchievements(makeContext({ totalFlashcardSessions: 1 }), createDefaultAchievementProgress())).toContain("first_session");
      expect(checkAchievements(makeContext({ totalFlashcardSessions: 10 }), createDefaultAchievementProgress())).toContain("study_habit");
      expect(checkAchievements(makeContext({ perfectQuizCount: 1 }), createDefaultAchievementProgress())).toContain("perfect_score");
      expect(checkAchievements(makeContext({ perfectFlashcardCount: 1 }), createDefaultAchievementProgress())).toContain("flawless_session");
    });

    it("unlocks immersion achievements", () => {
      expect(checkAchievements(makeContext({ fullKoreanMessageCount: 10 }), createDefaultAchievementProgress())).toContain("korean_spirit");
      expect(checkAchievements(makeContext({ messagesWithoutTranslate: 5 }), createDefaultAchievementProgress())).toContain("silent_treatment");
      expect(checkAchievements(makeContext({ messagesWithoutTranslate: 50 }), createDefaultAchievementProgress())).toContain("immersion_master");
      expect(checkAchievements(makeContext({ totalMessages: 100 }), createDefaultAchievementProgress())).toContain("chatterbox");
    });

    it("unlocks rank achievements", () => {
      expect(checkAchievements(makeContext({ rankId: "quiet_tenant" }), createDefaultAchievementProgress())).toContain("quiet_tenant");
      expect(checkAchievements(makeContext({ rankId: "regular" }), createDefaultAchievementProgress())).toContain("regular");
      expect(checkAchievements(makeContext({ rankId: "trusted_neighbor" }), createDefaultAchievementProgress())).toContain("trusted_neighbor");
      expect(checkAchievements(makeContext({ rankId: "floor_senior" }), createDefaultAchievementProgress())).toContain("floor_senior");
    });

    it("unlocks night_owl at nightStage 3", () => {
      expect(checkAchievements(makeContext({ nightStage: 3 }), createDefaultAchievementProgress())).toContain("night_owl");
    });

    it("does not re-unlock already unlocked achievements", () => {
      const ctx = makeContext({ vocabCount: 1 });
      const progress: AchievementProgress = {
        unlockedIds: ["first_word"],
        unlockTimestamps: { first_word: "2024-01-01T00:00:00Z" },
      };
      const newIds = checkAchievements(ctx, progress);
      expect(newIds).not.toContain("first_word");
    });

    it("can unlock multiple achievements at once", () => {
      const ctx = makeContext({ vocabCount: 50, longestStreak: 7, totalFlashcardSessions: 1 });
      const progress = createDefaultAchievementProgress();
      const newIds = checkAchievements(ctx, progress);
      expect(newIds.length).toBeGreaterThan(3);
      expect(newIds).toContain("first_word");
      expect(newIds).toContain("bookworm");
      expect(newIds).toContain("on_fire");
      expect(newIds).toContain("first_session");
    });
  });

  describe("unlockAchievements", () => {
    it("returns same progress when no new IDs", () => {
      const progress = createDefaultAchievementProgress();
      expect(unlockAchievements(progress, [])).toBe(progress);
    });

    it("adds new IDs and timestamps", () => {
      const progress = createDefaultAchievementProgress();
      const result = unlockAchievements(progress, ["first_word", "first_flame"]);
      expect(result.unlockedIds).toEqual(["first_word", "first_flame"]);
      expect(result.unlockTimestamps.first_word).toBeTruthy();
      expect(result.unlockTimestamps.first_flame).toBeTruthy();
    });

    it("preserves existing unlocks", () => {
      const progress: AchievementProgress = {
        unlockedIds: ["first_word"],
        unlockTimestamps: { first_word: "2024-01-01T00:00:00Z" },
      };
      const result = unlockAchievements(progress, ["first_flame"]);
      expect(result.unlockedIds).toEqual(["first_word", "first_flame"]);
      expect(result.unlockTimestamps.first_word).toBe("2024-01-01T00:00:00Z");
    });
  });

  describe("getAchievement", () => {
    it("returns achievement by ID", () => {
      const a = getAchievement("first_word");
      expect(a).toBeDefined();
      expect(a!.title).toBe("First Word");
    });

    it("returns undefined for unknown ID", () => {
      expect(getAchievement("nonexistent")).toBeUndefined();
    });
  });

  describe("isValidAchievementProgress", () => {
    it("validates correct progress", () => {
      expect(isValidAchievementProgress({ unlockedIds: [], unlockTimestamps: {} })).toBe(true);
      expect(isValidAchievementProgress({ unlockedIds: ["a"], unlockTimestamps: { a: "ts" } })).toBe(true);
    });

    it("rejects non-objects", () => {
      expect(isValidAchievementProgress(null)).toBe(false);
      expect(isValidAchievementProgress("string")).toBe(false);
      expect(isValidAchievementProgress(42)).toBe(false);
      expect(isValidAchievementProgress([])).toBe(false);
    });

    it("rejects missing unlockedIds", () => {
      expect(isValidAchievementProgress({ unlockTimestamps: {} })).toBe(false);
    });

    it("rejects non-string items in unlockedIds", () => {
      expect(isValidAchievementProgress({ unlockedIds: [123], unlockTimestamps: {} })).toBe(false);
    });

    it("rejects missing unlockTimestamps", () => {
      expect(isValidAchievementProgress({ unlockedIds: [] })).toBe(false);
    });

    it("rejects null unlockTimestamps", () => {
      expect(isValidAchievementProgress({ unlockedIds: [], unlockTimestamps: null })).toBe(false);
    });
  });
});
