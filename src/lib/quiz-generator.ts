/**
 * Quiz Generator — creates multiple-choice questions from vocabulary.
 *
 * Question types:
 *   "korean_to_english" — shows Korean, pick correct English
 *   "english_to_korean" — shows English, pick correct Korean
 */

import type { VocabularyItem } from "@/types";

export type QuizQuestionType = "korean_to_english" | "english_to_korean";

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;         // The word shown (Korean or English)
  correctAnswer: string;  // The correct answer
  options: string[];      // 4 shuffled options (includes correct answer)
  wordId: string;         // The vocabulary word ID
}

export interface QuizResult {
  total: number;
  correct: number;
  wrong: number;
  answers: Map<string, boolean>; // questionId → correct/wrong
}

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate quiz questions from vocabulary words.
 * Needs at least 4 words with english to generate distractors.
 */
export function generateQuiz(
  words: VocabularyItem[],
  count: number = 10,
): QuizQuestion[] {
  // Filter to words with translations
  const studyable = words.filter((w) => w.english?.trim());
  if (studyable.length < 4) return [];

  // Pick random words for the quiz
  const selected = shuffle(studyable).slice(0, count);
  const questions: QuizQuestion[] = [];

  for (const word of selected) {
    // Randomly choose question type
    const type: QuizQuestionType =
      Math.random() < 0.5 ? "korean_to_english" : "english_to_korean";

    const prompt = type === "korean_to_english" ? word.korean : word.english;
    const correctAnswer = type === "korean_to_english" ? word.english : word.korean;

    // Pick 3 random distractors from other words
    const distractors = shuffle(
      studyable
        .filter((w) => w.id !== word.id)
        .map((w) =>
          type === "korean_to_english" ? w.english : w.korean,
        ),
    ).slice(0, 3);

    // Combine and shuffle options
    const options = shuffle([correctAnswer, ...distractors]);

    questions.push({
      id: `q-${word.id}-${type}`,
      type,
      prompt,
      correctAnswer,
      options,
      wordId: word.id,
    });
  }

  return questions;
}

/**
 * Minimum vocabulary count needed for quizzes.
 */
export const MIN_QUIZ_WORDS = 4;
