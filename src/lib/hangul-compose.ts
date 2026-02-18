/**
 * Korean Hangul composition engine for the standard 2-set (두벌식) keyboard.
 *
 * Implements syllable composition following Unicode Hangul rules:
 * - Syllable = 0xAC00 + (initial × 21 + medial) × 28 + final
 * - Initial consonants (초성): 19 jamo
 * - Medial vowels (중성): 21 jamo
 * - Final consonants (종성): 28 slots (0 = no final)
 */

// ── Lookup tables ──

export const INITIALS = [
  "ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ",
  "ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ",
]; // 19

export const MEDIALS = [
  "ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ",
  "ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ",
]; // 21

export const FINALS = [
  "","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ",
  "ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ",
  "ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ",
]; // 28

/** Complex vowel combinations: base + added → combined */
const COMPLEX_VOWEL_MAP: Record<string, string> = {
  "ㅗㅏ": "ㅘ", "ㅗㅐ": "ㅙ", "ㅗㅣ": "ㅚ",
  "ㅜㅓ": "ㅝ", "ㅜㅔ": "ㅞ", "ㅜㅣ": "ㅟ",
  "ㅡㅣ": "ㅢ",
};

/** Decompose complex vowels back to components */
const DECOMPOSE_VOWEL_MAP: Record<string, [string, string]> = {
  "ㅘ": ["ㅗ", "ㅏ"], "ㅙ": ["ㅗ", "ㅐ"], "ㅚ": ["ㅗ", "ㅣ"],
  "ㅝ": ["ㅜ", "ㅓ"], "ㅞ": ["ㅜ", "ㅔ"], "ㅟ": ["ㅜ", "ㅣ"],
  "ㅢ": ["ㅡ", "ㅣ"],
};

/** Complex final consonant combinations: base + added → combined */
const COMPLEX_FINAL_MAP: Record<string, string> = {
  "ㄱㅅ": "ㄳ", "ㄴㅈ": "ㄵ", "ㄴㅎ": "ㄶ",
  "ㄹㄱ": "ㄺ", "ㄹㅁ": "ㄻ", "ㄹㅂ": "ㄼ", "ㄹㅅ": "ㄽ",
  "ㄹㅌ": "ㄾ", "ㄹㅍ": "ㄿ", "ㄹㅎ": "ㅀ",
  "ㅂㅅ": "ㅄ",
};

/** Decompose complex finals back to two simple consonants */
const DECOMPOSE_FINAL_MAP: Record<string, [string, string]> = {
  "ㄳ": ["ㄱ", "ㅅ"], "ㄵ": ["ㄴ", "ㅈ"], "ㄶ": ["ㄴ", "ㅎ"],
  "ㄺ": ["ㄹ", "ㄱ"], "ㄻ": ["ㄹ", "ㅁ"], "ㄼ": ["ㄹ", "ㅂ"],
  "ㄽ": ["ㄹ", "ㅅ"], "ㄾ": ["ㄹ", "ㅌ"], "ㄿ": ["ㄹ", "ㅍ"],
  "ㅀ": ["ㄹ", "ㅎ"], "ㅄ": ["ㅂ", "ㅅ"],
};

// ── Classification helpers ──

function isConsonant(ch: string): boolean {
  return INITIALS.includes(ch);
}

function isVowel(ch: string): boolean {
  return MEDIALS.includes(ch);
}

function initialIndex(ch: string): number {
  return INITIALS.indexOf(ch);
}

function medialIndex(ch: string): number {
  return MEDIALS.indexOf(ch);
}

function finalIndex(ch: string): number {
  return FINALS.indexOf(ch);
}

/** Can this consonant serve as a final (종성)? */
function canBeFinal(ch: string): boolean {
  return FINALS.indexOf(ch) > 0; // index 0 is empty string
}

// ── Syllable composition ──

function composeSyllable(initial: number, medial: number, final: number): string {
  return String.fromCharCode(0xAC00 + (initial * 21 + medial) * 28 + final);
}

// ── Composition state ──

export interface CompositionState {
  /** Characters that are finalized and won't change */
  committed: string;
  /** Current syllable being composed, or null */
  composing: {
    initial: number;       // index into INITIALS
    medial: number | null; // index into MEDIALS, null = consonant-only
    final: number;         // index into FINALS (0 = none)
  } | null;
}

export function createCompositionState(): CompositionState {
  return { committed: "", composing: null };
}

/** Get the display text (committed + currently composing character) */
export function getDisplayText(state: CompositionState): string {
  if (!state.composing) return state.committed;

  const { initial, medial, final: fin } = state.composing;

  if (medial === null) {
    // Just an initial consonant, show as jamo
    return state.committed + INITIALS[initial];
  }

  return state.committed + composeSyllable(initial, medial, fin);
}

/** Commit all composing state and return the final string */
export function commitAll(state: CompositionState): string {
  return getDisplayText(state);
}

/** Feed a jamo character into the composition state */
export function feedJamo(state: CompositionState, jamo: string): CompositionState {
  const s = { ...state, composing: state.composing ? { ...state.composing } : null };

  // ── No active composition ──
  if (!s.composing) {
    if (isConsonant(jamo)) {
      return { committed: s.committed, composing: { initial: initialIndex(jamo), medial: null, final: 0 } };
    }
    if (isVowel(jamo)) {
      // Vowel with no preceding consonant → commit as-is
      return { committed: s.committed + jamo, composing: null };
    }
    return { committed: s.committed + jamo, composing: null };
  }

  const comp = s.composing;

  // ── Have initial only (no medial yet) ──
  if (comp.medial === null) {
    if (isVowel(jamo)) {
      // Consonant + vowel → form syllable
      return { committed: s.committed, composing: { initial: comp.initial, medial: medialIndex(jamo), final: 0 } };
    }
    if (isConsonant(jamo)) {
      // Another consonant → commit current as jamo, start new
      return { committed: s.committed + INITIALS[comp.initial], composing: { initial: initialIndex(jamo), medial: null, final: 0 } };
    }
    return { committed: s.committed + INITIALS[comp.initial] + jamo, composing: null };
  }

  // ── Have initial + medial (possibly with final) ──

  // Try adding vowel
  if (isVowel(jamo)) {
    // If we have a final consonant, the final detaches to become next initial
    if (comp.final > 0) {
      const finalStr = FINALS[comp.final];
      // Check if final is complex — if so, decompose and keep first part
      const decomposed = DECOMPOSE_FINAL_MAP[finalStr];
      if (decomposed) {
        const [keep, move] = decomposed;
        const keepIdx = finalIndex(keep);
        // Try complex vowel first
        const moveInitial = initialIndex(move);
        const complexKey = MEDIALS[comp.medial] + jamo; // Wait — this isn't right for the NEW syllable
        // Actually: commit current syllable with keepIdx as final, start new syllable with move + jamo
        // But first check if jamo can combine with nothing (it's a vowel for the new syllable)
        return {
          committed: s.committed + composeSyllable(comp.initial, comp.medial, keepIdx),
          composing: { initial: moveInitial, medial: medialIndex(jamo), final: 0 },
        };
      }
      // Simple final → detach entirely
      const movedInitial = initialIndex(finalStr);
      if (movedInitial >= 0) {
        return {
          committed: s.committed + composeSyllable(comp.initial, comp.medial, 0),
          composing: { initial: movedInitial, medial: medialIndex(jamo), final: 0 },
        };
      }
    }

    // No final — try to combine vowels (complex vowel)
    const currentVowel = MEDIALS[comp.medial];
    const complexKey = currentVowel + jamo;
    if (COMPLEX_VOWEL_MAP[complexKey]) {
      const newMedial = medialIndex(COMPLEX_VOWEL_MAP[complexKey]);
      return { committed: s.committed, composing: { initial: comp.initial, medial: newMedial, final: 0 } };
    }

    // Can't combine — commit current syllable plus the standalone vowel
    return {
      committed: s.committed + composeSyllable(comp.initial, comp.medial, comp.final) + jamo,
      composing: null,
    };
  }

  // Try adding consonant
  if (isConsonant(jamo)) {
    // No final yet — try to set as final
    if (comp.final === 0) {
      if (canBeFinal(jamo)) {
        return { committed: s.committed, composing: { initial: comp.initial, medial: comp.medial, final: finalIndex(jamo) } };
      }
      // Can't be final — commit, start new
      return {
        committed: s.committed + composeSyllable(comp.initial, comp.medial, 0),
        composing: { initial: initialIndex(jamo), medial: null, final: 0 },
      };
    }

    // Already have a final — try to form complex final
    const currentFinal = FINALS[comp.final];
    const complexKey = currentFinal + jamo;
    if (COMPLEX_FINAL_MAP[complexKey]) {
      const newFinalIdx = finalIndex(COMPLEX_FINAL_MAP[complexKey]);
      if (newFinalIdx > 0) {
        return { committed: s.committed, composing: { initial: comp.initial, medial: comp.medial, final: newFinalIdx } };
      }
    }

    // Can't form complex final — commit current syllable, start new with this consonant
    return {
      committed: s.committed + composeSyllable(comp.initial, comp.medial, comp.final),
      composing: { initial: initialIndex(jamo), medial: null, final: 0 },
    };
  }

  // Non-Korean character — commit everything, append as-is
  return {
    committed: s.committed + composeSyllable(comp.initial, comp.medial, comp.final) + jamo,
    composing: null,
  };
}

/** Handle backspace — remove the last composed component */
export function feedBackspace(state: CompositionState): CompositionState {
  // No composing — remove last committed character
  if (!state.composing) {
    if (state.committed.length === 0) return state;
    return { committed: state.committed.slice(0, -1), composing: null };
  }

  const comp = state.composing;

  // Has final → remove final (decompose complex final first)
  if (comp.final > 0) {
    const finalStr = FINALS[comp.final];
    const decomposed = DECOMPOSE_FINAL_MAP[finalStr];
    if (decomposed) {
      // Complex final → reduce to first component
      const [keep] = decomposed;
      return { committed: state.committed, composing: { ...comp, final: finalIndex(keep) } };
    }
    // Simple final → remove
    return { committed: state.committed, composing: { ...comp, final: 0 } };
  }

  // Has medial → remove medial (decompose complex vowel first)
  if (comp.medial !== null) {
    const vowelStr = MEDIALS[comp.medial];
    const decomposed = DECOMPOSE_VOWEL_MAP[vowelStr];
    if (decomposed) {
      // Complex vowel → reduce to first component
      const [keep] = decomposed;
      return { committed: state.committed, composing: { ...comp, medial: medialIndex(keep) } };
    }
    // Simple vowel → back to just initial
    return { committed: state.committed, composing: { ...comp, medial: null } };
  }

  // Only initial → remove entirely
  return { committed: state.committed, composing: null };
}
