import { describe, it, expect } from "vitest";
import { MOONJO_SYSTEM_PROMPT, buildSystemPrompt } from "../system-prompt";

describe("MOONJO_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof MOONJO_SYSTEM_PROMPT).toBe("string");
    expect(MOONJO_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("defines the Moon-jo character identity", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("Moon-jo");
    expect(MOONJO_SYSTEM_PROMPT).toContain("서문조");
    expect(MOONJO_SYSTEM_PROMPT).toContain("dentist");
    expect(MOONJO_SYSTEM_PROMPT).toContain("Room 203");
  });

  it("includes teaching methodology section", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("<teaching>");
    expect(MOONJO_SYSTEM_PROMPT).toContain("VOCABULARY");
    expect(MOONJO_SYSTEM_PROMPT).toContain("GRAMMAR");
  });

  it("includes formatting rules", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("<formatting>");
    expect(MOONJO_SYSTEM_PROMPT).toContain("Hangul");
    expect(MOONJO_SYSTEM_PROMPT).toContain("romanization");
  });

  it("includes the character behavioral guidelines", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("<character>");
    expect(MOONJO_SYSTEM_PROMPT).toContain("SPEECH STYLE");
    expect(MOONJO_SYSTEM_PROMPT).toContain("PERSONALITY");
  });

  it("specifies no emoji rule", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("No emojis");
  });

  it("includes initial greeting instructions", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("<initial_greeting>");
    expect(MOONJO_SYSTEM_PROMPT).toContain("Eden Goshiwon");
  });

  it("includes identity lock and jailbreak resistance", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("<identity");
    expect(MOONJO_SYSTEM_PROMPT).toContain("permanent");
    expect(MOONJO_SYSTEM_PROMPT).toContain("developer mode");
  });

  it("includes language rules section", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("<language_rules");
    expect(MOONJO_SYSTEM_PROMPT).toContain("ROMANIZATION");
  });
});

describe("buildSystemPrompt", () => {
  it("includes mood addendum", () => {
    const result = buildSystemPrompt({
      moodAddendum: "<mood_state>\nKorean usage: 50%. Mood: warm.\n</mood_state>",
    });
    expect(result).toContain("Mood: warm");
  });

  it("includes student progress when provided", () => {
    const result = buildSystemPrompt({
      moodAddendum: "",
      rankKorean: "단골",
      rankEnglish: "Regular",
      totalXP: 500,
      vocabCount: 30,
      streakDays: 5,
    });
    expect(result).toContain("<student_progress>");
    expect(result).toContain("단골");
    expect(result).toContain("Total XP: 500");
    expect(result).toContain("Saved vocabulary words: 30");
    expect(result).toContain("Study streak: 5 days");
    expect(result).toContain("Intermediate beginner");
  });

  it("includes active lesson topic when provided", () => {
    const result = buildSystemPrompt({
      moodAddendum: "",
      activeTopic: "greetings",
      activeTopicKr: "인사",
    });
    expect(result).toContain("<active_lesson>");
    expect(result).toContain("인사");
  });

  it("adapts teaching level based on rank", () => {
    const beginner = buildSystemPrompt({
      moodAddendum: "",
      rankKorean: "새 입주자",
      rankEnglish: "New Resident",
    });
    expect(beginner).toContain("Absolute beginner");

    const advanced = buildSystemPrompt({
      moodAddendum: "",
      rankKorean: "층 선배",
      rankEnglish: "Floor Senior",
    });
    expect(advanced).toContain("Advanced");
  });

  it("works with only mood addendum (backward compatible)", () => {
    const result = buildSystemPrompt({ moodAddendum: "" });
    expect(result).toContain("<identity");
    expect(result).toContain("<language_rules");
    expect(result).toContain("<character>");
    expect(result).toContain("<teaching>");
    expect(result).not.toContain("<student_progress>");
  });
});
