import { describe, it, expect, beforeEach } from "vitest";
import { getRandomEvent, resetEventTracker } from "../goshiwon-events";

describe("goshiwon-events", () => {
  beforeEach(() => {
    resetEventTracker();
  });

  it("returns an event with korean and english properties", () => {
    const event = getRandomEvent();
    expect(event).toHaveProperty("korean");
    expect(event).toHaveProperty("english");
    expect(event.korean.length).toBeGreaterThan(0);
    expect(event.english.length).toBeGreaterThan(0);
  });

  it("avoids returning the same event twice in a row", () => {
    // Run enough iterations that a collision would be extremely likely
    // if there were no avoidance logic
    let consecutiveDuplicates = 0;
    let lastKorean = "";

    for (let i = 0; i < 50; i++) {
      const event = getRandomEvent();
      if (event.korean === lastKorean) {
        consecutiveDuplicates++;
      }
      lastKorean = event.korean;
    }

    expect(consecutiveDuplicates).toBe(0);
  });

  it("returns different events over multiple calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      seen.add(getRandomEvent().korean);
    }
    // Should see at least a few different events
    expect(seen.size).toBeGreaterThan(3);
  });
});
