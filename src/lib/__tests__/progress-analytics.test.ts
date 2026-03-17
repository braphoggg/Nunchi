import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getXPPerDay,
  getVocabGrowth,
  getActivityDays,
  getLastNDays,
} from "../progress-analytics";
import type { XPEvent, VocabularyItem } from "@/types";

// Fix "now" to 2025-01-20 12:00 UTC for deterministic tests
const FIXED_NOW = new Date("2025-01-20T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function makeXPEvent(daysAgo: number, amount: number = 10): XPEvent {
  const d = new Date(FIXED_NOW);
  d.setDate(d.getDate() - daysAgo);
  return { action: "word_saved", amount, timestamp: d.toISOString() };
}

function makeWord(daysAgo: number): VocabularyItem {
  const d = new Date(FIXED_NOW);
  d.setDate(d.getDate() - daysAgo);
  return {
    id: `w-${daysAgo}-${Math.random()}`,
    korean: "가",
    romanization: "ga",
    english: "go",
    savedAt: d.toISOString(),
  };
}

// ─── getXPPerDay ────────────────────────────────────────────────────

describe("getXPPerDay", () => {
  it("returns 14 entries by default", () => {
    const result = getXPPerDay([]);
    expect(result.length).toBe(14);
  });

  it("returns specified number of days", () => {
    expect(getXPPerDay([], 7).length).toBe(7);
  });

  it("aggregates XP on the correct day", () => {
    const events = [
      makeXPEvent(0, 25), // today
      makeXPEvent(0, 15), // today again
      makeXPEvent(1, 10), // yesterday
    ];
    const result = getXPPerDay(events, 7);
    const today = result[result.length - 1];
    const yesterday = result[result.length - 2];

    expect(today.xp).toBe(40);
    expect(yesterday.xp).toBe(10);
  });

  it("returns 0 XP for days without events", () => {
    const result = getXPPerDay([], 3);
    result.forEach((d) => expect(d.xp).toBe(0));
  });

  it("ignores events outside the window", () => {
    const events = [makeXPEvent(20, 100)]; // 20 days ago, outside 14-day window
    const result = getXPPerDay(events, 14);
    const total = result.reduce((s, d) => s + d.xp, 0);
    expect(total).toBe(0);
  });

  it("each entry has a day label", () => {
    const result = getXPPerDay([], 3);
    result.forEach((d) => {
      expect(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).toContain(d.label);
    });
  });

  it("days=1 returns exactly 1 entry (today only)", () => {
    const result = getXPPerDay([], 1);
    expect(result.length).toBe(1);
    expect(result[0].date).toBe("2025-01-20");
  });

  it("multiple events on same day with different amounts correctly sum", () => {
    const events = [
      makeXPEvent(0, 5),
      makeXPEvent(0, 12),
      makeXPEvent(0, 3),
    ];
    const result = getXPPerDay(events, 3);
    const today = result[result.length - 1];
    expect(today.xp).toBe(20);
  });

  it("event exactly at midnight is attributed to correct day", () => {
    // Create an event at midnight UTC on 2025-01-19 (1 day ago from noon on the 20th)
    const midnightEvent: XPEvent = {
      action: "word_saved",
      amount: 50,
      timestamp: "2025-01-19T00:00:00Z",
    };
    const result = getXPPerDay([midnightEvent], 7);
    const jan19 = result.find((d) => d.date === "2025-01-19");
    expect(jan19).toBeDefined();
    expect(jan19!.xp).toBe(50);
  });
});

// ─── getVocabGrowth ─────────────────────────────────────────────────

describe("getVocabGrowth", () => {
  it("returns 14 entries by default", () => {
    const result = getVocabGrowth([]);
    expect(result.length).toBe(14);
  });

  it("shows cumulative growth", () => {
    const words = [
      makeWord(2), // 2 days ago
      makeWord(1), // 1 day ago
      makeWord(0), // today
    ];
    const result = getVocabGrowth(words, 5);
    const last = result[result.length - 1];
    expect(last.cumulative).toBe(3);
  });

  it("includes pre-window words in cumulative count", () => {
    const words = [
      makeWord(30), // before 14-day window
      makeWord(0),  // today
    ];
    const result = getVocabGrowth(words, 14);
    const first = result[0];
    expect(first.cumulative).toBeGreaterThanOrEqual(1); // pre-window word counted
    const last = result[result.length - 1];
    expect(last.cumulative).toBe(2);
  });

  it("tracks daily additions", () => {
    const words = [makeWord(0), makeWord(0), makeWord(0)]; // 3 words today
    const result = getVocabGrowth(words, 3);
    const today = result[result.length - 1];
    expect(today.added).toBe(3);
  });

  it("days=1 returns 1 entry", () => {
    const result = getVocabGrowth([], 1);
    expect(result.length).toBe(1);
    expect(result[0].date).toBe("2025-01-20");
  });

  it("all words before window — cumulative starts at word count, added=0 for all entries", () => {
    const words = [makeWord(60), makeWord(45), makeWord(35)]; // all well before 7-day window
    const result = getVocabGrowth(words, 7);
    result.forEach((entry) => {
      expect(entry.added).toBe(0);
      expect(entry.cumulative).toBe(3);
    });
  });

  it("empty words array returns all zeros", () => {
    const result = getVocabGrowth([], 5);
    result.forEach((entry) => {
      expect(entry.added).toBe(0);
      expect(entry.cumulative).toBe(0);
    });
  });
});

// ─── getActivityDays ────────────────────────────────────────────────

describe("getActivityDays", () => {
  it("returns empty set for no history", () => {
    expect(getActivityDays([]).size).toBe(0);
  });

  it("includes days with events", () => {
    const events = [makeXPEvent(0), makeXPEvent(3), makeXPEvent(7)];
    const active = getActivityDays(events, 30);
    expect(active.size).toBe(3);
  });

  it("excludes events outside the window", () => {
    const events = [makeXPEvent(40)]; // 40 days ago, outside 30-day window
    const active = getActivityDays(events, 30);
    expect(active.size).toBe(0);
  });

  it("deduplicates same-day events", () => {
    const events = [makeXPEvent(0), makeXPEvent(0), makeXPEvent(0)];
    const active = getActivityDays(events, 30);
    expect(active.size).toBe(1);
  });

  it("event exactly at cutoff boundary (30 days ago) is included", () => {
    // cutoff = now - 30 days = 2024-12-21T12:00:00Z; event at exactly that time uses >=
    const boundaryEvent: XPEvent = {
      action: "word_saved",
      amount: 10,
      timestamp: "2024-12-21T12:00:00Z",
    };
    const active = getActivityDays([boundaryEvent], 30);
    expect(active.size).toBe(1);
  });

  it("event at 31 days ago is excluded", () => {
    const oldEvent = makeXPEvent(31);
    const active = getActivityDays([oldEvent], 30);
    expect(active.size).toBe(0);
  });
});

// ─── getLastNDays ───────────────────────────────────────────────────

describe("getLastNDays", () => {
  it("returns correct number of days", () => {
    expect(getLastNDays(7).length).toBe(7);
    expect(getLastNDays(30).length).toBe(30);
  });

  it("last entry is today", () => {
    const days = getLastNDays(7);
    expect(days[days.length - 1]).toBe("2025-01-20");
  });

  it("entries are in chronological order", () => {
    const days = getLastNDays(3);
    expect(days[0]).toBe("2025-01-18");
    expect(days[1]).toBe("2025-01-19");
    expect(days[2]).toBe("2025-01-20");
  });

  it("days=1 returns just today", () => {
    const days = getLastNDays(1);
    expect(days.length).toBe(1);
    expect(days[0]).toBe("2025-01-20");
  });

  it("all dates are in YYYY-MM-DD format", () => {
    const days = getLastNDays(30);
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    days.forEach((date) => {
      expect(date).toMatch(datePattern);
    });
  });
});
