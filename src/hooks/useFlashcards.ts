"use client";

import { useCallback, useMemo, useState } from "react";
import type { VocabularyItem } from "@/types";

export type FlashcardGrade = "again" | "good" | "easy";

export interface FlashcardSummary {
  again: number;
  good: number;
  easy: number;
  total: number;
}

/** Fisher-Yates shuffle — returns a new shuffled array. */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function useFlashcards(words: VocabularyItem[]) {
  const [deck, setDeck] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grades, setGrades] = useState<Map<string, FlashcardGrade>>(new Map());
  const [isComplete, setIsComplete] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Count studyable words (must have non-empty english)
  const studyableCount = useMemo(
    () => words.filter((w) => w.english.trim() !== "").length,
    [words]
  );

  const startSession = useCallback(() => {
    const studyable = words.filter((w) => w.english.trim() !== "");
    if (studyable.length < 2) return;
    setDeck(shuffle(studyable));
    setCurrentIndex(0);
    setFlipped(false);
    setGrades(new Map());
    setIsComplete(false);
    setIsActive(true);
  }, [words]);

  const endSession = useCallback(() => {
    setDeck([]);
    setCurrentIndex(0);
    setFlipped(false);
    setGrades(new Map());
    setIsComplete(false);
    setIsActive(false);
  }, []);

  const currentCard = isActive && deck.length > 0 ? deck[currentIndex] ?? null : null;
  const totalCards = deck.length;

  const flip = useCallback(() => {
    if (!isActive || isComplete) return;
    setFlipped((f) => !f);
  }, [isActive, isComplete]);

  const next = useCallback(() => {
    if (!isActive || isComplete) return;
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    }
  }, [isActive, isComplete, currentIndex, deck.length]);

  const prev = useCallback(() => {
    if (!isActive || isComplete) return;
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setFlipped(false);
    }
  }, [isActive, isComplete, currentIndex]);

  const grade = useCallback(
    (g: FlashcardGrade) => {
      if (!isActive || isComplete || !currentCard) return;
      setGrades((prev) => {
        const next = new Map(prev);
        next.set(currentCard.id, g);
        return next;
      });

      // Auto-advance or complete
      if (currentIndex < deck.length - 1) {
        setCurrentIndex((i) => i + 1);
        setFlipped(false);
      } else {
        setIsComplete(true);
        setFlipped(false);
      }
    },
    [isActive, isComplete, currentCard, currentIndex, deck.length]
  );

  const summary: FlashcardSummary = useMemo(() => {
    let again = 0;
    let good = 0;
    let easy = 0;
    for (const g of grades.values()) {
      if (g === "again") again++;
      else if (g === "good") good++;
      else if (g === "easy") easy++;
    }
    return { again, good, easy, total: deck.length };
  }, [grades, deck.length]);

  return {
    // Session control
    startSession,
    endSession,
    isActive,

    // Card interaction
    currentCard,
    currentIndex,
    totalCards,
    flipped,
    flip,

    // Navigation
    next,
    prev,

    // Grading
    grade,

    // Summary
    isComplete,
    summary,

    // Studyable count
    studyableCount,
  };
}
