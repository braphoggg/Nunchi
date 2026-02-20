/**
 * Adversarial break tests for hangul-compose.ts
 *
 * Targets Hangul Composition Edge Cases (#12):
 *   H1: Backspace past empty state — no crash
 *   H2: 4 backspaces on 3-jamo composition — empties cleanly
 *   H3: Rapid alternating jamo+backspace ×100 — no state corruption
 *
 * Also includes fuzz testing of the composition engine with random jamo sequences.
 */
import { describe, it, expect } from "vitest";
import {
  createCompositionState,
  feedJamo,
  feedBackspace,
  getDisplayText,
  commitAll,
  INITIALS,
  MEDIALS,
  type CompositionState,
} from "../hangul-compose";

describe("BREAK: Hangul composition edge cases (#12)", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // H1: Backspace past empty state
  // ─────────────────────────────────────────────────────────────────────────
  it("H1: backspace on empty state returns unchanged state — no crash", () => {
    const empty = createCompositionState();

    // Backspace on completely empty state
    const result = feedBackspace(empty);

    // FINDING: feedBackspace checks `state.committed.length === 0` and
    // returns the state unchanged. No crash, no negative indices.
    expect(result.committed).toBe("");
    expect(result.composing).toBeNull();
    expect(getDisplayText(result)).toBe("");

    // Multiple backspaces on empty state — still safe
    let state = empty;
    for (let i = 0; i < 10; i++) {
      state = feedBackspace(state);
    }
    expect(state.committed).toBe("");
    expect(state.composing).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // H2: 4 backspaces on 3-jamo composition (ㅎ + ㅏ + ㄴ = 한)
  // ─────────────────────────────────────────────────────────────────────────
  it("H2: 4 backspaces on 3-jamo syllable '한' empties cleanly, no crash on extra", () => {
    let state = createCompositionState();

    // Compose 한: ㅎ → ㅎ, ㅏ → 하, ㄴ → 한
    state = feedJamo(state, "ㅎ");
    expect(getDisplayText(state)).toBe("ㅎ");

    state = feedJamo(state, "ㅏ");
    expect(getDisplayText(state)).toBe("하");

    state = feedJamo(state, "ㄴ");
    expect(getDisplayText(state)).toBe("한");

    // Backspace 1: remove final ㄴ → 하
    state = feedBackspace(state);
    expect(getDisplayText(state)).toBe("하");

    // Backspace 2: remove medial ㅏ → ㅎ
    state = feedBackspace(state);
    expect(getDisplayText(state)).toBe("ㅎ");

    // Backspace 3: remove initial ㅎ → empty
    state = feedBackspace(state);
    expect(getDisplayText(state)).toBe("");
    expect(state.composing).toBeNull();

    // Backspace 4: already empty — no crash
    state = feedBackspace(state);
    expect(getDisplayText(state)).toBe("");
    expect(state.composing).toBeNull();

    // FINDING: The composition engine correctly decomposes syllable components
    // in reverse order (final → medial → initial → empty) and handles the
    // extra backspace on empty state without crashing.
  });

  // ─────────────────────────────────────────────────────────────────────────
  // H3: Rapid alternating jamo+backspace ×100
  // ─────────────────────────────────────────────────────────────────────────
  it("H3: rapid alternating feed/backspace ×100 — no state corruption", () => {
    let state = createCompositionState();

    // Alternate between feeding ㄱ and backspacing 100 times
    for (let i = 0; i < 100; i++) {
      state = feedJamo(state, "ㄱ");
      // At this point we should have a composing consonant
      expect(state.composing).not.toBeNull();
      expect(getDisplayText(state)).toBe("ㄱ");

      state = feedBackspace(state);
      // Back to empty composing
      expect(state.composing).toBeNull();
      expect(state.committed).toBe("");
    }

    // FINDING: No state corruption after 100 cycles. The committed string
    // stays empty and composing alternates between ㄱ and null correctly.
    expect(getDisplayText(state)).toBe("");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // H-fuzz: Random jamo sequences — no crashes, valid output
  // ─────────────────────────────────────────────────────────────────────────
  it("H-fuzz: 200 random jamo/backspace sequences produce valid state", () => {
    const allJamo = [...INITIALS, ...MEDIALS];

    for (let trial = 0; trial < 200; trial++) {
      let state = createCompositionState();
      const seqLength = Math.floor(Math.random() * 20) + 1;

      for (let i = 0; i < seqLength; i++) {
        if (Math.random() < 0.3) {
          // 30% chance of backspace
          state = feedBackspace(state);
        } else {
          // 70% chance of feeding a random jamo
          const jamo = allJamo[Math.floor(Math.random() * allJamo.length)];
          state = feedJamo(state, jamo);
        }

        // Invariant: state must always be valid
        assertValidState(state);
      }

      // Commit all and verify final text is valid
      const text = commitAll(state);
      expect(typeof text).toBe("string");

      // Committed text should only contain valid Hangul syllables, jamo, or be empty
      for (const ch of text) {
        const code = ch.charCodeAt(0);
        const isHangulSyllable = code >= 0xAC00 && code <= 0xD7AF;
        const isJamo = code >= 0x3130 && code <= 0x318F;
        const isCompatJamo = code >= 0x1100 && code <= 0x11FF;
        expect(isHangulSyllable || isJamo || isCompatJamo).toBe(true);
      }
    }

    // FINDING: The composition engine never crashes on any random jamo/backspace
    // sequence. All committed text contains only valid Hangul characters.
  });

  // ─────────────────────────────────────────────────────────────────────────
  // H-nonkorean: Non-Korean input commits and resets composing
  // ─────────────────────────────────────────────────────────────────────────
  it("H-nonkorean: feeding non-Korean chars during composition commits and resets", () => {
    let state = createCompositionState();

    // Start composing 가
    state = feedJamo(state, "ㄱ");
    state = feedJamo(state, "ㅏ");
    expect(getDisplayText(state)).toBe("가");

    // Feed a non-Korean character
    state = feedJamo(state, "a");

    // FINDING: Non-Korean characters commit the current composing syllable
    // and append the non-Korean character. Composing resets to null.
    expect(state.composing).toBeNull();
    expect(state.committed).toBe("가a");
    expect(getDisplayText(state)).toBe("가a");
  });
});

// ── Assertion helper ────────────────────────────────────────────────────────

function assertValidState(state: CompositionState): void {
  expect(typeof state.committed).toBe("string");
  expect(state.committed.length).toBeGreaterThanOrEqual(0);

  if (state.composing !== null) {
    expect(typeof state.composing.initial).toBe("number");
    expect(state.composing.initial).toBeGreaterThanOrEqual(0);
    expect(state.composing.initial).toBeLessThan(19); // 19 initials

    if (state.composing.medial !== null) {
      expect(state.composing.medial).toBeGreaterThanOrEqual(0);
      expect(state.composing.medial).toBeLessThan(21); // 21 medials
    }

    expect(typeof state.composing.final).toBe("number");
    expect(state.composing.final).toBeGreaterThanOrEqual(0);
    expect(state.composing.final).toBeLessThan(28); // 28 finals
  }
}
