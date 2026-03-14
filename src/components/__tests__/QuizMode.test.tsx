import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuizMode from "../QuizMode";
import { MIN_QUIZ_WORDS } from "@/lib/quiz-generator";
import type { VocabularyItem } from "@/types";

vi.mock("@/contexts/SoundContext", () => ({
  useSound: () => ({
    playWordSaved: vi.fn(),
    playFlashcardGrade: vi.fn(),
    playSessionComplete: vi.fn(),
    muted: false,
    toggleMute: vi.fn(),
    volume: 80,
    setVolume: vi.fn(),
  }),
}));

// ─── helpers ───────────────────────────────────────────────────────

function makeWord(
  id: string,
  korean: string,
  english: string,
): VocabularyItem {
  return {
    id,
    korean,
    romanization: "rom",
    english,
    savedAt: new Date().toISOString(),
  };
}

const SAMPLE_WORDS: VocabularyItem[] = [
  makeWord("w1", "안녕하세요", "hello"),
  makeWord("w2", "감사합니다", "thank you"),
  makeWord("w3", "사랑", "love"),
  makeWord("w4", "학교", "school"),
  makeWord("w5", "물", "water"),
  makeWord("w6", "밥", "rice"),
];

const FEW_WORDS: VocabularyItem[] = SAMPLE_WORDS.slice(0, 2);

const NO_ENGLISH_WORDS: VocabularyItem[] = [
  makeWord("a", "가", ""),
  makeWord("b", "나", ""),
  makeWord("c", "다", ""),
  makeWord("d", "라", ""),
];

// ─── not enough words ──────────────────────────────────────────────

describe("QuizMode — insufficient words", () => {
  it("shows 'not enough words' message when fewer than MIN_QUIZ_WORDS", () => {
    render(<QuizMode words={FEW_WORDS} onClose={vi.fn()} />);
    expect(screen.getByText(/Not enough words/)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`at least ${MIN_QUIZ_WORDS}`)),
    ).toBeInTheDocument();
  });

  it("shows 'not enough words' when words have no english translations", () => {
    render(<QuizMode words={NO_ENGLISH_WORDS} onClose={vi.fn()} />);
    expect(screen.getByText(/Not enough words/)).toBeInTheDocument();
  });

  it("shows back button when not enough words", () => {
    render(<QuizMode words={FEW_WORDS} onClose={vi.fn()} />);
    expect(
      screen.getByLabelText("Back to vocabulary"),
    ).toBeInTheDocument();
  });

  it("calls onClose when back button clicked", async () => {
    const onClose = vi.fn();
    render(<QuizMode words={FEW_WORDS} onClose={onClose} />);
    await userEvent.click(screen.getByLabelText("Back to vocabulary"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── quiz question rendering ───────────────────────────────────────

describe("QuizMode — question screen", () => {
  it("renders a question with 4 options", () => {
    render(<QuizMode words={SAMPLE_WORDS} onClose={vi.fn()} />);
    // Should show question counter "1 / N"
    expect(screen.getByText(/1 \//)).toBeInTheDocument();
    // Should have 4 option buttons (plus exit/close button)
    const options = screen.getAllByRole("button").filter((b) =>
      b.getAttribute("aria-label")?.startsWith("Option"),
    );
    expect(options).toHaveLength(4);
  });

  it("shows question type badge (Korean → English or English → Korean)", () => {
    render(<QuizMode words={SAMPLE_WORDS} onClose={vi.fn()} />);
    const badge = screen.getByText(/→/);
    expect(badge).toBeInTheDocument();
    expect(
      badge.textContent === "Korean → English" ||
        badge.textContent === "English → Korean",
    ).toBe(true);
  });

  it("shows progress bar", () => {
    render(<QuizMode words={SAMPLE_WORDS} onClose={vi.fn()} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows keyboard hint when not yet answered", () => {
    render(<QuizMode words={SAMPLE_WORDS} onClose={vi.fn()} />);
    expect(screen.getByText(/press 1-4 to select/)).toBeInTheDocument();
  });

  it("exit button calls onClose", async () => {
    const onClose = vi.fn();
    render(<QuizMode words={SAMPLE_WORDS} onClose={onClose} />);
    await userEvent.click(screen.getByLabelText("Exit quiz"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── answering questions ───────────────────────────────────────────

describe("QuizMode — answering", () => {
  it("selecting an option shows Next button", async () => {
    render(<QuizMode words={SAMPLE_WORDS} onClose={vi.fn()} />);
    const options = screen.getAllByRole("button").filter((b) =>
      b.getAttribute("aria-label")?.startsWith("Option"),
    );
    await userEvent.click(options[0]);
    expect(
      screen.getByText(/Next|See Results/),
    ).toBeInTheDocument();
  });

  it("disables options after answering", async () => {
    render(<QuizMode words={SAMPLE_WORDS} onClose={vi.fn()} />);
    const options = screen.getAllByRole("button").filter((b) =>
      b.getAttribute("aria-label")?.startsWith("Option"),
    );
    await userEvent.click(options[0]);
    // All option buttons should be disabled
    for (const opt of options) {
      expect(opt).toBeDisabled();
    }
  });

  it("selecting an option disables further selection", async () => {
    render(
      <QuizMode
        words={SAMPLE_WORDS}
        onClose={vi.fn()}
      />,
    );
    const options = screen.getAllByRole("button").filter((b) =>
      b.getAttribute("aria-label")?.startsWith("Option"),
    );
    await userEvent.click(options[0]);
    // All options should be disabled after answering
    for (const opt of options) {
      expect(opt).toBeDisabled();
    }
  });

  it("hides keyboard hint after answering", async () => {
    render(<QuizMode words={SAMPLE_WORDS} onClose={vi.fn()} />);
    const options = screen.getAllByRole("button").filter((b) =>
      b.getAttribute("aria-label")?.startsWith("Option"),
    );
    await userEvent.click(options[0]);
    expect(screen.queryByText(/press 1-4 to select/)).not.toBeInTheDocument();
  });
});

// ─── quiz completion ───────────────────────────────────────────────

describe("QuizMode — completion", () => {
  it("shows summary screen with score after answering all questions", async () => {
    render(<QuizMode words={SAMPLE_WORDS} onClose={vi.fn()} />);

    // Answer all questions (default 10, but capped to word count)
    for (let i = 0; i < SAMPLE_WORDS.length; i++) {
      const options = screen.getAllByRole("button").filter((b) =>
        b.getAttribute("aria-label")?.startsWith("Option"),
      );
      if (options.length === 0) break;
      await userEvent.click(options[0]);

      const nextBtn = screen.queryByText(/Next/) || screen.queryByText(/See Results/);
      if (nextBtn) {
        await userEvent.click(nextBtn);
      }
    }

    // Should show completion screen
    expect(screen.getByText("Quiz Complete")).toBeInTheDocument();
    expect(screen.getByText("Correct")).toBeInTheDocument();
    expect(screen.getByText("Wrong")).toBeInTheDocument();
  });

  it("calls onQuizComplete with result when quiz finishes", async () => {
    const onQuizComplete = vi.fn();
    render(
      <QuizMode
        words={SAMPLE_WORDS}
        onClose={vi.fn()}
        onQuizComplete={onQuizComplete}
      />,
    );

    for (let i = 0; i < SAMPLE_WORDS.length; i++) {
      const options = screen.getAllByRole("button").filter((b) =>
        b.getAttribute("aria-label")?.startsWith("Option"),
      );
      if (options.length === 0) break;
      await userEvent.click(options[0]);
      const nextBtn =
        screen.queryByText(/Next/) || screen.queryByText(/See Results/);
      if (nextBtn) await userEvent.click(nextBtn);
    }

    expect(onQuizComplete).toHaveBeenCalledTimes(1);
    const result = onQuizComplete.mock.calls[0][0];
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("correct");
    expect(result).toHaveProperty("wrong");
    expect(result.total).toBe(result.correct + result.wrong);
  });

  it("shows Moon-jo feedback on completion", async () => {
    render(<QuizMode words={SAMPLE_WORDS} onClose={vi.fn()} />);

    for (let i = 0; i < SAMPLE_WORDS.length; i++) {
      const options = screen.getAllByRole("button").filter((b) =>
        b.getAttribute("aria-label")?.startsWith("Option"),
      );
      if (options.length === 0) break;
      await userEvent.click(options[0]);
      const nextBtn =
        screen.queryByText(/Next/) || screen.queryByText(/See Results/);
      if (nextBtn) await userEvent.click(nextBtn);
    }

    // One of the four possible Korean feedback messages should be present
    const feedbackFound =
      screen.queryByText(/완벽해요/) ||
      screen.queryByText(/잘했어요/) ||
      screen.queryByText(/아직 멀었어요/) ||
      screen.queryByText(/실망이에요/);
    expect(feedbackFound).toBeTruthy();
  });

  it("shows Try Again and Done buttons on completion", async () => {
    render(<QuizMode words={SAMPLE_WORDS} onClose={vi.fn()} />);

    for (let i = 0; i < SAMPLE_WORDS.length; i++) {
      const options = screen.getAllByRole("button").filter((b) =>
        b.getAttribute("aria-label")?.startsWith("Option"),
      );
      if (options.length === 0) break;
      await userEvent.click(options[0]);
      const nextBtn =
        screen.queryByText(/Next/) || screen.queryByText(/See Results/);
      if (nextBtn) await userEvent.click(nextBtn);
    }

    expect(screen.getByLabelText("Take quiz again")).toBeInTheDocument();
    expect(screen.getByLabelText("Done with quiz")).toBeInTheDocument();
  });

  it("Done button calls onClose", async () => {
    const onClose = vi.fn();
    render(<QuizMode words={SAMPLE_WORDS} onClose={onClose} />);

    for (let i = 0; i < SAMPLE_WORDS.length; i++) {
      const options = screen.getAllByRole("button").filter((b) =>
        b.getAttribute("aria-label")?.startsWith("Option"),
      );
      if (options.length === 0) break;
      await userEvent.click(options[0]);
      const nextBtn =
        screen.queryByText(/Next/) || screen.queryByText(/See Results/);
      if (nextBtn) await userEvent.click(nextBtn);
    }

    await userEvent.click(screen.getByLabelText("Done with quiz"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
