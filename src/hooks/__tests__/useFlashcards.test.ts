import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFlashcards } from "../useFlashcards";
import type { VocabularyItem } from "@/types";

function makeWord(overrides: Partial<VocabularyItem> = {}): VocabularyItem {
  return {
    id: `id-${Math.random()}`,
    korean: "문",
    romanization: "mun",
    english: "door",
    savedAt: new Date().toISOString(),
    ...overrides,
  };
}

const sampleWords: VocabularyItem[] = [
  makeWord({ id: "1", korean: "문", romanization: "mun", english: "door" }),
  makeWord({ id: "2", korean: "방", romanization: "bang", english: "room" }),
  makeWord({ id: "3", korean: "복도", romanization: "bokdo", english: "hallway" }),
  makeWord({ id: "4", korean: "벽", romanization: "byeok", english: "wall" }),
];

describe("useFlashcards", () => {
  it("returns studyableCount based on words with non-empty english", () => {
    const words = [
      ...sampleWords,
      makeWord({ id: "5", korean: "옥상", romanization: "oksang", english: "" }),
    ];
    const { result } = renderHook(() => useFlashcards(words));
    expect(result.current.studyableCount).toBe(4);
  });

  it("returns 0 studyableCount for empty word list", () => {
    const { result } = renderHook(() => useFlashcards([]));
    expect(result.current.studyableCount).toBe(0);
  });

  it("returns 0 studyableCount when all words have empty english", () => {
    const words = [
      makeWord({ id: "1", english: "" }),
      makeWord({ id: "2", english: "" }),
    ];
    const { result } = renderHook(() => useFlashcards(words));
    expect(result.current.studyableCount).toBe(0);
  });

  it("isActive is false initially", () => {
    const { result } = renderHook(() => useFlashcards(sampleWords));
    expect(result.current.isActive).toBe(false);
  });

  it("currentCard is null when session is inactive", () => {
    const { result } = renderHook(() => useFlashcards(sampleWords));
    expect(result.current.currentCard).toBeNull();
  });

  it("startSession activates the session", () => {
    const { result } = renderHook(() => useFlashcards(sampleWords));
    act(() => result.current.startSession());
    expect(result.current.isActive).toBe(true);
    expect(result.current.currentCard).not.toBeNull();
    expect(result.current.totalCards).toBe(4);
    expect(result.current.currentIndex).toBe(0);
  });

  it("startSession does nothing if fewer than 2 studyable words", () => {
    const words = [makeWord({ id: "1" })];
    const { result } = renderHook(() => useFlashcards(words));
    act(() => result.current.startSession());
    expect(result.current.isActive).toBe(false);
  });

  it("startSession filters out words with empty english", () => {
    const words = [
      ...sampleWords,
      makeWord({ id: "5", korean: "옥상", english: "" }),
    ];
    const { result } = renderHook(() => useFlashcards(words));
    act(() => result.current.startSession());
    expect(result.current.totalCards).toBe(4);
  });

  it("startSession shuffles the deck", () => {
    // Run multiple times — at least one should differ from input order
    const orderedIds = sampleWords.map((w) => w.id);
    let sawDifferent = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      const { result } = renderHook(() => useFlashcards(sampleWords));
      act(() => result.current.startSession());
      const deckIds: string[] = [];
      for (let i = 0; i < result.current.totalCards; i++) {
        if (i > 0) act(() => result.current.next());
        deckIds.push(result.current.currentCard!.id);
      }
      if (JSON.stringify(deckIds) !== JSON.stringify(orderedIds)) {
        sawDifferent = true;
        break;
      }
    }
    expect(sawDifferent).toBe(true);
  });

  it("flip toggles flipped state", () => {
    const { result } = renderHook(() => useFlashcards(sampleWords));
    act(() => result.current.startSession());
    expect(result.current.flipped).toBe(false);
    act(() => result.current.flip());
    expect(result.current.flipped).toBe(true);
    act(() => result.current.flip());
    expect(result.current.flipped).toBe(false);
  });

  it("next advances to the next card and unflips", () => {
    const { result } = renderHook(() => useFlashcards(sampleWords));
    act(() => result.current.startSession());
    const firstCard = result.current.currentCard;
    act(() => result.current.flip());
    expect(result.current.flipped).toBe(true);
    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.flipped).toBe(false);
    expect(result.current.currentCard).not.toBe(firstCard);
  });

  it("next does nothing on last card", () => {
    const words = [
      makeWord({ id: "1" }),
      makeWord({ id: "2", korean: "방", english: "room" }),
    ];
    const { result } = renderHook(() => useFlashcards(words));
    act(() => result.current.startSession());
    act(() => result.current.next()); // go to index 1 (last)
    act(() => result.current.next()); // should stay at 1
    expect(result.current.currentIndex).toBe(1);
  });

  it("prev goes back and unflips", () => {
    const { result } = renderHook(() => useFlashcards(sampleWords));
    act(() => result.current.startSession());
    act(() => result.current.next());
    act(() => result.current.flip());
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.flipped).toBe(true);
    act(() => result.current.prev());
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.flipped).toBe(false);
  });

  it("prev does nothing on first card", () => {
    const { result } = renderHook(() => useFlashcards(sampleWords));
    act(() => result.current.startSession());
    act(() => result.current.prev());
    expect(result.current.currentIndex).toBe(0);
  });

  it("grade records and auto-advances", () => {
    const { result } = renderHook(() => useFlashcards(sampleWords));
    act(() => result.current.startSession());
    act(() => result.current.grade("good"));
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.flipped).toBe(false);
  });

  it("grade on last card sets isComplete", () => {
    const words = [
      makeWord({ id: "1" }),
      makeWord({ id: "2", korean: "방", english: "room" }),
    ];
    const { result } = renderHook(() => useFlashcards(words));
    act(() => result.current.startSession());
    act(() => result.current.grade("easy")); // card 1 → advance to card 2
    act(() => result.current.grade("again")); // card 2 → complete
    expect(result.current.isComplete).toBe(true);
  });

  it("summary computes correct counts by grade type", () => {
    const { result } = renderHook(() => useFlashcards(sampleWords));
    act(() => result.current.startSession());
    act(() => result.current.grade("again"));
    act(() => result.current.grade("good"));
    act(() => result.current.grade("good"));
    act(() => result.current.grade("easy"));
    expect(result.current.summary).toEqual({
      again: 1,
      good: 2,
      easy: 1,
      total: 4,
    });
  });

  it("endSession resets all state", () => {
    const { result } = renderHook(() => useFlashcards(sampleWords));
    act(() => result.current.startSession());
    act(() => result.current.grade("good"));
    act(() => result.current.endSession());
    expect(result.current.isActive).toBe(false);
    expect(result.current.currentCard).toBeNull();
    expect(result.current.totalCards).toBe(0);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.flipped).toBe(false);
    expect(result.current.isComplete).toBe(false);
  });

  it("flip does nothing when session is inactive", () => {
    const { result } = renderHook(() => useFlashcards(sampleWords));
    act(() => result.current.flip());
    expect(result.current.flipped).toBe(false);
  });

  it("grade does nothing when session is complete", () => {
    const words = [
      makeWord({ id: "1" }),
      makeWord({ id: "2", korean: "방", english: "room" }),
    ];
    const { result } = renderHook(() => useFlashcards(words));
    act(() => result.current.startSession());
    act(() => result.current.grade("good"));
    act(() => result.current.grade("good")); // completes
    expect(result.current.isComplete).toBe(true);
    const indexBefore = result.current.currentIndex;
    act(() => result.current.grade("easy")); // should do nothing
    expect(result.current.currentIndex).toBe(indexBefore);
  });
});
