import { describe, it, expect } from "vitest";
import {
  LESSON_TOPICS,
  getRankIndex,
  meetsRankRequirement,
} from "../lesson-topics";
import { RANK_LADDER } from "../gamification";

// ─── LESSON_TOPICS data integrity ─────────────────────────────────

describe("LESSON_TOPICS", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(LESSON_TOPICS)).toBe(true);
    expect(LESSON_TOPICS.length).toBeGreaterThan(0);
  });

  it("has unique ids for each topic", () => {
    const ids = LESSON_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each topic has all required fields with correct types", () => {
    for (const topic of LESSON_TOPICS) {
      expect(typeof topic.id).toBe("string");
      expect(topic.id.length).toBeGreaterThan(0);
      expect(typeof topic.title).toBe("string");
      expect(topic.title.length).toBeGreaterThan(0);
      expect(typeof topic.titleKr).toBe("string");
      expect(topic.titleKr.length).toBeGreaterThan(0);
      expect(typeof topic.starterMessage).toBe("string");
      expect(topic.starterMessage.length).toBeGreaterThan(10);
      expect(typeof topic.icon).toBe("string");
      expect(topic.icon.length).toBe(1);
      expect(["beginner", "intermediate", "advanced"]).toContain(
        topic.difficulty,
      );
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

  it("has requiredRank only for non-beginner topics", () => {
    for (const topic of LESSON_TOPICS) {
      if (topic.difficulty === "beginner") {
        expect(topic.requiredRank).toBeUndefined();
      }
    }
  });

  it("locked topics reference valid ranks", () => {
    const validRanks = new Set(RANK_LADDER.map((r) => r.id));
    for (const topic of LESSON_TOPICS) {
      if (topic.requiredRank) {
        expect(validRanks.has(topic.requiredRank)).toBe(true);
      }
    }
  });
});

// ─── getRankIndex ──────────────────────────────────────────────────

describe("getRankIndex", () => {
  it("returns 0 for the lowest rank (new_resident)", () => {
    expect(getRankIndex("new_resident")).toBe(0);
  });

  it("returns the last index for floor_senior", () => {
    expect(getRankIndex("floor_senior")).toBe(RANK_LADDER.length - 1);
  });

  it("returns -1 for an unknown rank", () => {
    expect(getRankIndex("nonexistent" as any)).toBe(-1);
  });

  it("returns increasing indices for the entire ladder", () => {
    let prev = -1;
    for (const rank of RANK_LADDER) {
      const idx = getRankIndex(rank.id);
      expect(idx).toBeGreaterThan(prev);
      prev = idx;
    }
  });
});

// ─── meetsRankRequirement ──────────────────────────────────────────

describe("meetsRankRequirement", () => {
  it("returns true when no requiredRank is specified", () => {
    expect(meetsRankRequirement("new_resident", undefined)).toBe(true);
  });

  it("returns true when current rank equals required rank", () => {
    expect(meetsRankRequirement("quiet_tenant", "quiet_tenant")).toBe(true);
  });

  it("returns true when current rank exceeds required rank", () => {
    expect(meetsRankRequirement("floor_senior", "quiet_tenant")).toBe(true);
    expect(meetsRankRequirement("regular", "quiet_tenant")).toBe(true);
  });

  it("returns false when current rank is below required rank", () => {
    expect(meetsRankRequirement("new_resident", "quiet_tenant")).toBe(false);
    expect(meetsRankRequirement("new_resident", "regular")).toBe(false);
    expect(meetsRankRequirement("quiet_tenant", "regular")).toBe(false);
  });

  it("new_resident cannot access any locked content", () => {
    const locked = LESSON_TOPICS.filter((t) => t.requiredRank);
    for (const topic of locked) {
      expect(meetsRankRequirement("new_resident", topic.requiredRank)).toBe(
        false,
      );
    }
  });

  it("floor_senior can access all content", () => {
    for (const topic of LESSON_TOPICS) {
      expect(meetsRankRequirement("floor_senior", topic.requiredRank)).toBe(
        true,
      );
    }
  });
});
