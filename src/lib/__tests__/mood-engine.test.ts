import { describe, it, expect } from "vitest";
import {
  computeKoreanRatio,
  getMoodLevel,
  getMoodDirective,
  generateMoodSystemAddendum,
  type SimpleMessage,
} from "../mood-engine";

describe("mood-engine", () => {
  describe("computeKoreanRatio", () => {
    it("returns 0 for empty messages", () => {
      expect(computeKoreanRatio([])).toBe(0);
    });

    it("returns 0 when user sends only English", () => {
      const msgs: SimpleMessage[] = [
        { role: "user", content: "Hello how are you?" },
        { role: "assistant", content: "안녕하세요" },
      ];
      expect(computeKoreanRatio(msgs)).toBe(0);
    });

    it("returns 1 when user sends only Korean", () => {
      const msgs: SimpleMessage[] = [
        { role: "user", content: "안녕하세요" },
      ];
      expect(computeKoreanRatio(msgs)).toBe(1);
    });

    it("returns approximate ratio for mixed content", () => {
      // "안녕 hello" — 2 Hangul chars, 5 Latin chars = 2/7 ≈ 0.286
      const msgs: SimpleMessage[] = [
        { role: "user", content: "안녕 hello" },
      ];
      const ratio = computeKoreanRatio(msgs);
      expect(ratio).toBeGreaterThan(0.2);
      expect(ratio).toBeLessThan(0.4);
    });

    it("ignores assistant messages", () => {
      const msgs: SimpleMessage[] = [
        { role: "assistant", content: "안녕하세요 여러분" },
        { role: "user", content: "hello" },
      ];
      expect(computeKoreanRatio(msgs)).toBe(0);
    });

    it("aggregates across multiple user messages", () => {
      const msgs: SimpleMessage[] = [
        { role: "user", content: "안녕" }, // 2 Hangul
        { role: "user", content: "hi" }, // 2 Latin
      ];
      // 2 Hangul / 4 total = 0.5
      expect(computeKoreanRatio(msgs)).toBe(0.5);
    });
  });

  describe("getMoodLevel", () => {
    it("returns 'cold' for ratio < 0.2", () => {
      expect(getMoodLevel(0)).toBe("cold");
      expect(getMoodLevel(0.19)).toBe("cold");
    });

    it("returns 'neutral' for ratio 0.2-0.49", () => {
      expect(getMoodLevel(0.2)).toBe("neutral");
      expect(getMoodLevel(0.49)).toBe("neutral");
    });

    it("returns 'warm' for ratio 0.5-0.79", () => {
      expect(getMoodLevel(0.5)).toBe("warm");
      expect(getMoodLevel(0.79)).toBe("warm");
    });

    it("returns 'impressed' for ratio >= 0.8", () => {
      expect(getMoodLevel(0.8)).toBe("impressed");
      expect(getMoodLevel(1.0)).toBe("impressed");
    });
  });

  describe("getMoodDirective", () => {
    it("returns a non-empty string for each mood level", () => {
      for (const mood of ["cold", "neutral", "warm", "impressed"] as const) {
        const directive = getMoodDirective(mood);
        expect(directive).toBeTruthy();
        expect(typeof directive).toBe("string");
      }
    });
  });

  describe("generateMoodSystemAddendum", () => {
    it("returns a string containing the mood header", () => {
      const msgs: SimpleMessage[] = [
        { role: "user", content: "hello" },
      ];
      const addendum = generateMoodSystemAddendum(msgs);
      expect(addendum).toContain("## CURRENT MOOD STATE");
    });

    it("includes Korean usage percentage", () => {
      const msgs: SimpleMessage[] = [
        { role: "user", content: "hello" },
      ];
      const addendum = generateMoodSystemAddendum(msgs);
      expect(addendum).toContain("Korean usage: 0%");
      expect(addendum).toContain("Mood: cold");
    });

    it("reflects high Korean usage as impressed mood", () => {
      const msgs: SimpleMessage[] = [
        { role: "user", content: "안녕하세요 감사합니다" },
      ];
      const addendum = generateMoodSystemAddendum(msgs);
      expect(addendum).toContain("Mood: impressed");
    });
  });
});
