import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WritingMode from "../WritingMode";
import type { VocabularyItem } from "@/types";

// Mock SoundContext
vi.mock("@/contexts/SoundContext", () => ({
  useSound: () => ({
    playFlashcardGrade: vi.fn(),
    playSessionComplete: vi.fn(),
  }),
}));

function makeWord(id: string, korean: string, english: string, romanization = ""): VocabularyItem {
  return {
    id,
    korean,
    english,
    romanization,
    savedAt: new Date().toISOString(),
    srs: { interval: 1, ease: 2.5, nextReview: new Date().toISOString(), repetitions: 0 },
  };
}

const fiveWords = [
  makeWord("w1", "안녕하세요", "Hello", "annyeonghaseyo"),
  makeWord("w2", "감사합니다", "Thank you", "gamsahamnida"),
  makeWord("w3", "네", "Yes", "ne"),
  makeWord("w4", "아니요", "No", "aniyo"),
  makeWord("w5", "물", "Water", "mul"),
];

const defaultProps = {
  words: fiveWords,
  onClose: vi.fn(),
  onSessionComplete: vi.fn(),
  onWordGraded: vi.fn(),
};

describe("WritingMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("minimum words requirement", () => {
    it("shows not-enough-words message with < 4 words", () => {
      const twoWords = fiveWords.slice(0, 2);
      render(<WritingMode {...defaultProps} words={twoWords} />);
      expect(screen.getByText("Not enough words to practice writing.")).toBeTruthy();
      expect(screen.getByText(/Save at least 4/)).toBeTruthy();
    });

    it("shows not-enough-words message with 3 words", () => {
      const threeWords = fiveWords.slice(0, 3);
      render(<WritingMode {...defaultProps} words={threeWords} />);
      expect(screen.getByText("Not enough words to practice writing.")).toBeTruthy();
    });

    it("renders the writing UI with exactly 4 words", () => {
      const fourWords = fiveWords.slice(0, 4);
      render(<WritingMode {...defaultProps} words={fourWords} />);
      expect(screen.getByText("Write in Korean")).toBeTruthy();
      expect(screen.getByPlaceholderText("Type Korean here...")).toBeTruthy();
    });

    it("renders the writing UI with 5+ words", () => {
      render(<WritingMode {...defaultProps} />);
      expect(screen.getByText("Write in Korean")).toBeTruthy();
    });

    it("filters out words without english translation", () => {
      const wordsWithMissing = [
        ...fiveWords.slice(0, 3),
        makeWord("w6", "학교", "", "hakgyo"), // no english
        makeWord("w7", "선생님", "Teacher", "seonsaengnim"),
      ];
      // Only 4 valid words (w1-w3 + w7), should still render
      render(<WritingMode {...defaultProps} words={wordsWithMissing} />);
      expect(screen.getByText("Write in Korean")).toBeTruthy();
    });
  });

  describe("main writing UI", () => {
    it("shows english prompt", () => {
      render(<WritingMode {...defaultProps} />);
      // One of the 5 words will be shown (randomized)
      const prompts = ["Hello", "Thank you", "Yes", "No", "Water"];
      const foundPrompt = prompts.some(p => screen.queryByText(p));
      expect(foundPrompt).toBe(true);
    });

    it("shows progress counter", () => {
      render(<WritingMode {...defaultProps} />);
      expect(screen.getByText("1/5")).toBeTruthy();
    });

    it("shows Skip and Check buttons", () => {
      render(<WritingMode {...defaultProps} />);
      expect(screen.getByText("Skip (Tab)")).toBeTruthy();
      expect(screen.getByText("Check (Enter)")).toBeTruthy();
    });

    it("disables Check when input is empty", () => {
      render(<WritingMode {...defaultProps} />);
      const checkBtn = screen.getByText("Check (Enter)").closest("button");
      expect(checkBtn?.disabled).toBe(true);
    });

    it("enables Check when input has text", () => {
      render(<WritingMode {...defaultProps} />);
      const input = screen.getByPlaceholderText("Type Korean here...");
      fireEvent.change(input, { target: { value: "테스트" } });
      const checkBtn = screen.getByText("Check (Enter)").closest("button");
      expect(checkBtn?.disabled).toBe(false);
    });

    it("shows progress bar", () => {
      render(<WritingMode {...defaultProps} />);
      expect(screen.getByRole("progressbar")).toBeTruthy();
    });
  });

  describe("answer checking", () => {
    it("shows Correct! for exact answer", () => {
      render(<WritingMode {...defaultProps} />);
      // Get the prompt text to know which word to type
      const input = screen.getByPlaceholderText("Type Korean here...");
      // Find which word is displayed
      const word = fiveWords.find(w => screen.queryByText(w.english));
      if (word) {
        fireEvent.change(input, { target: { value: word.korean } });
        fireEvent.click(screen.getByText("Check (Enter)"));
        expect(screen.getByText("Correct!")).toBeTruthy();
      }
    });

    it("shows Incorrect for wrong answer", () => {
      render(<WritingMode {...defaultProps} />);
      const input = screen.getByPlaceholderText("Type Korean here...");
      fireEvent.change(input, { target: { value: "완전히다른답" } });
      fireEvent.click(screen.getByText("Check (Enter)"));
      expect(screen.getByText("Incorrect")).toBeTruthy();
    });

    it("shows correct answer after wrong submission", () => {
      render(<WritingMode {...defaultProps} />);
      const input = screen.getByPlaceholderText("Type Korean here...");
      const word = fiveWords.find(w => screen.queryByText(w.english));
      fireEvent.change(input, { target: { value: "완전히다른답" } });
      fireEvent.click(screen.getByText("Check (Enter)"));
      if (word) {
        expect(screen.getByText(word.korean)).toBeTruthy();
      }
    });

    it("shows Next button after checking", () => {
      render(<WritingMode {...defaultProps} />);
      const input = screen.getByPlaceholderText("Type Korean here...");
      fireEvent.change(input, { target: { value: "테스트" } });
      fireEvent.click(screen.getByText("Check (Enter)"));
      expect(screen.getByText(/Next|See Results/)).toBeTruthy();
    });

    it("disables input after checking", () => {
      render(<WritingMode {...defaultProps} />);
      const input = screen.getByPlaceholderText("Type Korean here...") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "테스트" } });
      fireEvent.click(screen.getByText("Check (Enter)"));
      expect(input.disabled).toBe(true);
    });

    it("calls onWordGraded with 'easy' for exact match", () => {
      const onWordGraded = vi.fn();
      render(<WritingMode {...defaultProps} onWordGraded={onWordGraded} />);
      const input = screen.getByPlaceholderText("Type Korean here...");
      const word = fiveWords.find(w => screen.queryByText(w.english));
      if (word) {
        fireEvent.change(input, { target: { value: word.korean } });
        fireEvent.click(screen.getByText("Check (Enter)"));
        expect(onWordGraded).toHaveBeenCalledWith(word.id, "easy");
      }
    });

    it("calls onWordGraded with 'again' for wrong answer", () => {
      const onWordGraded = vi.fn();
      render(<WritingMode {...defaultProps} onWordGraded={onWordGraded} />);
      const input = screen.getByPlaceholderText("Type Korean here...");
      fireEvent.change(input, { target: { value: "완전히다른답" } });
      fireEvent.click(screen.getByText("Check (Enter)"));
      expect(onWordGraded).toHaveBeenCalledWith(expect.any(String), "again");
    });
  });

  describe("skip", () => {
    it("skips to the next word", () => {
      render(<WritingMode {...defaultProps} />);
      fireEvent.click(screen.getByText("Skip (Tab)"));
      expect(screen.getByText("2/5")).toBeTruthy();
    });

    it("does not call onWordGraded when skipping", () => {
      const onWordGraded = vi.fn();
      render(<WritingMode {...defaultProps} onWordGraded={onWordGraded} />);
      fireEvent.click(screen.getByText("Skip (Tab)"));
      expect(onWordGraded).not.toHaveBeenCalled();
    });
  });

  describe("completion", () => {
    it("shows completion screen after all words", () => {
      render(<WritingMode {...defaultProps} />);
      // Skip through all 5 words
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText("Skip (Tab)"));
      }
      // Should show completion — all skipped so 0/0 attempted, 5 skipped
      expect(screen.getByText("Done")).toBeTruthy();
      expect(screen.getByText("0%")).toBeTruthy();
      expect(screen.getByText(/0\/0 correct/)).toBeTruthy();
      expect(screen.getByText(/5 skipped/)).toBeTruthy();
    });

    it("shows Moon-jo feedback on completion", () => {
      render(<WritingMode {...defaultProps} />);
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText("Skip (Tab)"));
      }
      // 0% score should show "다시 쓰세요" feedback
      expect(screen.getByText(/다시 쓰세요/)).toBeTruthy();
    });

    it("calls onSessionComplete with correct counts (skipped excluded)", () => {
      const onSessionComplete = vi.fn();
      render(<WritingMode {...defaultProps} onSessionComplete={onSessionComplete} />);
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText("Skip (Tab)"));
      }
      expect(onSessionComplete).toHaveBeenCalledWith({
        again: 0,
        good: 0,
        easy: 0,
        total: 0,
      });
    });

    it("shows Done button that calls onClose", () => {
      const onClose = vi.fn();
      render(<WritingMode {...defaultProps} onClose={onClose} />);
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText("Skip (Tab)"));
      }
      fireEvent.click(screen.getByText("Done"));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("shows per-word results in completion", () => {
      render(<WritingMode {...defaultProps} />);
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText("Skip (Tab)"));
      }
      // All should be marked skipped
      const skippedMarks = screen.getAllByText("⊘ Skipped");
      expect(skippedMarks.length).toBe(5);
    });
  });

  describe("close button", () => {
    it("calls onClose when X is clicked", () => {
      const onClose = vi.fn();
      render(<WritingMode {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByLabelText("Close writing practice"));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
