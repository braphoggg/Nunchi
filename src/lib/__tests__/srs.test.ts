import { describe, it, expect } from "vitest";
import {
  computeNextSRS,
  isDueForReview,
  countDueWords,
  formatNextReview,
  getSRSState,
  SRS_DEFAULTS,
  type SRSState,
} from "../srs";

const NOW = new Date("2025-06-15T12:00:00Z");

function makeState(overrides: Partial<SRSState> = {}): SRSState {
  return { ...SRS_DEFAULTS, ...overrides };
}

describe("computeNextSRS", () => {
  it("sets interval to 1 day on first 'good' grade", () => {
    const result = computeNextSRS(makeState(), "good", NOW);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
    expect(result.lastGrade).toBe("good");
  });

  it("sets interval to 6 days on second 'good' grade", () => {
    const first = computeNextSRS(makeState(), "good", NOW);
    const second = computeNextSRS(first, "good", NOW);
    expect(second.interval).toBe(6);
    expect(second.repetitions).toBe(2);
  });

  it("grows interval by easeFactor on third+ 'good' grade", () => {
    let state = makeState();
    state = computeNextSRS(state, "good", NOW); // interval 1
    state = computeNextSRS(state, "good", NOW); // interval 6
    state = computeNextSRS(state, "good", NOW); // interval ~ 6 * easeFactor
    expect(state.interval).toBeGreaterThanOrEqual(12); // 6 * ~2.08 (ease drops with q=3)
    expect(state.repetitions).toBe(3);
  });

  it("resets repetitions and interval on 'again'", () => {
    const studied = computeNextSRS(makeState(), "good", NOW);
    const failed = computeNextSRS(studied, "again", NOW);
    expect(failed.repetitions).toBe(0);
    expect(failed.interval).toBe(0);
    expect(failed.lastGrade).toBe("again");
  });

  it("decreases ease factor on 'again'", () => {
    const result = computeNextSRS(makeState({ easeFactor: 2.5 }), "again", NOW);
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  it("never lets ease factor drop below 1.3", () => {
    let state = makeState({ easeFactor: 1.3 });
    state = computeNextSRS(state, "again", NOW);
    expect(state.easeFactor).toBe(1.3);
  });

  it("gives 'easy' a 30% interval bonus", () => {
    const good = computeNextSRS(makeState(), "good", NOW);
    const easy = computeNextSRS(makeState(), "easy", NOW);
    expect(easy.interval).toBe(Math.round(1 * 1.3)); // 1 * 1.3 = 1.3 → 1
    // After second rep: easy should have larger interval than good
    const good2 = computeNextSRS(good, "good", NOW);
    const easy2 = computeNextSRS(easy, "easy", NOW);
    expect(easy2.interval).toBeGreaterThan(good2.interval);
  });

  it("increases ease factor on 'easy'", () => {
    const result = computeNextSRS(makeState({ easeFactor: 2.5 }), "easy", NOW);
    expect(result.easeFactor).toBeGreaterThan(2.5);
  });

  it("sets nextReview to correct future date", () => {
    const result = computeNextSRS(makeState(), "good", NOW);
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() + 1);
    expect(new Date(result.nextReview).toDateString()).toBe(
      expected.toDateString()
    );
  });

  it("sets nextReview to today when interval is 0 (again on new card)", () => {
    const result = computeNextSRS(makeState(), "again", NOW);
    expect(result.interval).toBe(0);
    expect(new Date(result.nextReview).toDateString()).toBe(NOW.toDateString());
  });

  it("rounds ease factor to 2 decimal places", () => {
    const result = computeNextSRS(makeState(), "good", NOW);
    const decimals = result.easeFactor.toString().split(".")[1];
    expect(!decimals || decimals.length <= 2).toBe(true);
  });
});

describe("isDueForReview", () => {
  it("returns true when word has no nextReview", () => {
    expect(isDueForReview({}, NOW)).toBe(true);
  });

  it("returns true when nextReview is in the past", () => {
    expect(
      isDueForReview({ nextReview: "2025-06-14T00:00:00Z" }, NOW)
    ).toBe(true);
  });

  it("returns true when nextReview is exactly now", () => {
    expect(isDueForReview({ nextReview: NOW.toISOString() }, NOW)).toBe(true);
  });

  it("returns false when nextReview is in the future", () => {
    expect(
      isDueForReview({ nextReview: "2025-06-16T00:00:00Z" }, NOW)
    ).toBe(false);
  });
});

describe("countDueWords", () => {
  it("counts only studyable due words", () => {
    const words = [
      { english: "door", nextReview: "2025-06-14T00:00:00Z" }, // due
      { english: "room", nextReview: "2025-06-20T00:00:00Z" }, // not due
      { english: "", nextReview: "2025-06-14T00:00:00Z" }, // no english
      { english: "wall" }, // no nextReview → due
    ];
    expect(countDueWords(words, NOW)).toBe(2);
  });

  it("returns 0 for empty array", () => {
    expect(countDueWords([], NOW)).toBe(0);
  });
});

describe("formatNextReview", () => {
  it("shows 'due now' for past dates", () => {
    expect(formatNextReview("2025-06-14T00:00:00Z", NOW)).toBe("due now");
  });

  it("shows 'due now' for today", () => {
    expect(formatNextReview(NOW.toISOString(), NOW)).toBe("due now");
  });

  it("shows 'tomorrow' for next day", () => {
    expect(formatNextReview("2025-06-16T12:00:00Z", NOW)).toBe("tomorrow");
  });

  it("shows 'in N days' for 2-6 days", () => {
    expect(formatNextReview("2025-06-18T12:00:00Z", NOW)).toBe("in 3 days");
  });

  it("shows 'in N weeks' for 7-29 days", () => {
    expect(formatNextReview("2025-06-25T12:00:00Z", NOW)).toMatch(
      /in \d+ weeks?/
    );
  });

  it("shows 'in N months' for 30+ days", () => {
    expect(formatNextReview("2025-08-15T12:00:00Z", NOW)).toMatch(
      /in \d+ months?/
    );
  });
});

describe("getSRSState", () => {
  it("fills defaults for empty object", () => {
    const state = getSRSState({});
    expect(state.easeFactor).toBe(2.5);
    expect(state.interval).toBe(0);
    expect(state.repetitions).toBe(0);
    expect(state.lastGrade).toBeNull();
  });

  it("preserves existing values", () => {
    const state = getSRSState({
      easeFactor: 2.0,
      interval: 6,
      repetitions: 2,
      nextReview: "2025-06-20T00:00:00Z",
      lastGrade: "good",
    });
    expect(state.easeFactor).toBe(2.0);
    expect(state.interval).toBe(6);
    expect(state.repetitions).toBe(2);
    expect(state.lastGrade).toBe("good");
  });
});
