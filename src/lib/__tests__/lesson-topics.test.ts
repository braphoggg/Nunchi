import { describe, it, expect } from "vitest";
import { LESSON_TOPICS } from "../lesson-topics";

describe("LESSON_TOPICS", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(LESSON_TOPICS)).toBe(true);
    expect(LESSON_TOPICS.length).toBeGreaterThan(0);
  });

  it("has unique ids for each topic", () => {
    const ids = LESSON_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each topic has all required fields", () => {
    for (const topic of LESSON_TOPICS) {
      expect(topic.id).toBeTruthy();
      expect(typeof topic.id).toBe("string");
      expect(topic.title).toBeTruthy();
      expect(typeof topic.title).toBe("string");
      expect(topic.titleKr).toBeTruthy();
      expect(typeof topic.titleKr).toBe("string");
      expect(topic.starterMessage).toBeTruthy();
      expect(typeof topic.starterMessage).toBe("string");
      expect(topic.icon).toBeTruthy();
      expect(typeof topic.icon).toBe("string");
    }
  });

  it("includes core topic categories", () => {
    const ids = LESSON_TOPICS.map((t) => t.id);
    expect(ids).toContain("greetings");
    expect(ids).toContain("survival");
    expect(ids).toContain("numbers");
    expect(ids).toContain("food");
    expect(ids).toContain("free");
  });

  it("each icon is a single Korean character", () => {
    for (const topic of LESSON_TOPICS) {
      expect(topic.icon.length).toBe(1);
    }
  });

  it("starterMessages are instructional prompts", () => {
    for (const topic of LESSON_TOPICS) {
      expect(topic.starterMessage.length).toBeGreaterThan(10);
    }
  });
});
