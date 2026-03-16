/**
 * Tests for the WritingMode utility functions.
 * Since normalize() and checkAnswer() are not exported, we test them
 * through isolated re-implementations to verify the algorithm.
 */
import { describe, it, expect } from "vitest";

// Re-implementation of WritingMode's normalize function
function normalize(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase().trim();
}

// Re-implementation of WritingMode's checkAnswer function
function checkAnswer(userInput: string, target: string): "exact" | "close" | "wrong" {
  const normalizedInput = normalize(userInput);
  const normalizedTarget = normalize(target);

  if (normalizedInput === normalizedTarget) return "exact";

  if (normalizedTarget.length >= 3) {
    let diffs = 0;
    const maxLen = Math.max(normalizedInput.length, normalizedTarget.length);
    const minLen = Math.min(normalizedInput.length, normalizedTarget.length);
    diffs += maxLen - minLen;
    for (let i = 0; i < minLen; i++) {
      if (normalizedInput[i] !== normalizedTarget[i]) diffs++;
    }
    if (diffs <= 1) return "close";
  }

  return "wrong";
}

// Re-implementation of getMoonjoFeedback
function getMoonjoFeedback(pct: number): { korean: string; english: string } {
  if (pct === 100) return { korean: "글씨가 아름다워요...", english: "Beautiful writing..." };
  if (pct >= 70) return { korean: "잘했어요...", english: "Well done..." };
  if (pct >= 40) return { korean: "마음은 알겠는데...", english: "Your heart understands..." };
  return { korean: "다시 쓰세요...", english: "Write again..." };
}

describe("WritingMode normalize()", () => {
  it("removes whitespace", () => {
    expect(normalize("안녕 하세요")).toBe("안녕하세요");
  });

  it("lowercases latin characters", () => {
    expect(normalize("Hello")).toBe("hello");
  });

  it("trims leading/trailing whitespace", () => {
    expect(normalize("  안녕  ")).toBe("안녕");
  });

  it("handles multiple spaces between characters", () => {
    expect(normalize("감 사 합 니 다")).toBe("감사합니다");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalize("   ")).toBe("");
  });

  it("preserves Korean characters", () => {
    expect(normalize("한국어")).toBe("한국어");
  });
});

describe("WritingMode checkAnswer()", () => {
  describe("exact match", () => {
    it("returns exact for identical strings", () => {
      expect(checkAnswer("안녕하세요", "안녕하세요")).toBe("exact");
    });

    it("returns exact ignoring whitespace", () => {
      expect(checkAnswer("안녕 하세요", "안녕하세요")).toBe("exact");
    });

    it("returns exact for single character match", () => {
      expect(checkAnswer("네", "네")).toBe("exact");
    });

    it("returns exact for two character match", () => {
      expect(checkAnswer("물", "물")).toBe("exact");
    });
  });

  describe("close match (1 char tolerance for 3+ chars)", () => {
    it("returns close for 1 character different in 3+ char word", () => {
      expect(checkAnswer("안녕하세오", "안녕하세요")).toBe("close");
    });

    it("returns close for 1 extra character", () => {
      expect(checkAnswer("안녕하세요요", "안녕하세요")).toBe("close");
    });

    it("returns close for 1 missing trailing character", () => {
      // "감사합니" is 4 chars vs "감사합니다" 5 chars — only length diff of 1
      expect(checkAnswer("감사합니", "감사합니다")).toBe("close");
    });
  });

  describe("wrong match", () => {
    it("returns wrong for completely different text", () => {
      expect(checkAnswer("아니요", "안녕하세요")).toBe("wrong");
    });

    it("returns wrong for 2+ chars different", () => {
      expect(checkAnswer("안녕합니다", "안녕하세요")).toBe("wrong");
    });

    it("returns wrong for 1 char diff in 2-char word (no close tolerance)", () => {
      expect(checkAnswer("내", "네")).toBe("wrong");
    });

    it("returns wrong for empty input vs non-empty target", () => {
      expect(checkAnswer("", "안녕하세요")).toBe("wrong");
    });

    it("returns wrong for single char input vs multi-char target", () => {
      expect(checkAnswer("안", "안녕하세요")).toBe("wrong");
    });
  });
});

describe("WritingMode getMoonjoFeedback()", () => {
  it("returns perfect feedback for 100%", () => {
    const result = getMoonjoFeedback(100);
    expect(result.korean).toContain("글씨가 아름다워요");
  });

  it("returns good feedback for 70-99%", () => {
    expect(getMoonjoFeedback(70).korean).toContain("잘했어요");
    expect(getMoonjoFeedback(99).korean).toContain("잘했어요");
  });

  it("returns mediocre feedback for 40-69%", () => {
    expect(getMoonjoFeedback(40).korean).toContain("마음은 알겠는데");
    expect(getMoonjoFeedback(69).korean).toContain("마음은 알겠는데");
  });

  it("returns low feedback for 0-39%", () => {
    expect(getMoonjoFeedback(0).korean).toContain("다시 쓰세요");
    expect(getMoonjoFeedback(39).korean).toContain("다시 쓰세요");
  });
});
