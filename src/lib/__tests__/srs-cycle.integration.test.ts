/**
 * Integration tests: SRS full cycle — grade → computeNextSRS → isDueForReview roundtrip
 */
import { describe, it, expect } from "vitest";
import { computeNextSRS, isDueForReview, SRS_DEFAULTS, type SRSState } from "../srs";

function makeSRS(overrides: Partial<SRSState> = {}): SRSState {
  return {
    ...SRS_DEFAULTS,
    nextReview: new Date().toISOString(),
    ...overrides,
  };
}

describe("SRS full cycle integration", () => {
  it("new word graded 'good' becomes due after 1 day", () => {
    const srs = makeSRS();
    const now = new Date("2025-06-01T10:00:00Z");
    const updated = computeNextSRS(srs, "good", now);

    // After first 'good' on a new word, interval should be 1
    expect(updated.interval).toBe(1);
    expect(updated.repetitions).toBe(1);

    // Should NOT be due immediately after grading
    expect(isDueForReview(updated, now)).toBe(false);

    // Should be due after 1 day
    const tomorrow = new Date("2025-06-02T10:00:00Z");
    expect(isDueForReview(updated, tomorrow)).toBe(true);
  });

  it("word graded 'easy' gets longer interval than 'good'", () => {
    const srs = makeSRS({ repetitions: 2, interval: 6, easeFactor: 2.5 });
    const now = new Date("2025-06-01T10:00:00Z");

    const afterGood = computeNextSRS(srs, "good", now);
    const afterEasy = computeNextSRS(srs, "easy", now);

    expect(afterEasy.interval).toBeGreaterThan(afterGood.interval);
  });

  it("word graded 'again' resets interval to 0 (due immediately next session)", () => {
    const srs = makeSRS({ repetitions: 5, interval: 30, easeFactor: 2.5 });
    const now = new Date("2025-06-01T10:00:00Z");
    const updated = computeNextSRS(srs, "again", now);

    // SM-2: 'again' sets interval to 0 (due immediately)
    expect(updated.interval).toBe(0);
    expect(updated.repetitions).toBe(0);

    // Should be due immediately (nextReview == now)
    expect(isDueForReview(updated, now)).toBe(true);
  });

  it("multiple 'good' grades produce increasing intervals", () => {
    let srs = makeSRS();
    const intervals: number[] = [];
    let now = new Date("2025-06-01T10:00:00Z");

    for (let i = 0; i < 5; i++) {
      const updated = computeNextSRS(srs, "good", now);
      intervals.push(updated.interval);
      srs = updated;
      // Advance time past the next review date
      now = new Date(now.getTime() + updated.interval * 24 * 60 * 60 * 1000 + 1000);
    }

    // Each subsequent interval should be >= the previous
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    }
  });

  it("SRS state transitions: repetitions=0 → learning → interval >= 21 (mastered)", () => {
    let srs = makeSRS();
    expect(srs.repetitions).toBe(0); // "new" state

    let now = new Date("2025-06-01T10:00:00Z");

    // Grade 'good' multiple times to build up interval
    for (let i = 0; i < 10; i++) {
      const updated = computeNextSRS(srs, "good", now);
      srs = updated;
      now = new Date(now.getTime() + updated.interval * 24 * 60 * 60 * 1000 + 1000);
    }

    // After many good reviews, interval should be >= 21 (mastered threshold)
    expect(srs.repetitions).toBeGreaterThanOrEqual(1);
    expect(srs.interval).toBeGreaterThanOrEqual(21);
  });

  it("ease factor decreases with 'again' and recovers with 'easy'", () => {
    const srs = makeSRS({ repetitions: 3, interval: 10, easeFactor: 2.5 });
    const now = new Date("2025-06-01T10:00:00Z");

    // Grade 'again' — ease should decrease
    const afterAgain = computeNextSRS(srs, "again", now);
    expect(afterAgain.easeFactor).toBeLessThan(2.5);

    // Grade 'easy' on a word — ease should increase
    const afterEasy = computeNextSRS(afterAgain, "easy", now);
    expect(afterEasy.easeFactor).toBeGreaterThan(afterAgain.easeFactor);
  });
});
