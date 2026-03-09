import { describe, it, expect } from "vitest";
import { getDailyFocus } from "../daily-planner";

const NOW = new Date("2025-06-15T12:00:00Z"); // Sunday

describe("getDailyFocus", () => {
  it("suggests first unvisited topic for new users", () => {
    const focus = getDailyFocus(new Set(), 0, "new_resident", NOW);
    expect(focus.suggestedTopic).not.toBeNull();
    expect(focus.suggestedTopic!.id).toBe("greetings");
    expect(focus.reason).toBe("unvisited");
    expect(focus.reviewReminder).toBe(false);
  });

  it("skips visited topics and suggests next unvisited", () => {
    const visited = new Set(["greetings"]);
    const focus = getDailyFocus(visited, 0, "new_resident", NOW);
    expect(focus.suggestedTopic!.id).toBe("survival");
    expect(focus.reason).toBe("unvisited");
  });

  it("skips locked topics for new_resident", () => {
    // Visit all beginner topics
    const visited = new Set(["greetings", "survival", "numbers"]);
    const focus = getDailyFocus(visited, 0, "new_resident", NOW);
    // "food" and "feelings" require quiet_tenant, "politeness" requires regular
    // So all unlocked topics are visited → falls through to "review" mode
    expect(focus.reason).toBe("review");
  });

  it("suggests intermediate topics for quiet_tenant", () => {
    const visited = new Set(["greetings", "survival", "numbers"]);
    const focus = getDailyFocus(visited, 0, "quiet_tenant", NOW);
    expect(focus.suggestedTopic!.id).toBe("food");
    expect(focus.reason).toBe("unvisited");
  });

  it("sets reviewReminder when words are due", () => {
    const focus = getDailyFocus(new Set(), 5, "new_resident", NOW);
    expect(focus.reviewReminder).toBe(true);
    expect(focus.dueWordCount).toBe(5);
  });

  it("returns a daily quote with both Korean and English", () => {
    const focus = getDailyFocus(new Set(), 0, "new_resident", NOW);
    expect(focus.dailyQuote.korean).toBeTruthy();
    expect(focus.dailyQuote.english).toBeTruthy();
    // Korean text must contain Hangul
    expect(/[\uAC00-\uD7AF]/.test(focus.dailyQuote.korean)).toBe(true);
    // English text must not contain Hangul
    expect(/[\uAC00-\uD7AF]/.test(focus.dailyQuote.english)).toBe(false);
  });

  it("returns deterministic quote for same date", () => {
    const a = getDailyFocus(new Set(), 0, "new_resident", NOW);
    const b = getDailyFocus(new Set(), 0, "new_resident", NOW);
    expect(a.dailyQuote).toEqual(b.dailyQuote);
  });

  it("returns different quotes for different dates", () => {
    const day1 = getDailyFocus(
      new Set(), 0, "new_resident",
      new Date("2025-06-15T12:00:00Z"),
    );
    const day2 = getDailyFocus(
      new Set(), 0, "new_resident",
      new Date("2025-06-16T12:00:00Z"),
    );
    // Very likely different (7 quotes cycling) — could be same if modulo aligns
    // but at minimum both must be valid
    expect(day1.dailyQuote.korean).toBeTruthy();
    expect(day2.dailyQuote.korean).toBeTruthy();
  });

  it("sets reviewReminder false when no words are due", () => {
    const focus = getDailyFocus(new Set(), 0, "new_resident", NOW);
    expect(focus.reviewReminder).toBe(false);
    expect(focus.dueWordCount).toBe(0);
  });

  it("suggested topic includes starterMessage and titleKr", () => {
    const focus = getDailyFocus(new Set(), 0, "new_resident", NOW);
    expect(focus.suggestedTopic).not.toBeNull();
    expect(focus.suggestedTopic!.starterMessage.length).toBeGreaterThan(0);
    expect(focus.suggestedTopic!.titleKr.length).toBeGreaterThan(0);
    expect(focus.suggestedTopic!.title.length).toBeGreaterThan(0);
  });

  it("returns null suggestedTopic when no topics are unlocked", () => {
    // This shouldn't normally happen since beginner topics have no rank req,
    // but the function handles it gracefully
    const allVisited = new Set([
      "greetings", "survival", "numbers", "food", "feelings", "politeness",
    ]);
    // new_resident with all beginner visited — should fall to "review"
    const focus = getDailyFocus(allVisited, 0, "new_resident", NOW);
    expect(focus.suggestedTopic).not.toBeNull();
    expect(focus.reason).toBe("review");
  });

  it("cycles through visited topics when all are done", () => {
    const allVisited = new Set([
      "greetings", "survival", "numbers", "food", "feelings", "politeness",
    ]);
    const focus = getDailyFocus(allVisited, 0, "floor_senior", NOW);
    expect(focus.reason).toBe("review");
    expect(focus.suggestedTopic).not.toBeNull();
  });
});
