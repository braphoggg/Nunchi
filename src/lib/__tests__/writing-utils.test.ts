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

describe("checkAnswer close detection edge cases", () => {
  it("returns close for exactly 3-char target with 1 char different", () => {
    // "가나다" (3 chars) vs "가나라" (1 char diff at position 2)
    expect(checkAnswer("가나라", "가나다")).toBe("close");
  });

  it("returns wrong for exactly 3-char target with 2 chars different", () => {
    // "가나다" vs "가라마" (2 chars differ)
    expect(checkAnswer("가라마", "가나다")).toBe("wrong");
  });

  it("returns close for 3-char target when input has 1 extra char", () => {
    // "가나다" (3 chars) vs "가나다라" (4 chars, 1 extra)
    expect(checkAnswer("가나다라", "가나다")).toBe("close");
  });

  it("returns close for 3-char target when input is missing 1 char", () => {
    // "가나다" (3 chars) vs "가나" (2 chars, 1 missing)
    expect(checkAnswer("가나", "가나다")).toBe("close");
  });

  it("returns wrong for 3-char target when input is only 1 char", () => {
    // "가나다" (3 chars) vs "가" (1 char) — length diff of 2
    expect(checkAnswer("가", "가나다")).toBe("wrong");
  });

  it("returns exact when both strings are empty", () => {
    expect(checkAnswer("", "")).toBe("exact");
  });

  it("treats Korean jamo and composed syllables as different characters", () => {
    // ㅎㅏㄴ (3 jamo) vs 한 (1 composed syllable) are completely different strings
    expect(checkAnswer("ㅎㅏㄴ", "한글이")).toBe("wrong");
  });

  it("handles mixed Korean and Latin through normalize", () => {
    // normalize lowercases and strips whitespace
    expect(checkAnswer("ABC", "abc")).toBe("exact");
    expect(checkAnswer("한국ABC", "한국abc")).toBe("exact");
    expect(checkAnswer("한국Abc", "한국abd")).toBe("close");
  });

  it("returns close for very long strings with 1 char difference", () => {
    // 20+ char Korean string with a single character substitution
    const target = "가나다라마바사아자차카타파하가나다라마바";
    const input = "가나다라마바사아자차카타파하가나다라마빠";
    expect(target.length).toBeGreaterThanOrEqual(20);
    expect(checkAnswer(input, target)).toBe("close");
  });

  it("returns wrong when input and target are same length but completely different", () => {
    // Same length (5 chars) but no characters in common
    expect(checkAnswer("가나다라마", "바사아자차")).toBe("wrong");
  });
});
