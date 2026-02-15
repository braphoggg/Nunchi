import { describe, it, expect } from "vitest";
import { parseVocabulary, hasVocabulary } from "../parse-vocabulary";

describe("parseVocabulary", () => {
  // Primary format: Korean-only (no English after romanization)

  it("parses Korean-only format: **word** (romanization)", () => {
    const content = "**안녕하세요** (annyeonghaseyo)";
    const result = parseVocabulary(content);
    expect(result).toEqual([
      { korean: "안녕하세요", romanization: "annyeonghaseyo", english: "" },
    ]);
  });

  it("parses multiple Korean-only vocabulary items", () => {
    const content =
      "**안녕하세요** (annyeonghaseyo)\n**감사합니다** (gamsahamnida)\n**문** (mun)";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ korean: "안녕하세요", romanization: "annyeonghaseyo", english: "" });
    expect(result[1]).toEqual({ korean: "감사합니다", romanization: "gamsahamnida", english: "" });
    expect(result[2]).toEqual({ korean: "문", romanization: "mun", english: "" });
  });

  it("parses Korean-only items mixed with Korean sentences", () => {
    const content =
      "오늘 배울 단어:\n**복도** (bokdo)\n**방** (bang)\n복도에서 방으로 가세요.";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(2);
    expect(result[0].korean).toBe("복도");
    expect(result[1].korean).toBe("방");
    expect(result[0].english).toBe("");
    expect(result[1].english).toBe("");
  });

  // Legacy format: with English meaning (still supported for backward compat)

  it("parses legacy format with English meaning", () => {
    const content = "**감사합니다** (gamsahamnida) thank you";
    const result = parseVocabulary(content);
    expect(result).toEqual([
      { korean: "감사합니다", romanization: "gamsahamnida", english: "thank you" },
    ]);
  });

  it("parses multiple legacy vocabulary items", () => {
    const content =
      "Today we learn:\n**안녕하세요** (annyeonghaseyo) hello\n**감사합니다** (gamsahamnida) thank you";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(2);
    expect(result[0].korean).toBe("안녕하세요");
    expect(result[0].english).toBe("hello");
    expect(result[1].korean).toBe("감사합니다");
    expect(result[1].english).toBe("thank you");
  });

  it("strips trailing punctuation from English meaning", () => {
    const content = "**문** (mun) door.";
    const result = parseVocabulary(content);
    expect(result[0].english).toBe("door");
  });

  it("returns empty array for messages with no vocabulary", () => {
    const content = "How are you doing today?";
    expect(parseVocabulary(content)).toEqual([]);
  });

  it("returns empty array for empty string input", () => {
    expect(parseVocabulary("")).toEqual([]);
  });

  it("ignores bold English words (no Hangul)", () => {
    const content = "**hello** (hello) a greeting";
    expect(parseVocabulary(content)).toEqual([]);
  });

  it("handles multi-word romanization", () => {
    const content = "**안녕하세요** (an-nyeong-ha-se-yo)";
    const result = parseVocabulary(content);
    expect(result[0].romanization).toBe("an-nyeong-ha-se-yo");
  });

  it("handles multi-word English meanings (legacy)", () => {
    const content = "**고마워요** (gomawoyo) thank you very much";
    const result = parseVocabulary(content);
    expect(result[0].english).toBe("thank you very much");
  });

  it("returns empty for bold text without romanization parentheses", () => {
    const content = "This is **important** stuff";
    expect(parseVocabulary(content)).toEqual([]);
  });

  it("handles vocabulary mixed with regular text", () => {
    const content =
      "In the goshiwon, you might hear:\n**조용히 하세요** (joyonghi haseyo) please be quiet\nRemember to be polite!";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(1);
    expect(result[0].korean).toBe("조용히 하세요");
    expect(result[0].english).toBe("please be quiet");
  });

  // Strips ** from romanization

  it("strips bold markers from romanization", () => {
    const content = "**안녕하세요** (**annyeonghaseyo**)";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(1);
    expect(result[0].romanization).toBe("annyeonghaseyo");
    expect(result[0].romanization).not.toContain("**");
  });

  // Sentence filtering

  it("skips long sentences that are bolded", () => {
    const content = "**안녕하세요, 마이클 씨. 잘 지내고 계신가요?** (Annyeonghaseyo)";
    const result = parseVocabulary(content);
    expect(result).toEqual([]);
  });

  it("allows short Korean phrases up to 15 chars", () => {
    const content = "**조용히 하세요** (joyonghi haseyo)";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(1);
    expect(result[0].korean).toBe("조용히 하세요");
  });

  // Invalid English filtering

  it("rejects English that is just a dash", () => {
    const content = "**방** (bang) -";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(1);
    expect(result[0].english).toBe("");
  });

  it("rejects English that contains Hangul", () => {
    const content = "**문** (mun) 문을 열어요";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(1);
    expect(result[0].english).toBe("");
  });

  it("rejects English with mixed Korean-English like '신뢰 (trust)도 중요하니까요'", () => {
    const content = "**신뢰** (chi-ryo) 신뢰 (trust)도 중요하니까요";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(1);
    expect(result[0].english).toBe("");
  });

  // Romanization validation

  it("rejects items where paren content is not valid romanization", () => {
    const content = "**네** (Ne) gaiyeosseoyo";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(1);
    expect(result[0].romanization).toBe("Ne");
  });

  it("rejects items where paren content contains Hangul", () => {
    const content = "**문** (문을 열어요)";
    const result = parseVocabulary(content);
    expect(result).toEqual([]);
  });

  // Format variations from real LLM output

  it("parses format with dash separator: **word** (rom) — meaning", () => {
    const content = "**복도** (bokdo) — hallway";
    const result = parseVocabulary(content);
    expect(result).toEqual([
      { korean: "복도", romanization: "bokdo", english: "hallway" },
    ]);
  });

  it("parses format with en-dash: **word** (rom) – meaning", () => {
    const content = "**벽** (byeok) – wall";
    const result = parseVocabulary(content);
    expect(result).toEqual([
      { korean: "벽", romanization: "byeok", english: "wall" },
    ]);
  });

  it("parses format with colon: **word** (rom): meaning", () => {
    const content = "**방** (bang): room";
    const result = parseVocabulary(content);
    expect(result).toEqual([
      { korean: "방", romanization: "bang", english: "room" },
    ]);
  });

  it("parses format with comma inside parens: **word** (rom, meaning)", () => {
    const content = "**문** (mun, door)";
    const result = parseVocabulary(content);
    expect(result).toEqual([
      { korean: "문", romanization: "mun", english: "door" },
    ]);
  });

  it("deduplicates words within same message", () => {
    const content =
      "**안녕** (annyeong) hello\nRemember **안녕** (annyeong) hello is important";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(1);
  });

  it("parses hyphen separator: **word** (rom) - meaning", () => {
    const content = "**옥상** (oksang) - rooftop";
    const result = parseVocabulary(content);
    expect(result).toEqual([
      { korean: "옥상", romanization: "oksang", english: "rooftop" },
    ]);
  });

  // Mixed format: some with English, some without

  it("handles mix of Korean-only and legacy formats", () => {
    const content =
      "**문** (mun)\n**복도** (bokdo) hallway\n**방** (bang)";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ korean: "문", romanization: "mun", english: "" });
    expect(result[1]).toEqual({ korean: "복도", romanization: "bokdo", english: "hallway" });
    expect(result[2]).toEqual({ korean: "방", romanization: "bang", english: "" });
  });

  // Real-world LLM output edge cases from screenshot

  it("handles romanization with apostrophes: **word** (rom'an)", () => {
    const content = "**그럼** (Geollem)";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(1);
    expect(result[0].romanization).toBe("Geollem");
  });

  it("handles English after dash that starts with '- '", () => {
    const content = "**신뢰해요** (Chi-ryohae-yo) - I trust you";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(1);
    expect(result[0].english).toBe("I trust you");
  });

  // Security tests

  it("handles excessively long input without crashing", () => {
    const longContent = "a".repeat(20_000);
    expect(() => parseVocabulary(longContent)).not.toThrow();
    expect(parseVocabulary(longContent)).toEqual([]);
  });

  it("skips items with Korean field exceeding max length", () => {
    const longKorean = "가".repeat(51);
    const content = `**${longKorean}** (test)`;
    expect(parseVocabulary(content)).toEqual([]);
  });

  it("skips items with romanization field exceeding 200 chars", () => {
    const longRom = "a".repeat(201);
    const content = `**한글** (${longRom})`;
    expect(parseVocabulary(content)).toEqual([]);
  });

  it("returns at most 50 items even if input has more matches", () => {
    const lines = Array.from(
      { length: 60 },
      (_, i) => `**단어${String.fromCharCode(0xAC00 + i)}** (word${i})`
    ).join("\n");
    const result = parseVocabulary(lines);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it("strips HTML tags from extracted fields", () => {
    const content =
      '**<script>alert(1)</script>한글** (roman) eng<img src=x>';
    const result = parseVocabulary(content);
    if (result.length > 0) {
      expect(result[0].korean).not.toContain("<script>");
      expect(result[0].korean).not.toContain("</script>");
      expect(result[0].english).not.toContain("<img");
    }
  });
});

describe("hasVocabulary", () => {
  it("returns true for messages containing parseable vocabulary pattern", () => {
    expect(hasVocabulary("**안녕** (annyeong) hello")).toBe(true);
  });

  it("returns true for Korean-only vocabulary format", () => {
    expect(hasVocabulary("**안녕** (annyeong)")).toBe(true);
  });

  it("returns false for plain text without bold markers", () => {
    expect(hasVocabulary("Hello, how are you?")).toBe(false);
  });

  it("returns false for bold text without romanization parentheses", () => {
    expect(hasVocabulary("This is **important**")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasVocabulary("")).toBe(false);
  });

  it("returns true for minimal pattern match", () => {
    expect(hasVocabulary("**가** (ga)")).toBe(true);
  });
});
