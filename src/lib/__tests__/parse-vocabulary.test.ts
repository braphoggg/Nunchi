import { describe, it, expect } from "vitest";
import { parseVocabulary, hasVocabulary } from "../parse-vocabulary";

describe("parseVocabulary", () => {
  it("parses standard vocabulary format", () => {
    const content = "Let me teach you: **감사합니다** (gamsahamnida) thank you";
    const result = parseVocabulary(content);
    expect(result).toEqual([
      { korean: "감사합니다", romanization: "gamsahamnida", english: "thank you" },
    ]);
  });

  it("parses multiple vocabulary items from a single message", () => {
    const content =
      "Today we learn:\n**안녕하세요** (annyeonghaseyo) hello\n**감사합니다** (gamsahamnida) thank you";
    const result = parseVocabulary(content);
    expect(result).toHaveLength(2);
    expect(result[0].korean).toBe("안녕하세요");
    expect(result[1].korean).toBe("감사합니다");
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
    const content = "**안녕하세요** (an-nyeong-ha-se-yo) hello";
    const result = parseVocabulary(content);
    expect(result[0].romanization).toBe("an-nyeong-ha-se-yo");
  });

  it("handles multi-word English meanings", () => {
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

  // Security tests

  it("handles excessively long input without crashing", () => {
    const longContent = "a".repeat(20_000);
    expect(() => parseVocabulary(longContent)).not.toThrow();
    expect(parseVocabulary(longContent)).toEqual([]);
  });

  it("skips items with Korean field exceeding 100 chars", () => {
    const longKorean = "가".repeat(101);
    const content = `**${longKorean}** (test) meaning`;
    expect(parseVocabulary(content)).toEqual([]);
  });

  it("skips items with romanization field exceeding 200 chars", () => {
    const longRom = "a".repeat(201);
    const content = `**한글** (${longRom}) meaning`;
    expect(parseVocabulary(content)).toEqual([]);
  });

  it("skips items with English field exceeding 500 chars", () => {
    const longEnglish = "a".repeat(501);
    const content = `**한글** (hangul) ${longEnglish}`;
    expect(parseVocabulary(content)).toEqual([]);
  });

  it("returns at most 50 items even if input has more matches", () => {
    const lines = Array.from(
      { length: 60 },
      (_, i) => `**단어${String.fromCharCode(0xAC00 + i)}** (word${i}) meaning${i}`
    ).join("\n");
    const result = parseVocabulary(lines);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it("strips HTML tags from extracted fields", () => {
    const content =
      '**<script>alert(1)</script>한글** (rom<b>an</b>) eng<img src=x>';
    const result = parseVocabulary(content);
    if (result.length > 0) {
      expect(result[0].korean).not.toContain("<script>");
      expect(result[0].korean).not.toContain("</script>");
      expect(result[0].romanization).not.toContain("<b>");
      expect(result[0].english).not.toContain("<img");
    }
  });
});

describe("hasVocabulary", () => {
  it("returns true for messages containing parseable vocabulary pattern", () => {
    expect(hasVocabulary("**안녕** (annyeong) hello")).toBe(true);
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
