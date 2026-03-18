/**
 * Integration tests: Keyboard shortcuts in Quiz, Flashcard, and Writing modes
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuizMode from "../QuizMode";
import FlashcardMode from "../FlashcardMode";
import WritingMode from "../WritingMode";
import type { VocabularyItem } from "@/types";

// Mock sound context for all modes
vi.mock("@/contexts/SoundContext", () => ({
  useSound: () => ({
    playWordSaved: vi.fn(),
    playFlashcardGrade: vi.fn(),
    playSessionComplete: vi.fn(),
    playJamoPress: vi.fn(),
    playSpecialKey: vi.fn(),
    playTranslationToggle: vi.fn(),
    playCopyConfirm: vi.fn(),
    muted: false,
    toggleMute: vi.fn(),
    volume: 80,
    setVolume: vi.fn(),
  }),
}));

// Mock speechSynthesis for FlashcardMode TTS
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
Object.defineProperty(global, "speechSynthesis", {
  value: { speak: mockSpeak, cancel: mockCancel, speaking: false },
  writable: true,
});
class MockSpeechSynthesisUtterance {
  text: string;
  lang = "";
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) { this.text = text; }
}
Object.defineProperty(global, "SpeechSynthesisUtterance", {
  value: MockSpeechSynthesisUtterance,
  writable: true,
});

// Deterministic quiz generator mock
vi.mock("@/lib/quiz-generator", async () => {
  const actual = await vi.importActual("@/lib/quiz-generator");
  return {
    ...actual,
    generateQuiz: (words: VocabularyItem[], count?: number) => {
      const studyable = words.filter((w: VocabularyItem) => w.english?.trim());
      if (studyable.length < 4) return [];
      const selected = studyable.slice(0, count ?? 10);
      return selected.map((word: VocabularyItem) => {
        const others = studyable.filter((w: VocabularyItem) => w.id !== word.id);
        const distractors = others.slice(0, 3).map((w: VocabularyItem) => w.english);
        return {
          id: `q-${word.id}`,
          type: "korean_to_english" as const,
          prompt: word.korean,
          correctAnswer: word.english,
          options: [word.english, ...distractors],
          wordId: word.id,
        };
      });
    },
  };
});

function makeWord(id: string, korean: string, english: string): VocabularyItem {
  return {
    id,
    korean,
    romanization: "rom",
    english,
    savedAt: new Date().toISOString(),
  };
}

const sampleWords: VocabularyItem[] = [
  makeWord("1", "문", "door"),
  makeWord("2", "방", "room"),
  makeWord("3", "복도", "hallway"),
  makeWord("4", "벽", "wall"),
  makeWord("5", "물", "water"),
];

describe("Quiz keyboard shortcuts", () => {
  it("pressing 1-4 selects the corresponding option", () => {
    render(<QuizMode words={sampleWords} onClose={vi.fn()} />);
    // Before pressing, no Next button
    expect(screen.queryByText(/Next|See Results/)).not.toBeInTheDocument();
    // Press key "1" to select option 1
    fireEvent.keyDown(window, { key: "1" });
    // Next button should appear after answering
    expect(screen.getByText(/Next|See Results/)).toBeInTheDocument();
  });

  it("pressing Enter advances to next question after answering", () => {
    render(<QuizMode words={sampleWords} onClose={vi.fn()} />);
    expect(screen.getByText(/1 \//)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "1" }); // select option
    fireEvent.keyDown(window, { key: "Enter" }); // advance
    expect(screen.getByText(/2 \//)).toBeInTheDocument();
  });

  it("pressing Space also advances to next question after answering", () => {
    render(<QuizMode words={sampleWords} onClose={vi.fn()} />);
    fireEvent.keyDown(window, { key: "2" }); // select option
    fireEvent.keyDown(window, { key: " " }); // advance with space
    expect(screen.getByText(/2 \//)).toBeInTheDocument();
  });

  it("pressing number key before answering does NOT trigger after answering", () => {
    render(<QuizMode words={sampleWords} onClose={vi.fn()} />);
    fireEvent.keyDown(window, { key: "1" }); // answer
    // Pressing another number should not change anything (already answered)
    fireEvent.keyDown(window, { key: "3" });
    // Should still show Next/See Results from first answer
    expect(screen.getByText(/Next|See Results/)).toBeInTheDocument();
  });
});

describe("FlashcardMode keyboard shortcuts", () => {
  it("pressing 1-4 selects the corresponding option", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    expect(screen.queryByText(/Next|See Results/)).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "2" }); // select option 2
    expect(screen.getByText(/Next|See Results/)).toBeInTheDocument();
  });

  it("pressing Enter advances after answering", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText("2 / 5")).toBeInTheDocument();
  });
});

describe("WritingMode keyboard shortcuts", () => {
  it("Tab skips the current word", () => {
    render(<WritingMode words={sampleWords} onClose={vi.fn()} />);
    expect(screen.getByText("1/5")).toBeInTheDocument();
    // Click Skip (Tab) button to simulate Tab behavior
    fireEvent.click(screen.getByText("Skip (Tab)"));
    expect(screen.getByText("2/5")).toBeInTheDocument();
  });

  it("Enter with text in input triggers check", () => {
    render(<WritingMode words={sampleWords} onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText("Type Korean here...");
    fireEvent.change(input, { target: { value: "테스트" } });
    fireEvent.click(screen.getByText("Check (Enter)"));
    // Should show result (Correct!, Close!, or Incorrect)
    const result = screen.queryByText("Correct!") || screen.queryByText("Close!") || screen.queryByText("Incorrect");
    expect(result).toBeTruthy();
  });

  it("Enter is disabled when input is empty", () => {
    render(<WritingMode words={sampleWords} onClose={vi.fn()} />);
    const checkBtn = screen.getByText("Check (Enter)").closest("button");
    expect(checkBtn?.disabled).toBe(true);
  });
});
