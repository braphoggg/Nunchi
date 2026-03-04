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

  it("returns a daily quote", () => {
    const focus = getDailyFocus(new Set(), 0, "new_resident", NOW);
    expect(focus.dailyQuote.korean).toBeTruthy();
    expect(focus.dailyQuote.english).toBeTruthy();
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
