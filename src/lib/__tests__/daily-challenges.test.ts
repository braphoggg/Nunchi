import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  selectDailyChallenges,
  createDailyChallengeState,
  getChallenge,
  updateChallengeProgress,
  isValidChallengeState,
  getTodayString,
  CHALLENGE_XP_BONUS,
  type DailyChallengeState,
} from "../daily-challenges";

describe("daily-challenges", () => {
  describe("getTodayString", () => {
    it("returns YYYY-MM-DD format", () => {
      const result = getTodayString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("selectDailyChallenges", () => {
    it("returns exactly 3 challenge IDs", () => {
      const ids = selectDailyChallenges("2024-03-15");
      expect(ids).toHaveLength(3);
    });

    it("returns valid challenge IDs", () => {
      const ids = selectDailyChallenges("2024-03-15");
      for (const id of ids) {
        expect(getChallenge(id)).toBeDefined();
      }
    });

    it("returns unique IDs (no duplicates)", () => {
      const ids = selectDailyChallenges("2024-03-15");
      expect(new Set(ids).size).toBe(3);
    });

    it("is deterministic — same date gives same challenges", () => {
      const a = selectDailyChallenges("2024-06-01");
      const b = selectDailyChallenges("2024-06-01");
      expect(a).toEqual(b);
    });

    it("different dates give different challenges", () => {
      const a = selectDailyChallenges("2024-01-01");
      const b = selectDailyChallenges("2024-01-02");
      // They could theoretically overlap, but shouldn't be identical
      // Test a range of dates to be sure at least some differ
      let foundDiff = false;
      for (let d = 1; d <= 10; d++) {
        const x = selectDailyChallenges(`2024-01-${String(d).padStart(2, "0")}`);
        const y = selectDailyChallenges(`2024-01-${String(d + 1).padStart(2, "0")}`);
        if (JSON.stringify(x) !== JSON.stringify(y)) {
          foundDiff = true;
          break;
        }
      }
      expect(foundDiff).toBe(true);
    });
  });

  describe("createDailyChallengeState", () => {
    it("creates state with today's date by default", () => {
      const state = createDailyChallengeState();
      expect(state.date).toBe(getTodayString());
    });

    it("creates state with specified date", () => {
      const state = createDailyChallengeState("2024-06-15");
      expect(state.date).toBe("2024-06-15");
    });

    it("has 3 challenge IDs", () => {
      const state = createDailyChallengeState("2024-06-15");
      expect(state.challengeIds).toHaveLength(3);
    });

    it("starts with empty progress", () => {
      const state = createDailyChallengeState();
      expect(state.progress).toEqual({});
    });

    it("starts with no completed challenges", () => {
      const state = createDailyChallengeState();
      expect(state.completedIds).toEqual([]);
    });
  });

  describe("getChallenge", () => {
    it("returns challenge definition by ID", () => {
      const c = getChallenge("save_5_words");
      expect(c).toBeDefined();
      expect(c!.title).toBe("Word Hunter");
      expect(c!.target).toBe(5);
      expect(c!.trackingKey).toBe("words_saved");
    });

    it("returns undefined for unknown ID", () => {
      expect(getChallenge("nonexistent")).toBeUndefined();
    });
  });

  describe("updateChallengeProgress", () => {
    it("increments progress for matching tracking key", () => {
      // Use a date where we know the challenge includes words_saved
      const state = createDailyChallengeState("2024-01-01");
      // Find which challenge uses words_saved
      const wordChallenge = state.challengeIds.find((id) => {
        const c = getChallenge(id);
        return c?.trackingKey === "words_saved";
      });

      if (wordChallenge) {
        const result = updateChallengeProgress(state, "words_saved", 1);
        expect(result.state.progress[wordChallenge]).toBe(1);
      }
    });

    it("completes challenge when target is reached", () => {
      // Create a state and manually set up a scenario
      const state: DailyChallengeState = {
        date: "2024-01-01",
        challengeIds: ["flashcard_session"],
        progress: {},
        completedIds: [],
      };

      const result = updateChallengeProgress(state, "flashcard_sessions", 1);
      expect(result.newlyCompleted).toContain("flashcard_session");
      expect(result.state.completedIds).toContain("flashcard_session");
    });

    it("does not re-complete already completed challenges", () => {
      const state: DailyChallengeState = {
        date: "2024-01-01",
        challengeIds: ["flashcard_session"],
        progress: { flashcard_session: 1 },
        completedIds: ["flashcard_session"],
      };

      const result = updateChallengeProgress(state, "flashcard_sessions", 1);
      expect(result.newlyCompleted).toEqual([]);
    });

    it("ignores challenges with different tracking keys", () => {
      const state: DailyChallengeState = {
        date: "2024-01-01",
        challengeIds: ["save_5_words"],
        progress: {},
        completedIds: [],
      };

      const result = updateChallengeProgress(state, "flashcard_sessions", 1);
      expect(result.state.progress["save_5_words"]).toBeUndefined();
      expect(result.newlyCompleted).toEqual([]);
    });

    it("accumulates progress over multiple calls", () => {
      let state: DailyChallengeState = {
        date: "2024-01-01",
        challengeIds: ["save_5_words"],
        progress: {},
        completedIds: [],
      };

      let result = updateChallengeProgress(state, "words_saved", 2);
      state = result.state;
      expect(state.progress["save_5_words"]).toBe(2);
      expect(result.newlyCompleted).toEqual([]);

      result = updateChallengeProgress(state, "words_saved", 3);
      state = result.state;
      expect(state.progress["save_5_words"]).toBe(5);
      expect(result.newlyCompleted).toContain("save_5_words");
    });
  });

  describe("isValidChallengeState", () => {
    it("validates correct state", () => {
      const state = createDailyChallengeState();
      expect(isValidChallengeState(state)).toBe(true);
    });

    it("rejects non-objects", () => {
      expect(isValidChallengeState(null)).toBe(false);
      expect(isValidChallengeState("string")).toBe(false);
      expect(isValidChallengeState(42)).toBe(false);
      expect(isValidChallengeState([])).toBe(false);
    });

    it("rejects missing date", () => {
      expect(isValidChallengeState({ challengeIds: [], progress: {}, completedIds: [] })).toBe(false);
    });

    it("rejects missing challengeIds", () => {
      expect(isValidChallengeState({ date: "2024-01-01", progress: {}, completedIds: [] })).toBe(false);
    });

    it("rejects missing progress", () => {
      expect(isValidChallengeState({ date: "2024-01-01", challengeIds: [], completedIds: [] })).toBe(false);
    });

    it("rejects missing completedIds", () => {
      expect(isValidChallengeState({ date: "2024-01-01", challengeIds: [], progress: {} })).toBe(false);
    });
  });

  describe("CHALLENGE_XP_BONUS", () => {
    it("is 15 XP", () => {
      expect(CHALLENGE_XP_BONUS).toBe(15);
    });
  });
});
