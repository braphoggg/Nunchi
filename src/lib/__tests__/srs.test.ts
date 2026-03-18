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

describe("computeNextSRS edge cases", () => {
  it("floors ease at 1.3 after multiple consecutive 'again' grades", () => {
    // Start at 2.5, each "again" subtracts 0.54 (clamped to 1.3)
    let state = makeState({ easeFactor: 2.5 });
    state = computeNextSRS(state, "again", NOW); // 2.5 - 0.54 = 1.96
    expect(state.easeFactor).toBe(1.96);
    state = computeNextSRS(state, "again", NOW); // 1.96 - 0.54 = 1.42
    expect(state.easeFactor).toBe(1.42);
    state = computeNextSRS(state, "again", NOW); // 1.42 - 0.54 = 0.88 → clamped to 1.3
    expect(state.easeFactor).toBe(1.3);
    state = computeNextSRS(state, "again", NOW); // stays at 1.3
    expect(state.easeFactor).toBe(1.3);
  });

  it("clamps ease to 1.3 when close to minimum then 'again'", () => {
    // 1.35 - 0.54 = 0.81 → clamped to 1.3
    const state = computeNextSRS(makeState({ easeFactor: 1.35 }), "again", NOW);
    expect(state.easeFactor).toBe(1.3);
  });

  it("grows a large interval correctly with 'good'", () => {
    // interval=365, repetitions=5, easeFactor=2.5
    // ease: 2.5 - 0.14 = 2.36
    // interval: round(365 * 2.36) = round(861.4) = 861
    const state = makeState({ interval: 365, repetitions: 5, easeFactor: 2.5 });
    const result = computeNextSRS(state, "good", NOW);
    expect(result.easeFactor).toBe(2.36);
    expect(result.interval).toBe(Math.round(365 * 2.36)); // 861
    expect(result.repetitions).toBe(6);
  });

  it("gives 'easy' on a brand new card interval of round(1*1.3)=1", () => {
    // rep=0 → interval=1, then easy bonus: round(1*1.3) = 1
    // ease: 2.5 + 0.1 = 2.6
    const result = computeNextSRS(makeState(), "easy", NOW);
    expect(result.interval).toBe(Math.round(1 * 1.3)); // 1
    expect(result.easeFactor).toBe(2.6);
    expect(result.repetitions).toBe(1);
  });

  it("resets and regrows correctly with alternating good/again/good", () => {
    let state = makeState(); // ease=2.5, rep=0, interval=0

    // good: rep 0→1, interval=1, ease=2.5-0.14=2.36
    state = computeNextSRS(state, "good", NOW);
    expect(state.interval).toBe(1);
    expect(state.repetitions).toBe(1);
    expect(state.easeFactor).toBe(2.36);

    // again: rep→0, interval→0, ease=2.36-0.54=1.82
    state = computeNextSRS(state, "again", NOW);
    expect(state.interval).toBe(0);
    expect(state.repetitions).toBe(0);
    expect(state.easeFactor).toBe(1.82);

    // good: rep 0→1, interval=1 (first rep after reset), ease=1.82-0.14=1.68
    state = computeNextSRS(state, "good", NOW);
    expect(state.interval).toBe(1);
    expect(state.repetitions).toBe(1);
    expect(state.easeFactor).toBe(1.68);
  });

  it("maintains ease factor precision after many operations", () => {
    let state = makeState();
    for (let i = 0; i < 20; i++) {
      state = computeNextSRS(state, "good", NOW);
    }
    const decimals = state.easeFactor.toString().split(".")[1];
    expect(!decimals || decimals.length <= 2).toBe(true);
  });

  it("resets interval to 0 on 'again' after many 'good' grades", () => {
    let state = makeState();
    for (let i = 0; i < 10; i++) {
      state = computeNextSRS(state, "good", NOW);
    }
    expect(state.interval).toBeGreaterThan(0);
    state = computeNextSRS(state, "again", NOW);
    expect(state.interval).toBe(0);
    expect(state.repetitions).toBe(0);
  });

  it("accelerates growth with three consecutive 'easy' grades", () => {
    let state = makeState(); // ease=2.5

    // easy #1: rep 0→1, interval=1, easy bonus round(1*1.3)=1, ease=2.6
    state = computeNextSRS(state, "easy", NOW);
    expect(state.interval).toBe(1);
    expect(state.easeFactor).toBe(2.6);

    // easy #2: rep 1→2, interval=6, easy bonus round(6*1.3)=8, ease=2.7
    state = computeNextSRS(state, "easy", NOW);
    expect(state.interval).toBe(Math.round(6 * 1.3)); // 8
    expect(state.easeFactor).toBe(2.7);

    // easy #3: rep 2→3, interval=round(8*2.8)=22, easy bonus round(22*1.3)=29, ease=2.8
    state = computeNextSRS(state, "easy", NOW);
    const baseInterval = Math.round(8 * 2.8); // 22
    expect(state.interval).toBe(Math.round(baseInterval * 1.3)); // 29
    expect(state.easeFactor).toBe(2.8);
  });
});

describe("formatNextReview edge cases", () => {
  it("shows 'in 1 week' for exactly 7 days", () => {
    // 7 days from NOW
    const sevenDays = new Date(NOW);
    sevenDays.setDate(sevenDays.getDate() + 7);
    expect(formatNextReview(sevenDays.toISOString(), NOW)).toBe("in 1 week");
  });

  it("shows 'in 1 month' for exactly 30 days", () => {
    // 30 days from NOW
    const thirtyDays = new Date(NOW);
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    expect(formatNextReview(thirtyDays.toISOString(), NOW)).toBe("in 1 month");
  });

  it("shows months for 365 days in the future", () => {
    const farFuture = new Date(NOW);
    farFuture.setDate(farFuture.getDate() + 365);
    // Math.ceil(365/30) = 13
    expect(formatNextReview(farFuture.toISOString(), NOW)).toBe("in 13 months");
  });

  it("shows 'tomorrow' for 1 millisecond in the future", () => {
    // 1ms ahead: diffMs=1, Math.ceil(1/(86400000))=1 → "tomorrow"
    const oneMs = new Date(NOW.getTime() + 1);
    expect(formatNextReview(oneMs.toISOString(), NOW)).toBe("tomorrow");
  });
});

describe("countDueWords edge cases", () => {
  it("counts all words when all are due", () => {
    const words = [
      { english: "cat", nextReview: "2025-06-14T00:00:00Z" },
      { english: "dog", nextReview: "2025-06-10T00:00:00Z" },
      { english: "bird" }, // no nextReview → due
    ];
    expect(countDueWords(words, NOW)).toBe(3);
  });

  it("returns 0 when no words are due", () => {
    const words = [
      { english: "cat", nextReview: "2025-06-20T00:00:00Z" },
      { english: "dog", nextReview: "2025-07-01T00:00:00Z" },
    ];
    expect(countDueWords(words, NOW)).toBe(0);
  });

  it("excludes words with whitespace-only english", () => {
    const words = [
      { english: "   ", nextReview: "2025-06-14T00:00:00Z" },
      { english: "\t", nextReview: "2025-06-14T00:00:00Z" },
      { english: "\n", nextReview: "2025-06-14T00:00:00Z" },
      { english: "valid", nextReview: "2025-06-14T00:00:00Z" },
    ];
    expect(countDueWords(words, NOW)).toBe(1);
  });
});
