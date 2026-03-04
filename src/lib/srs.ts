/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Adapted from the SuperMemo SM-2 algorithm for flashcard scheduling.
 * Each vocabulary word tracks its own ease factor, interval, and repetition count.
 *
 * Grade mapping:
 *   "again" → quality 1 (failed — reset repetitions, review soon)
 *   "good"  → quality 3 (passed — standard interval growth)
 *   "easy"  → quality 5 (passed easily — boosted interval)
 */

import type { FlashcardGrade } from "@/hooks/useFlashcards";

export interface SRSState {
  easeFactor: number;   // starts at 2.5, min 1.3
  interval: number;     // days until next review
  repetitions: number;  // consecutive correct repetitions
  nextReview: string;   // ISO date string
  lastGrade: FlashcardGrade | null;
}

export const SRS_DEFAULTS: Readonly<SRSState> = {
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  nextReview: new Date(0).toISOString(), // epoch — always "due"
  lastGrade: null,
};

/** SM-2 quality scores for each grade */
const GRADE_QUALITY: Record<FlashcardGrade, number> = {
  again: 1,
  good: 3,
  easy: 5,
};

/**
 * Compute next SRS state after a flashcard is graded.
 */
export function computeNextSRS(
  current: SRSState,
  grade: FlashcardGrade,
  now: Date = new Date(),
): SRSState {
  const quality = GRADE_QUALITY[grade];

  let { easeFactor, interval, repetitions } = current;

  // SM-2 ease factor adjustment
  easeFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);

  if (quality >= 3) {
    // Passed — grow interval
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Failed — reset
    repetitions = 0;
    interval = 0; // due immediately next session
  }

  // Easy bonus — boost interval by 30%
  if (grade === "easy" && interval > 0) {
    interval = Math.round(interval * 1.3);
  }

  // Compute next review date
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    nextReview: nextReview.toISOString(),
    lastGrade: grade,
  };
}

/**
 * Check if a word is due for review (nextReview <= now).
 * Words without nextReview are always considered due.
 */
export function isDueForReview(
  word: { nextReview?: string },
  now: Date = new Date(),
): boolean {
  if (!word.nextReview) return true;
  return new Date(word.nextReview) <= now;
}

/**
 * Count studyable words that are due for review.
 */
export function countDueWords(
  words: Array<{ nextReview?: string; english: string }>,
  now: Date = new Date(),
): number {
  return words.filter(
    (w) => w.english.trim() !== "" && isDueForReview(w, now),
  ).length;
}

/**
 * Format next review date relative to now for display.
 */
export function formatNextReview(
  nextReview: string,
  now: Date = new Date(),
): string {
  const reviewDate = new Date(nextReview);
  const diffMs = reviewDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "due now";
  if (diffDays === 1) return "tomorrow";
  if (diffDays < 7) return `in ${diffDays} days`;
  const weeks = Math.ceil(diffDays / 7);
  if (diffDays < 30) return weeks === 1 ? "in 1 week" : `in ${weeks} weeks`;
  const months = Math.ceil(diffDays / 30);
  return months === 1 ? "in 1 month" : `in ${months} months`;
}

/**
 * Get SRS state from a vocabulary word, filling defaults for missing fields.
 */
export function getSRSState(word: {
  easeFactor?: number;
  interval?: number;
  repetitions?: number;
  nextReview?: string;
  lastGrade?: FlashcardGrade | null;
}): SRSState {
  return {
    easeFactor: word.easeFactor ?? SRS_DEFAULTS.easeFactor,
    interval: word.interval ?? SRS_DEFAULTS.interval,
    repetitions: word.repetitions ?? SRS_DEFAULTS.repetitions,
    nextReview: word.nextReview ?? SRS_DEFAULTS.nextReview,
    lastGrade: word.lastGrade ?? SRS_DEFAULTS.lastGrade,
  };
}
